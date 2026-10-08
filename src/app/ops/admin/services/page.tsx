import type { Metadata } from "next";
import { ActionForm, Checkbox, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, DateTime, Money, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listServices } from "@/server/services/admin";
import { isProduction } from "@/server/env";
import { InlineAction, label } from "../_lib/ui";
import css from "../_lib/admin.module.css";
import { clearServiceTagAction, setPriceAction, updateServiceAction } from "./actions";

export const metadata: Metadata = { title: "Services & pricing" };

export default async function ServicesPage() {
  const { actor } = await requireStaffSession(["admin"]);
  const services = await run(actor, (ctx) => listServices(ctx));
  const now = new Date().getTime();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Services & pricing"
        lede="Prices are versioned: a new price closes the previous one and nothing is edited in place. Payment covers an assessment, not an outcome."
      />
      {services.map((s) => {
        const current = s.prices.find((p) => new Date(p.effectiveFrom).getTime() <= now && (!p.effectiveTo || new Date(p.effectiveTo).getTime() > now));
        return (
          <section key={s.id} id={`svc-${s.id}`} className="card stack" aria-labelledby={`svc-h-${s.id}`}>
            <div className="card-head">
              <div className="stack stack-sm">
                <h2 id={`svc-h-${s.id}`}>{s.name}</h2>
                <div className="row">
                  {s.enabled ? <Badge tone="done">Enabled</Badge> : <Badge>Disabled</Badge>}
                  <span className="tag">{s.slug}</span>
                  <span className="small muted">{label(s.documentationType)}</span>
                  <ReviewTag tag={s.reviewTag} />
                </div>
              </div>
              <div className="stack stack-sm" style={{ justifyItems: "end" }}>
                <span className="price" style={{ fontSize: 22 }}>{current ? <Money cents={current.amountCents} currency={current.currency} /> : "No current price"}</span>
              </div>
            </div>
            {s.reviewTag ? (
              <div className="row small">
                <span className="muted">
                  {isProduction ? "This service cannot be enabled in production until its review tag is cleared." : "Clear the tag only after the named review is complete."}
                </span>
                <InlineAction action={clearServiceTagAction.bind(null, s.id)} variant="secondary" pendingText="Clearing…">
                  Clear review tag
                </InlineAction>
              </div>
            ) : null}
            <details className={css.detailsBtn}>
              <summary className="btn btn-secondary btn-sm">Edit service and requirements</summary>
              <div className="card-quiet" style={{ marginTop: 12 }}>
                <ActionForm action={updateServiceAction.bind(null, s.id)}>
                  <Checkbox name="enabled" defaultChecked={s.enabled}>
                    Enabled (offered to patients)
                  </Checkbox>
                  <TextField name="name" label="Name" required defaultValue={s.name} maxLength={120} />
                  <TextArea name="summary" label="Summary" required rows={2} defaultValue={s.summary} maxLength={400} />
                  <TextArea name="description" label="Description" required rows={5} defaultValue={s.description} maxLength={4000} />
                  <fieldset>
                    <legend>Requirements</legend>
                    <Checkbox name="requiresSession" defaultChecked={s.requiresSession}>
                      Telehealth session required
                    </Checkbox>
                    <Checkbox name="requiresIdentityVerification" defaultChecked={s.requiresIdentityVerification}>
                      Identity verification required
                    </Checkbox>
                    <Checkbox name="requiresEmployerForm" defaultChecked={s.requiresEmployerForm}>
                      Employer form required
                    </Checkbox>
                  </fieldset>
                  <TextField name="sessionMinutes" label="Session length (minutes)" type="number" inputMode="numeric" min="15" max="180" required defaultValue={String(s.sessionMinutes)} />
                  <TextField name="minAge" label="Minimum age" type="number" inputMode="numeric" min="13" max="120" required defaultValue={String(s.minAge)} />
                  <TextField name="displayOrder" label="Display order" type="number" inputMode="numeric" min="0" max="1000" required defaultValue={String(s.displayOrder)} />
                  <div>
                    <SubmitButton pendingText="Saving…">Save service</SubmitButton>
                  </div>
                </ActionForm>
              </div>
            </details>
            <h3>Price history</h3>
            {s.prices.length ? (
              <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
                <table className="t">
                  <thead>
                    <tr>
                      <th scope="col">Amount</th>
                      <th scope="col">Payer</th>
                      <th scope="col">Effective from</th>
                      <th scope="col">Effective to</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.prices.map((p) => (
                      <tr key={p.id}>
                        <td className="num">
                          <Money cents={p.amountCents} currency={p.currency} />
                        </td>
                        <td>{label(p.payerType)}</td>
                        <td className="nowrap">
                          <DateTime value={p.effectiveFrom} />
                        </td>
                        <td className="nowrap">
                          <DateTime value={p.effectiveTo} />
                        </td>
                        <td>{p === current ? <Badge tone="done">Current</Badge> : new Date(p.effectiveFrom).getTime() > now ? <Badge tone="info">Scheduled</Badge> : <Badge>Closed</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No prices recorded.</p>
            )}
            <ActionForm action={setPriceAction.bind(null, s.id)} className="filters">
              <TextField name="amount" label="New price (USD)" inputMode="numeric" required placeholder="275.00" />
              <TextField name="effectiveFrom" label="Effective from" type="date" required defaultValue={today} />
              <div>
                <SubmitButton variant="secondary" pendingText="Saving…">
                  Set new price
                </SubmitButton>
              </div>
            </ActionForm>
          </section>
        );
      })}
    </>
  );
}
