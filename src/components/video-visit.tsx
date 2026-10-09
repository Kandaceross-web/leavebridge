"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { AudioVideoFacade, AudioVideoObserver, VideoTileState } from "amazon-chime-sdk-js";
import { useFormResult } from "@/components/forms";
import styles from "./video-visit.module.css";

/**
 * In-portal video visit on the Amazon Chime SDK for JavaScript (OWN-15, SEC-08).
 *
 * Sits inside an ActionForm whose server action runs the join check and, when allowed, returns this participant's
 * Chime meeting + attendee objects in `data.outcome.video`. The SDK is loaded only then, from our own origin. No
 * recording, transcription, event ingestion or background effects are used, and the SDK's own logging is off.
 */
type Role = "patient" | "clinician";
interface VideoSession {
  provider: "chime";
  meeting: Record<string, unknown>;
  attendee: { AttendeeId?: string; ExternalUserId?: string; JoinToken?: string };
}
type Outcome = { allowed: true; video: VideoSession | null } | { allowed: false; reason: "early" | "closed" | "location" | "authorization" };

const PEER: Record<Role, string> = { patient: "your clinician", clinician: "the patient" };

function OutcomeBanner({ outcome, role }: { outcome: Outcome; role: Role }) {
  if (outcome.allowed) {
    return (
      <div className="banner banner-info" role="status" data-testid="video-not-configured">
        <div>
          {role === "patient" ? "Your location is confirmed. " : "Join check passed. "}
          Video is not configured in this environment, so there is no call to join. Please {role === "patient" ? "message the care team" : "contact the patient another approved way"} if this is unexpected.
        </div>
      </div>
    );
  }
  const text = {
    early: "The visit room isn't open yet. It opens 15 minutes before the start time.",
    closed: "The time to join this visit has passed. Please message the care team to reschedule.",
    location:
      "Your clinician can only meet with you while you are physically located in a state where they are licensed. Please join from an eligible state, or message the care team to reschedule.",
    authorization: "You are not currently authorized to serve the patient's state for this visit, so it can't start. Check your licenses and authorizations.",
  }[outcome.reason];
  return (
    <div className="banner banner-warn" role="status">
      <div>{text}</div>
    </div>
  );
}

/** Shows the join form (children) until the join check passes, then the call. */
export function VisitJoin({ role, children }: { role: Role; children: ReactNode }) {
  const state = useFormResult();
  const [left, setLeft] = useState(false);
  const outcome = state.ok ? (state.data?.outcome as Outcome | undefined) : undefined;
  if (outcome?.allowed && outcome.video && !left) return <ChimeRoom session={outcome.video} role={role} onLeave={() => setLeft(true)} />;
  return (
    <>
      {left ? (
        <div className="banner banner-info" role="status">
          <div>You left the visit. You can rejoin while the visit is open.</div>
        </div>
      ) : outcome ? (
        <OutcomeBanner outcome={outcome} role={role} />
      ) : null}
      {children}
    </>
  );
}

type Phase = "connecting" | "connected" | "ended" | "error";

