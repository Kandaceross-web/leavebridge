import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextArea } from "@/components/forms";
import { Banner, DateTime, Empty } from "@/components/ui";
import { caseThreads, threadMessages } from "@/server/services/messaging";
import { myPatientProfile } from "@/server/services/portal-queries";
import { getSetting } from "@/server/settings";
import { ownedCase } from "../../../_lib/load";
import { StepHead } from "../../../_components/step-head";
import { send } from "./actions";

export const metadata: Metadata = { title: "Messages" };

const CATEGORY = {
  administrative: { label: "Care team", hint: "Scheduling, payments, documents and account questions." },
  clinical: { label: "Your clinician", hint: "Questions for your clinician about your assessment." },
} as const;

export default async function CaseMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => {
    const { canClinical } = await caseThreads(ctx, r.id);
    const category = sp.thread === "clinical" && canClinical ? "clinical" : "administrative";
    return {
      canClinical,
      category: category as keyof typeof CATEGORY,
      messages: await threadMessages(ctx, r.id, category),
      profile: await myPatientProfile(ctx),
      features: await getSetting(ctx.tx, "features"),
      brand: await getSetting(ctx.tx, "brand"),
    };
  });
  const { canClinical, category, messages, profile, features, brand } = extra;
  const base = `/portal/cases/${row.id}/messages`;
  const tabs = (Object.keys(CATEGORY) as (keyof typeof CATEGORY)[]).filter((c) => c === "administrative" || canClinical);

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead caseId={row.id} reference={row.reference} steps={steps} title="Secure messages" lede={CATEGORY[category].hint} />
      <Banner tone="warn" icon="alert">
        <b>Messages are not monitored in real time and are not for emergencies.</b> If you are in crisis, call or text <a href="tel:988">988</a> or call <a href="tel:911">911</a>. {brand.clinicalHours}.
      </Banner>
      <nav className="tabs" aria-label="Message threads">
        {tabs.map((c) => (
          <Link key={c} href={c === "administrative" ? base : `${base}?thread=clinical`} aria-current={c === category ? "page" : undefined}>
            {CATEGORY[c].label}
          </Link>
        ))}
      </nav>
      <section aria-label={`${CATEGORY[category].label} messages`} className="thread">
        {messages.length ? (
          messages.map((m) => (
            <article key={m.id} className={`msg${m.mine ? " mine" : ""}`}>
              <p className="meta">
                {m.mine ? "You" : m.sender} · <DateTime value={m.createdAt} timeZone={profile.timeZone} />
              </p>
              <p className="body">{m.body}</p>
            </article>
          ))
        ) : (
          <Empty title="No messages yet">Start a conversation below.</Empty>
        )}
      </section>
      {features.messaging ? (
        <ActionForm action={send.bind(null, row.id, category)}>
          <TextArea name="body" label={`Message to ${CATEGORY[category].label.toLowerCase()}`} required maxLength={5000} rows={5} />
          <SubmitButton pendingText="Sending…">Send message</SubmitButton>
        </ActionForm>
      ) : (
        <Banner tone="info">Secure messaging is not available right now. Please contact support at {brand.supportEmail}.</Banner>
      )}
    </div>
  );
}
