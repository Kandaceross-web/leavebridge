import { describe, expect, it } from "vitest";
import { CreateAttendeeCommand, CreateMeetingCommand, GetMeetingCommand } from "@aws-sdk/client-chime-sdk-meetings";
import { ChimeVideo, StubVideo, chimeIds, video } from "@/server/providers/video";
import { buildCsp, isVisitPath } from "@/server/web/csp";
import { visitWindow } from "@/domain/scheduling/visit-window";

const APPT = "7d0c5a52-3f0e-4c4e-9f43-0d9b3f0f1a11";
const OLD = "11111111-2222-4333-8444-555555555555";

type Cmd = GetMeetingCommand | CreateMeetingCommand | CreateAttendeeCommand;

/** A fake Chime SDK Meetings client: records commands and answers from a script. */
function fakeChime(script: { getMeeting?: "active" | "gone" | "error"; attendeeGoneOnce?: boolean } = {}) {
  const sent: Cmd[] = [];
  let meetings = 0;
  let attendeeFailures = script.attendeeGoneOnce ? 1 : 0;
  const notFound = () => Object.assign(new Error("Meeting not found"), { name: "NotFoundException" });
  const client = {
    async send(cmd: Cmd) {
      sent.push(cmd);
      if (cmd instanceof GetMeetingCommand) {
        if (script.getMeeting === "gone") throw notFound();
        if (script.getMeeting === "error") throw Object.assign(new Error("denied"), { name: "ForbiddenException" });
        return { Meeting: { MeetingId: cmd.input.MeetingId, MediaRegion: "us-east-1", MediaPlacement: { SignalingUrl: "wss://signal.m1.ue1.app.chime.aws/control/x" } } };
      }
      if (cmd instanceof CreateMeetingCommand) {
        meetings += 1;
        return { Meeting: { MeetingId: `aaaaaaaa-bbbb-4ccc-8ddd-00000000000${meetings}`, MediaRegion: cmd.input.MediaRegion, ExternalMeetingId: cmd.input.ExternalMeetingId, MediaPlacement: { AudioHostUrl: "x.k.m1.ue1.app.chime.aws:3478" } } };
      }
      if (attendeeFailures > 0) {
        attendeeFailures -= 1;
        throw notFound();
      }
      return { Attendee: { AttendeeId: "att-1", ExternalUserId: cmd.input.ExternalUserId, JoinToken: "join-token" } };
    },
  };
  return { client: client as never, sent };
}

const names = (sent: Cmd[]) => sent.map((c) => c.constructor.name);

