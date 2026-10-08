"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormResult } from "@/components/forms";

interface Crisis {
  headline: string;
  body: string;
  resources: { label: string; detail: string; href: string }[];
}

/**
 * Inside an ActionForm: when the action reports a safety response, replace the form fields with
 * crisis resources and an explicit way to continue, instead of silently moving on.
 */
export function SafetyGate({ crisis, nextHref, nextLabel, children }: { crisis: Crisis; nextHref: string; nextLabel: string; children: ReactNode }) {
  const state = useFormResult();
  if (!state.data?.safety) return <>{children}</>;
  const banner = (
    <div className="banner banner-safety" role="alert">
      <div className="stack stack-sm">
        <p>
          <b>{crisis.headline}</b>
        </p>
        <p>{crisis.body}</p>
        <ul className="list-plain">
          {crisis.resources.map((r) => (
            <li key={r.label}>
              {r.href ? <a href={r.href}>{r.label}</a> : <b>{r.label}</b>}
              {r.detail ? <span> · {r.detail}</span> : null}
            </li>
          ))}
        </ul>
        <p>
          Our care team has been alerted and will follow up with you. They cannot respond in real
          time, so please use the resources above if you need help now.
        </p>
      </div>
    </div>
  );
  // With other errors still to fix, keep the form visible under the crisis resources.
  if (state.error) {
    return (
      <>
        {banner}
        {children}
      </>
    );
  }
  return (
    <div className="stack">
      {banner}
      <p>Your answers were saved.</p>
      <div className="btn-row">
        <Link href={nextHref} className="btn btn-secondary">
          {nextLabel}
        </Link>
      </div>
    </div>
  );
}

/** Shows its children only while another field in the same form has a given value. */
export function ShowIf({ field, equals, initial, children }: { field: string; equals: string; initial: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(initial);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => {
      const el = form.elements.namedItem(field) as RadioNodeList | HTMLInputElement | HTMLSelectElement | null;
      setVisible(Boolean(el) && el!.value === equals);
    };
    update();
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, [field, equals]);
  return (
    <div ref={ref} hidden={!visible} className="stack">
      {children}
    </div>
  );
}

/** Result of the appointment join check, read from the enclosing ActionForm. */
export function JoinOutcome() {
  const state = useFormResult();
  if (!state.ok || !state.data) return null;
  if (!state.data.allowed) {
    return (
      <div className="banner banner-warn" role="status">
        <div>
          Your clinician can only meet with you while you are physically located in a state where
          they are licensed. Please join from an eligible state, or message the care team to
          reschedule.
        </div>
      </div>
    );
  }
  const url = typeof state.data.joinUrl === "string" ? state.data.joinUrl : null;
  return url ? (
    <div className="banner banner-sage" role="status">
      <div className="stack stack-sm">
        <p>Your location is confirmed.</p>
        <p>
          <a className="btn btn-primary" href={url} target="_blank" rel="noopener noreferrer">
            Open video visit
          </a>
        </p>
      </div>
    </div>
  ) : (
    <div className="banner banner-info" role="status">
      <div>
        Your location is confirmed. The video provider is not configured in this build, so there is
        no visit link to open yet.
      </div>
    </div>
  );
}
