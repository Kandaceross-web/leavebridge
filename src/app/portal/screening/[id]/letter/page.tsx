import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, ChoiceGroup, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Banner } from "@/components/ui";
import { getSetting } from "@/server/settings";
import { ownedScreening, screeningHref } from "../../_lib/load";
import { requestLetterAction } from "../actions";

export const metadata: Metadata = { title: "Request an excuse letter" };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function LetterRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view, extra } = await ownedScreening(id, (ctx) => getSetting(ctx.tx, "workExcuseLetter"));
  const { row, screening, record, letter } = view;
  const href = screeningHref(row.id);
  if (
    !extra.enabled ||
    screening.status !== "issued" ||
    record?.status !== "valid" ||
    letter ||
    !screening.completedAt
  )
    redirect(href);
  const day = 86_400_000;
  const completed = screening.completedAt.getTime();
  const minStart = iso(new Date(completed - 14 * day));
  const maxStart = iso(new Date(completed + 14 * day));

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <header className="page-head">
        <p className="eyebrow">Reference {row.reference}</p>
        <h1>Request a work or school excuse letter</h1>
        <p className="lede">
          A licensed clinician reviews your screening and your request, and decides whether to issue
          a letter. They may change the dates or decline.
        </p>
      </header>
      <p className="small">
        <Link href={href}>Back to your screening</Link>
      </p>
      <Banner tone="info" icon="info">
        Each screening can have one letter request, and it cannot be changed after you send it. A
        letter is not guaranteed. If your absence is longer than a month, or your employer needs an
        FMLA form, a full clinician-led assessment is the right service.
      </Banner>
      <ActionForm action={requestLetterAction.bind(null, row.id)} className="form card">
        <ChoiceGroup
          name="setting"
          legend="What is the letter for?"
          required
          options={[
            { value: "work", label: "Work", description: "An absence from your job." },
            {
              value: "school",
              label: "School",
              description:
                "An absence from classes, such as college, university or a training program.",
            },
          ]}
        />
        <TextField
          name="startDate"
          label="First day you were or will be away"
          type="date"
          min={minStart}
          max={maxStart}
          required
          hint="Within 14 days of your screening."
        />
        <TextField
          name="endDate"
          label="Last day away"
          type="date"
          min={minStart}
          required
          hint="At most 31 days in total."
        />
        <TextField
          name="returnDate"
          label="Day you expect to return (optional)"
          type="date"
          min={minStart}
        />
        <TextArea
          name="note"
          label="Anything the clinician should know (optional)"
          hint="Do not include anything you do not want in your record. Up to 1,000 characters."
          maxLength={1000}
          rows={4}
        />
        <SubmitButton pendingText="Sending…">Send request</SubmitButton>
      </ActionForm>
    </div>
  );
}
