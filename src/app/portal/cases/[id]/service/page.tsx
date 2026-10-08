import type { Metadata } from "next";
import { ActionForm, ChoiceGroup, SubmitButton, TextField } from "@/components/forms";
import { Banner, Money, ReviewTag } from "@/components/ui";
import { decryptOptional } from "@/server/crypto";
import { env } from "@/server/env";
import { enabledServicesWithPrice } from "@/server/services/portal-queries";
import { LEAVE_TYPES } from "@/domain/constants";
import { ownedCase } from "../../../_lib/load";
import { LEAVE_TYPE_LABEL } from "../../../_lib/steps";
import { StepHead } from "../../../_components/step-head";
import { saveService } from "./actions";

export const metadata: Metadata = { title: "Choose your service" };

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, steps, extra: services } = await ownedCase(id, (ctx) => enabledServicesWithPrice(ctx));
  const locked = row.status !== "started";
  const showTags = env.APP_ENV !== "production";
  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        step="service"
        title="Choose your service"
        lede="Tell us what you are requesting. You can change this until you pay."
      />
      {locked ? (
        <Banner tone="info" icon="lock">
          Your service can&rsquo;t be changed after payment. Message support if something needs to change.
        </Banner>
      ) : null}
      <ActionForm action={saveService.bind(null, row.id)}>
        <ChoiceGroup
          name="serviceId"
          legend="Service"
          required
          defaultValue={row.serviceId ?? (services.length === 1 ? services[0]!.id : undefined)}
          options={services.map((s) => ({
            value: s.id,
            label: (
              <>
                {s.name} · {s.priceCents !== null ? <Money cents={s.priceCents} currency={s.currency} /> : "Price not available"}
              </>
            ),
            description: (
              <>
                {s.summary} {showTags ? <ReviewTag tag={s.reviewTag} /> : null}
              </>
            ),
          }))}
        />
        <ChoiceGroup
          name="leaveType"
          legend="What kind of leave are you requesting?"
          hint="The clinician documents what is clinically supported, which may differ from what you request."
          required
          defaultValue={row.requestedLeaveType ?? undefined}
          options={LEAVE_TYPES.map((t) => ({ value: t, label: LEAVE_TYPE_LABEL[t] }))}
        />
        <TextField
          name="deadline"
          type="date"
          label="Documentation deadline (optional)"
          hint="If your employer or leave administrator gave you a due date, enter it so we can see it."
          defaultValue={row.documentationDeadline ?? ""}
        />
        <TextField
          name="employerName"
          label="Employer name (optional)"
          maxLength={200}
          autoComplete="organization"
          defaultValue={decryptOptional(row.employerName) ?? ""}
        />
        {!locked ? <SubmitButton pendingText="Saving…">Save and continue</SubmitButton> : null}
      </ActionForm>
    </div>
  );
}