function ChimeRoom({ session, role, onLeave }: { session: VideoSession; role: Role; onLeave: () => void }) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const avRef = useRef<AudioVideoFacade | null>(null);
  const cameraRef = useRef<string | null>(null);
  const remoteTileRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [endedText, setEndedText] = useState("The visit has ended.");
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [peerHere, setPeerHere] = useState(false);
  const [remoteVideo, setRemoteVideo] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let av: AudioVideoFacade | null = null;
    const stop = () => {
      if (!av) return;
      try {
        av.stopLocalVideoTile();
      } catch {
        /* already stopped */
      }
      void av.stopVideoInput().catch(() => undefined);
      void av.stopAudioInput().catch(() => undefined);
      av.stop();
    };
    (async () => {
      const sdk = await import("amazon-chime-sdk-js");
      if (cancelled) return;
      const logger = new sdk.NoOpLogger();
      const config = new sdk.MeetingSessionConfiguration({ Meeting: session.meeting }, { Attendee: session.attendee });
      const meetingSession = new sdk.DefaultMeetingSession(config, logger, new sdk.DefaultDeviceController(logger));
      av = meetingSession.audioVideo;
      avRef.current = av;
      const selfId = session.attendee.AttendeeId;

      const observer: AudioVideoObserver = {
        audioVideoDidStart: () => setPhase("connected"),
        audioVideoDidStop: (status) => {
          const code = status.statusCode();
          if (code === sdk.MeetingSessionStatusCode.Left) return;
          if (code === sdk.MeetingSessionStatusCode.AudioJoinedFromAnotherDevice) setEndedText("You joined this visit from another window or device, so this one was disconnected.");
          else if (code === sdk.MeetingSessionStatusCode.MeetingEnded) setEndedText("The visit has ended.");
          else setEndedText("The connection to the visit was lost. Leave and join again to reconnect.");
          setPhase("ended");
        },
        videoTileDidUpdate: (tile: VideoTileState) => {
          if (!tile.boundAttendeeId || tile.isContent || tile.tileId === null || !av) return;
          if (tile.localTile) {
            if (localRef.current) av.bindVideoElement(tile.tileId, localRef.current);
          } else if (remoteRef.current) {
            remoteTileRef.current = tile.tileId;
            av.bindVideoElement(tile.tileId, remoteRef.current);
            setRemoteVideo(!tile.paused);
          }
        },
        videoTileWasRemoved: (tileId: number) => {
          if (tileId === remoteTileRef.current) {
            remoteTileRef.current = null;
            setRemoteVideo(false);
          }
        },
      };
      av.addObserver(observer);
      av.realtimeSubscribeToAttendeeIdPresence((attendeeId, present) => {
        if (attendeeId === selfId || attendeeId.includes("#content")) return;
        setPeerHere(present);
      });

      try {
        const mics = await av.listAudioInputDevices();
        await av.startAudioInput(mics[0]?.deviceId ?? null);
      } catch {
        setNotice("We couldn't use your microphone. Check that your browser allows microphone access for this site, then leave and join again.");
      }
      if (cancelled) return stop();
      try {
        const cams = await av.listVideoInputDevices();
        if (cams[0]) {
          await av.startVideoInput(cams[0].deviceId);
          cameraRef.current = cams[0].deviceId;
        } else setCameraOff(true);
      } catch {
        setCameraOff(true);
        setNotice((n) => n ?? "We couldn't use your camera. You can continue with audio, or allow camera access and join again.");
      }
      if (cancelled) return stop();
      if (audioRef.current) await av.bindAudioElement(audioRef.current);
      av.start();
      if (cameraRef.current) av.startLocalVideoTile();
    })().catch(() => {
      if (!cancelled) setPhase("error");
    });
    const onPageHide = () => stop();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onPageHide);
      stop();
      avRef.current = null;
    };
  }, [session]);

  const toggleMute = useCallback(() => {
    const av = avRef.current;
    if (!av) return;
    if (muted) setMuted(!av.realtimeUnmuteLocalAudio());
    else {
      av.realtimeMuteLocalAudio();
      setMuted(true);
    }
  }, [muted]);

  const toggleCamera = useCallback(async () => {
    const av = avRef.current;
    if (!av || busy) return;
    setBusy(true);
    try {
      if (!cameraOff) {
        av.stopLocalVideoTile();
        await av.stopVideoInput();
        setCameraOff(true);
      } else {
        const id = cameraRef.current ?? (await av.listVideoInputDevices())[0]?.deviceId;
        if (!id) {
          setNotice("No camera was found.");
          return;
        }
        await av.startVideoInput(id);
        cameraRef.current = id;
        av.startLocalVideoTile();
        setCameraOff(false);
      }
    } catch {
      setNotice("We couldn't turn on your camera. Check your browser's camera permission.");
    } finally {
      setBusy(false);
    }
  }, [busy, cameraOff]);

  const leave = useCallback(() => {
    avRef.current?.stop();
    onLeave();
  }, [onLeave]);

  const peer = PEER[role];
  const statusText =
    phase === "connecting"
      ? "Connecting to the visit…"
      : phase === "error"
        ? "We couldn't connect to the visit. Leave and join again, or message the care team."
        : phase === "ended"
          ? endedText
          : peerHere
            ? `Connected. ${peer.charAt(0).toUpperCase() + peer.slice(1)} is in the visit.`
            : `Connected. Waiting for ${peer} to join.`;

  return (
    <section className="stack" aria-labelledby="visit-room-h" data-testid="video-room">
      <h2 id="visit-room-h">Video visit</h2>
      <p role="status" aria-live="polite" className="small">
        {statusText}
      </p>
      {notice ? (
        <div className="banner banner-warn" role="alert">
          <div>{notice}</div>
        </div>
      ) : null}
      <div className={styles.stage}>
        <div className={styles.remote}>
          <video ref={remoteRef} className={styles.video} autoPlay playsInline aria-label={`Video from ${peer}`} hidden={!remoteVideo} />
          {!remoteVideo ? <p className={styles.placeholder}>{peerHere ? `${peer.charAt(0).toUpperCase() + peer.slice(1)}'s camera is off.` : `Waiting for ${peer}…`}</p> : null}
        </div>
        <div className={styles.self}>
          <video ref={localRef} className={styles.video} autoPlay playsInline muted aria-label="Your camera preview" hidden={cameraOff} />
          {cameraOff ? <p className={styles.placeholder}>Your camera is off</p> : null}
        </div>
      </div>
      <audio ref={audioRef} autoPlay hidden />
      <div className="btn-row" role="group" aria-label="Visit controls">
        <button type="button" className="btn btn-secondary" aria-pressed={muted} onClick={toggleMute} disabled={phase !== "connected"}>
          Mute microphone
        </button>
        <button type="button" className="btn btn-secondary" aria-pressed={cameraOff} onClick={toggleCamera} disabled={busy || phase === "error" || phase === "ended"}>
          Turn off camera
        </button>
        <button type="button" className="btn btn-danger" onClick={leave}>
          Leave visit
        </button>
      </div>
      <p className="fine muted">
        {muted ? "Your microphone is muted. " : ""}
        This visit is not recorded or transcribed.
      </p>
    </section>
  );
}
