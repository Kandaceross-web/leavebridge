import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { FAQ_CATEGORIES } from "@/config/catalog";
import type { ActionState } from "@/server/web/action";
import { REVIEW_TAG_OPTIONS } from "../_lib/ui";

export interface ContentValues {
  kind: string;
  title: string;
  bodyMd: string;
  category: string | null;
  status: string;
  reviewTag: string | null;
  sortOrder: number;
}

/** Shared create/edit form for content entries (server component; the action is bound by the page). */
export function ContentForm({ action, values, submit }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values: ContentValues; submit: string }) {
  return (
    <ActionForm action={action} className="form form-wide">
      <TextField name="title" label={values.kind === "faq" ? "Question" : "Title"} required defaultValue={values.title} maxLength={200} />
      <TextArea name="bodyMd" label="Body (Markdown)" required rows={10} defaultValue={values.bodyMd} maxLength={20000} hint="Supports ## headings, - lists, **bold**, > notes and links. Legal or clinical statements must come from reviewed sources." />
      {values.kind === "faq" ? (
        <SelectField name="category" label="Category" options={FAQ_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))} placeholder="Choose a category" defaultValue={values.category ?? ""} required />
      ) : (
        <TextField name="category" label="Category" defaultValue={values.category ?? ""} maxLength={40} />
      )}
      <SelectField
        name="status"
        label="Status"
        defaultValue={values.status}
        options={[
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
          { value: "retired", label: "Retired" },
        ]}
      />
      <SelectField name="reviewTag" label="Review tag" options={REVIEW_TAG_OPTIONS} placeholder="None (review complete)" defaultValue={values.reviewTag ?? ""} hint="Keep the tag until the named review is complete. In production, tagged entries cannot be published." />
      <TextField name="sortOrder" label="Sort order" type="number" inputMode="numeric" required defaultValue={String(values.sortOrder)} />
      <div>
        <SubmitButton pendingText="Saving…">{submit}</SubmitButton>
      </div>
    </ActionForm>
  );
}