describe("Chime video provider (AWS client mocked)", () => {
  it("does not create a meeting at booking, because empty Chime meetings expire", async () => {
    const { client, sent } = fakeChime();
    expect(await new ChimeVideo(client, "us-east-1").createRoom()).toEqual({ roomRef: null });
    expect(sent).toHaveLength(0);
  });

  it("creates the meeting on first join, then an attendee for that participant only", async () => {
    const { client, sent } = fakeChime();
    const out = await new ChimeVideo(client, "us-east-2").join({ appointmentId: APPT, roomRef: null, role: "patient" });
    expect(names(sent)).toEqual(["CreateMeetingCommand", "CreateAttendeeCommand"]);
    const create = (sent[0] as CreateMeetingCommand).input;
    expect(create.MediaRegion).toBe("us-east-2");
    expect(create.ClientRequestToken).toBe(chimeIds.clientRequestToken(APPT, null));
    // Nothing else leaves the app: no notifications, tags, or other configuration.
    expect(Object.keys(create).sort()).toEqual(["ClientRequestToken", "ExternalMeetingId", "MediaRegion"]);
    const attendee = (sent[1] as CreateAttendeeCommand).input;
    expect(attendee.MeetingId).toBe(out.roomRef);
    expect(attendee.ExternalUserId).toBe(chimeIds.externalUserId(APPT, "patient"));
    expect(out.roomRef).toBe("aaaaaaaa-bbbb-4ccc-8ddd-000000000001");
    expect(out.session?.attendee.JoinToken).toBe("join-token");
    expect(out.session?.meeting.MeetingId).toBe(out.roomRef);
  });

  it("uses opaque identifiers only (no appointment id, names or case details)", () => {
    const ids = [chimeIds.externalMeetingId(APPT), chimeIds.clientRequestToken(APPT, null), chimeIds.externalUserId(APPT, "patient"), chimeIds.externalUserId(APPT, "clinician")];
    for (const id of ids) {
      expect(id).not.toContain(APPT);
      expect(id).not.toContain(APPT.slice(0, 8));
      expect(id.length).toBeGreaterThanOrEqual(2);
      expect(id.length).toBeLessThanOrEqual(64);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
    expect(chimeIds.externalMeetingId(APPT)).toMatch(/^lb-[0-9a-f]{40}$/);
    expect(chimeIds.externalUserId(APPT, "patient")).not.toBe(chimeIds.externalUserId(APPT, "clinician"));
    expect(chimeIds.externalMeetingId(APPT)).not.toBe(chimeIds.externalMeetingId("8d0c5a52-3f0e-4c4e-9f43-0d9b3f0f1a11"));
  });

  it("reuses a meeting that is still running", async () => {
    const { client, sent } = fakeChime({ getMeeting: "active" });
    const out = await new ChimeVideo(client, "us-east-1").join({ appointmentId: APPT, roomRef: OLD, role: "clinician" });
    expect(names(sent)).toEqual(["GetMeetingCommand", "CreateAttendeeCommand"]);
    expect(out.roomRef).toBe(OLD);
    expect((sent[1] as CreateAttendeeCommand).input.ExternalUserId).toBe(chimeIds.externalUserId(APPT, "clinician"));
  });

  it("recreates an expired meeting with a token tied to the old one, so simultaneous joins share one meeting", async () => {
    const a = fakeChime({ getMeeting: "gone" });
    const b = fakeChime({ getMeeting: "gone" });
    const outA = await new ChimeVideo(a.client, "us-east-1").join({ appointmentId: APPT, roomRef: OLD, role: "patient" });
    await new ChimeVideo(b.client, "us-east-1").join({ appointmentId: APPT, roomRef: OLD, role: "clinician" });
    expect(names(a.sent)).toEqual(["GetMeetingCommand", "CreateMeetingCommand", "CreateAttendeeCommand"]);
    const tokenA = (a.sent[1] as CreateMeetingCommand).input.ClientRequestToken;
    expect(tokenA).toBe((b.sent[1] as CreateMeetingCommand).input.ClientRequestToken);
    expect(tokenA).toBe(chimeIds.clientRequestToken(APPT, OLD));
    expect(tokenA).not.toBe(chimeIds.clientRequestToken(APPT, null));
    expect(outA.roomRef).not.toBe(OLD);
  });

  it("recreates the meeting once if it ends between the lookup and the attendee call", async () => {
    const { client, sent } = fakeChime({ getMeeting: "active", attendeeGoneOnce: true });
    const out = await new ChimeVideo(client, "us-east-1").join({ appointmentId: APPT, roomRef: OLD, role: "patient" });
    expect(names(sent)).toEqual(["GetMeetingCommand", "CreateAttendeeCommand", "CreateMeetingCommand", "CreateAttendeeCommand"]);
    expect((sent[2] as CreateMeetingCommand).input.ClientRequestToken).toBe(chimeIds.clientRequestToken(APPT, OLD));
    expect(out.roomRef).not.toBe(OLD);
  });

  it("does not send a stub room reference to AWS, and surfaces other AWS errors", async () => {
    const stubRef = fakeChime();
    await new ChimeVideo(stubRef.client, "us-east-1").join({ appointmentId: APPT, roomRef: "room_abc", role: "patient" });
    expect(names(stubRef.sent)).toEqual(["CreateMeetingCommand", "CreateAttendeeCommand"]);
    const denied = fakeChime({ getMeeting: "error" });
    await expect(new ChimeVideo(denied.client, "us-east-1").join({ appointmentId: APPT, roomRef: OLD, role: "patient" })).rejects.toMatchObject({ name: "ForbiddenException" });
  });

  it("never starts recording, transcription or media capture", async () => {
    const { client, sent } = fakeChime({ getMeeting: "gone", attendeeGoneOnce: true });
    await new ChimeVideo(client, "us-east-1").join({ appointmentId: APPT, roomRef: OLD, role: "patient" });
    expect(new Set(names(sent))).toEqual(new Set(["GetMeetingCommand", "CreateMeetingCommand", "CreateAttendeeCommand"]));
  });

  it("the stub (default in development and test) issues a room reference and no video session", async () => {
    expect(video().name).toBe("stub");
    const stub = new StubVideo();
    const { roomRef } = await stub.createRoom();
    expect(roomRef).toMatch(/^room_/);
    expect(await stub.join({ roomRef })).toEqual({ roomRef, session: null });
  });
});

describe("visit page CSP", () => {
  const base = { nonce: "n0nce", isDev: false };
  it("allows Chime's signaling and media hosts and blob workers only on visit pages with chime enabled", () => {
    const plain = buildCsp(base);
    expect(plain).not.toContain("chime");
    expect(plain).not.toContain("worker-src");
    const chime = buildCsp({ ...base, chime: true });
    expect(chime).toContain("connect-src 'self' https://*.chime.aws wss://*.chime.aws;");
    expect(chime).toContain("worker-src blob:");
    expect(chime).not.toMatch(/sdkassets|wasm|unsafe-eval|amazonaws\.com/);
    expect(chime).toContain("frame-ancestors 'none'");
  });

  it("recognizes only the two visit paths", () => {
    expect(isVisitPath(`/portal/cases/${APPT}/visit`)).toBe(true);
    expect(isVisitPath(`/ops/visits/${APPT}`)).toBe(true);
    expect(isVisitPath(`/portal/cases/${APPT}/appointment`)).toBe(false);
    expect(isVisitPath(`/portal/cases/${APPT}/visit/extra`)).toBe(false);
    expect(isVisitPath("/ops/visits/not-an-id")).toBe(false);
    expect(isVisitPath("/")).toBe(false);
  });
});

describe("visit join window", () => {
  const startsAt = new Date("2026-10-12T15:00:00Z");
  const endsAt = new Date("2026-10-12T15:30:00Z");
  it("opens 15 minutes before the start and closes 30 minutes after the end", () => {
    expect(visitWindow({ startsAt, endsAt }, new Date("2026-10-12T14:44:00Z")).state).toBe("early");
    expect(visitWindow({ startsAt, endsAt }, new Date("2026-10-12T14:45:00Z")).state).toBe("open");
    expect(visitWindow({ startsAt, endsAt }, new Date("2026-10-12T16:00:00Z")).state).toBe("open");
    expect(visitWindow({ startsAt, endsAt }, new Date("2026-10-12T16:00:01Z")).state).toBe("closed");
  });
});
