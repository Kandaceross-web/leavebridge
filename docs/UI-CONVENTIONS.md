# UI conventions

How pages, forms and server actions are built in this app. Read this before adding a page.

## Stack

Next.js 16 App Router (async `params`, `searchParams`, `cookies()`, `headers()`), React 19, TypeScript strict
(`noUncheckedIndexedAccess`). No client-side data fetching libraries; pages are React Server Components that call the
service layer directly. Every page is dynamically rendered (the CSP nonce in `src/proxy.ts` requires it).

## Layouts and route groups

| Area | Path | Layout | Guard |
| --- | --- | --- | --- |
| Public site | `src/app/(site)/…` | `(site)/layout.tsx` header, crisis strip, footer | none |
| Auth + screening | `src/app/(auth)/…` (`/sign-in`, `/sign-up`, `/mfa`, `/step-up`, `/start/*`) | `(auth)/layout.tsx` | per page |
| Patient portal | `src/app/portal/…` | `portal/layout.tsx` | `requirePatientSession()` |
| Operations console | `src/app/ops/…` | `ops/layout.tsx` (sidebar) | `requireStaffSession(roles?)` |

## Reading data in a page

```tsx
import { requirePatientSession, run } from "@/server/auth/guards";
import { loadCase } from "@/server/services/cases";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requirePatientSession();           // or requireStaffSession(["admin"])
  const data = await run(actor, (ctx) => loadCase(ctx, id, "owner"));
  …
}
```

`run(actor, fn)` opens one transaction with Postgres row-level security set for that actor, plus request id and hashed IP
for the audit log. Services enforce authorization themselves; never bypass them with raw queries from a page.
Domain errors (`DomainError` with codes `not_found`, `forbidden`, `invalid`, `conflict`, …) thrown while rendering should
become `notFound()` for not_found/forbidden on detail pages (do not reveal that a record exists).

## Mutations: server actions

Colocate an `actions.ts` with `"use server"` at the top. Signature `(prev: ActionState, fd: FormData) => Promise<ActionState>`.

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requirePatientSession, run } from "@/server/auth/guards";
import { handle, formFields, type ActionState } from "@/server/web/action";

export async function saveThing(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => someService(ctx, caseId, formFields(fd)));
    revalidatePath(`/portal/cases/${caseId}`);
    return { message: "Saved." };
  }, fd);
}
```

* Bind ids with `saveThing.bind(null, caseId)`; Next encrypts bound arguments. Re-check access in the service anyway.
* `handle()` turns domain errors into a message, zod errors into `fieldErrors`, passes `redirect()` through, sends
  `step_up_required`/`mfa_required` to `/step-up` or `/mfa` and back, and logs unexpected errors without content.
* To navigate after success, call `redirect()` after `handle()` returns without error (see `src/app/(auth)/actions.ts`).
* Helpers: `formFields(fd)` (strings), `formAnswers(fd)` (multi-value arrays), `formFile(fd, "file")` (upload buffer).

## Forms

Client components in `src/components/forms.tsx`: `ActionForm`, `SubmitButton`, `TextField`, `TextArea`, `SelectField`,
`ChoiceGroup` (radio/checkbox cards), `Checkbox`, `FileField`. Fields read their error (`fieldErrors[name]`) and the
value the user typed (echoed on error) from the enclosing `ActionForm`, so pages stay server components:

```tsx
<ActionForm action={saveThing.bind(null, id)}>   {/* uploads work without encType */}
  <TextField name="employerName" label="Employer name" required />
  <FileField name="file" label="Employer form (PDF, JPG or PNG)" />
  <SubmitButton>Save</SubmitButton>
</ActionForm>
```

Do not pass functions (render props) from a server component into a client component.

## Presentational components

`src/components/ui.tsx`: `Lockup`, `Icon`, `Badge` (tones neutral/info/progress/action/done/alert), `DraftBadge`,
`ReviewTag`, `Banner` (info/warn/alert/safety/sage), `PageHead`, `ButtonLink`, `KeyValue`, `Empty`, `Timeline`, `Money`,
`DateTime`, `Markdown` (safe subset for admin-managed content). `src/components/nav.tsx`: `NavLink` (sets aria-current).

## Styling

Global classes in `src/app/globals.css` from the approved visual direction. Common ones: layout `container`,
`container-narrow`, `page`, `section`, `stack` (+`stack-sm|lg|xl`), `row`, `row-between`, `grid g2|g3|g4`, `two-col`;
surfaces `card`, `card-flat`, `card-quiet`, `kv`, `list-plain`, `list-check`, `list-rows`; buttons `btn btn-primary|secondary|quiet|sage|danger`,
`btn-sm`, `btn-row`; forms `form`, `field`, `choice`, `check`; status `badge b-*`, `banner banner-*`, `tag`; app
`tabs`, `filters`, `chip-link`, `queues`/`q`, `board`/`board-col`/`board-card`, `tbl-wrap` + `table.t`, `timeline`,
`checklist`, `progress`, `thread`/`msg`, `doc-preview` (+`draft`), `suggestion`, `watermark`. Prefer these. If a page
truly needs something new, use a colocated CSS Module rather than editing `globals.css`.

## Rules every page follows

* **Privacy.** No PHI in URLs (ids only, never names, answers or diagnoses in query strings), in logs (`log` from
  `@/server/logger` only, allow-listed fields; `console.*` is a lint error), or in notification text.
* **Copy.** Never promise outcomes. No "approved", "qualified", "certified", "guaranteed" in patient-facing status or
  marketing copy. Payment covers an assessment, not a result. FMLA eligibility and leave approval belong to the employer.
  Use `PATIENT_STATUS` labels from `src/domain/cases/state-machine.ts` for case status. Legal/clinical text comes from the
  database (`content_entries`, `consent_versions`, settings) and carries review tags; do not invent legal or clinical claims.
* **Safety.** Crisis resources come from the `crisis` setting. Messaging and portal are not for emergencies; say so where
  people write to us.
* **AI.** Any AI-drafted text is shown with `DraftBadge`, inside `.suggestion`, and is never signable until a clinician
  accepts it into their own version.
* **Accessibility (WCAG 2.2 AA).** One `h1` per page, ordered headings, labels on every control, `aria-current` on nav,
  visible focus, 44px targets, errors announced (ActionForm does this), tables with `<th scope>`, no color-only meaning.
* **Responsive.** Mobile-first. No horizontal page scroll at 360px; wide tables live in `.tbl-wrap`.
