import "server-only";
import { randomToken } from "../crypto";

/**
 * Telehealth video. The vendor is an open decision (OWN-15, SEC-08); it must sign a BAA.
 * The stub issues opaque room references so scheduling and join flows work end to end.
 */
export interface VideoProvider {
  readonly name: string;
  createRoom(appointmentId: string): Promise<{ roomRef: string }>;
  joinUrl(roomRef: string, role: "patient" | "clinician"): string | null;
}

class StubVideo implements VideoProvider {
  readonly name = "stub";
  async createRoom() {
    return { roomRef: `room_${randomToken(10)}` };
  }
  joinUrl() {
    return null;
  }
}

export function video(): VideoProvider {
  return new StubVideo();
}
