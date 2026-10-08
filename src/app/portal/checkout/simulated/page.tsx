import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Banner, Money } from "@/components/ui";
import { requirePatientSession, run } from "@/server/auth/guards";
import { env } from "@/server/env";
import { payments as paymentProvider } from "@/server/providers/payments";
import { simulatedCheckoutInfo } from "@/server/services/payments";
import { orNotFound } from "../../_lib/load";
import { paySimulated } from "./actions";

export const metadata: Metadata = { title: "Simulated checkout" };

export default async function SimulatedCheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (paymentProvider().name !== "fake" || env.APP_ENV === "production") notFound();
  const { ref } = await searchParams;
  if (!ref || !/^fake_cs_[\w-]{4,64}$/.test(ref)) notFound();
  const { actor } = await requirePatientSession();
  const pay = await orNotFound(run(actor, (ctx) => simulatedCheckoutInfo(ctx, ref)));
  const done = pay.status === "paid" || pay.status === "partially_refunded";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 560, marginInline: "auto" }}>
      <Banner tone="warn" icon="alert">
        <b>Simulated payment — no real charge.</b> This page exists only in development builds to stand in for the payment processor.
      </Banner>
      <section className="card stack">
        <p className="eyebrow">Development checkout</p>
        <h1>Professional assessment service</h1>
        <div className="row row-between">
          <span className="muted">Amount</span>
          <b style={{ fontSize: 22 }}>
            <Money cents={pay.amountCents} currency={pay.currency} />
          </b>
        </div>
        {done ? (
          <>
            <Banner tone="sage" icon="check">
              This payment is already complete.
            </Banner>
            <Link className="btn btn-primary" href={`/portal/cases/${pay.caseId}?paid=1`}>
              Back to your case
            </Link>
          </>
        ) : (
          <ActionForm action={paySimulated.bind(null, ref)}>
            <SubmitButton block pendingText="Processing…">
              Pay <Money cents={pay.amountCents} currency={pay.currency} /> (simulated)
            </SubmitButton>
            <Link className="btn btn-quiet" href={`/portal/cases/${pay.caseId}/checkout?cancelled=1`}>
              Cancel and go back
            </Link>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
