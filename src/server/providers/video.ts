import "server-only";
import { ChimeSDKMeetingsClient, CreateAttendeeCommand, CreateMeetingCommand, GetMeetingCommand, type Attendee, type Meeting } from "@aws-sdk/client-chime-sdk-meetings";
import { env } from "../env";
import { hmac, randomToken } from "../crypto";

/**
 * Telehealth video (OWN-15, SEC-08). The owner chose Amazon Chime SDK (Q42), which falls under the AWS BAA.
 *
 *  - `stub` (default for development and test) issues opaque room references and no call; the visit page shows a
 *    "video is not configured" message.
 *  - `chime` creates meetings and attendees with the Chime SDK Meetings API. Credentials come from the normal AWS
 *    credential chain (task role), never from code.
 *
 * Privacy: nothing sent to the video service identifies a person or a case. The meeting's ExternalMeetingId, the
 * ClientRequestToken and each attendee's ExternalUserId are keyed hashes (HMAC_SECRET) of the appointment id and role.
 * No recording, transcription, media capture pipeline or meeting event notifications are ever started.
 */
export type VideoRole = "patient" | "clinician";

/** What the browser needs to join one participant: the Chime meeting and attendee objects. Never logged. */
export interface VideoSession {
  provider: "chime";
  meeting: Meeting;
  attendee: Attendee;
}

export interface VideoJoinResult {
  /** Room reference to keep on the appointment (it changes when an expired meeting is recreated). */
  roomRef: string | null;
  /** Join credentials for this participant, or null when no video service is configured. */
  session: VideoSession | null;
}

export interface VideoProvider {
  readonly name: "stub" | "chime";
  /** Called at booking. Returns the room reference to store, or null when the room is created at join time. */
  createRoom(appointmentId: string): Promise<{ roomRef: string | null }>;
  /** Credentials for one participant, creating (or recreating) the room when it does not exist. */
  join(input: { appointmentId: string; roomRef: string | null; role: VideoRole }): Promise<VideoJoinResult>;
}

export class StubVideo implements VideoProvider {
  readonly name = "stub" as const;
  async createRoom() {
    return { roomRef: `room_${randomToken(10)}` };
  }
  async join({ roomRef }: { roomRef: string | null }) {
    return { roomRef, session: null };
  }
}

const MEETING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isNotFound = (err: unknown) => {
  const name = (err as { name?: string } | null)?.name;
  return name === "NotFoundException" || name === "GoneException";
};

/** Opaque identifiers derived from the appointment id. They carry no PHI and cannot be reversed without HMAC_SECRET. */
export const chimeIds = {
  externalMeetingId: (appointmentId: string) => `lb-${hmac(`video:meeting:${appointmentId}`).slice(0, 40)}`,
  /** Same token for the same (appointment, previous meeting) pair, so two people joining at once get one meeting. */
  clientRequestToken: (appointmentId: string, previousMeetingId: string | null) => hmac(`video:token:${appointmentId}:${previousMeetingId ?? "first"}`).slice(0, 64),
  externalUserId: (appointmentId: string, role: VideoRole) => `${role === "clinician" ? "c" : "p"}-${hmac(`video:attendee:${appointmentId}:${role}`).slice(0, 40)}`,
};

type Sender = Pick<ChimeSDKMeetingsClient, "send">;

export class ChimeVideo implements VideoProvider {
  readonly name = "chime" as const;
  constructor(
    private readonly client: Sender,
    private readonly mediaRegion: string,
  ) {}

  /**
   * Chime ends a meeting about five minutes after it is created if nobody joins (and when everyone has left for five
   * minutes), so creating it at booking days ahead would only produce an expired id. The meeting is created on first join.
   */
  async createRoom() {
    return { roomRef: null };
  }

  async join({ appointmentId, roomRef, role }: { appointmentId: string; roomRef: string | null; role: VideoRole }): Promise<VideoJoinResult> {
    const existing = roomRef && MEETING_ID.test(roomRef) ? await this.getMeeting(roomRef) : null;
    let meeting = existing ?? (await this.createMeeting(appointmentId, roomRef && MEETING_ID.test(roomRef) ? roomRef : null));
    let attendee: Attendee;
    try {
      attendee = await this.createAttendee(meeting.MeetingId!, appointmentId, role);
    } catch (err) {
      // The meeting ended between the lookup and the attendee call: recreate it once.
      if (!isNotFound(err)) throw err;
      meeting = await this.createMeeting(appointmentId, meeting.MeetingId!);
      attendee = await this.createAttendee(meeting.MeetingId!, appointmentId, role);
    }
    return { roomRef: meeting.MeetingId!, session: { provider: "chime", meeting: plain(meeting), attendee: plain(attendee) } };
  }

  private async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      const res = await this.client.send(new GetMeetingCommand({ MeetingId: meetingId }));
      return res.Meeting?.MeetingId ? res.Meeting : null;
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  private async createMeeting(appointmentId: string, previousMeetingId: string | null): Promise<Meeting> {
    const res = await this.client.send(
      new CreateMeetingCommand({
        ClientRequestToken: chimeIds.clientRequestToken(appointmentId, previousMeetingId),
        ExternalMeetingId: chimeIds.externalMeetingId(appointmentId),
        MediaRegion: this.mediaRegion,
        // No NotificationsConfiguration, no Tags, no transcription or media capture: nothing else leaves the app.
      }),
    );
    if (!res.Meeting?.MeetingId) throw new Error("Chime CreateMeeting returned no meeting");
    return res.Meeting;
  }

  private async createAttendee(meetingId: string, appointmentId: string, role: VideoRole): Promise<Attendee> {
    const res = await this.client.send(new CreateAttendeeCommand({ MeetingId: meetingId, ExternalUserId: chimeIds.externalUserId(appointmentId, role) }));
    if (!res.Attendee?.AttendeeId || !res.Attendee.JoinToken) throw new Error("Chime CreateAttendee returned no attendee");
    return res.Attendee;
  }
}

/** Plain JSON copy (drops SDK metadata and undefined fields) so it can cross the server action boundary. */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let instance: VideoProvider | null = null;
export function video(): VideoProvider {
  if (instance) return instance;
  if (env.VIDEO_PROVIDER === "chime") {
    if (!env.CHIME_REGION) throw new Error("Chime video selected but CHIME_REGION is not set");
    instance = new ChimeVideo(new ChimeSDKMeetingsClient({ region: env.CHIME_REGION }), env.CHIME_MEDIA_REGION ?? env.CHIME_REGION);
  } else {
    instance = new StubVideo();
  }
  return instance;
}
