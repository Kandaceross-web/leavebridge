import type { ContentSeed } from "./catalog";

/**
 * Guides for the public resources center and the state pages. Each topic answers a question that
 * the demand research found people actually ask (docs/research/2026-10-demand-and-competitors.md).
 *
 * Every entry is LEGAL_REVIEW_REQUIRED or STATE_RULE_REQUIRED: they describe federal and state rules
 * as a reader would find them and are drafts until counsel reviews them. The release check blocks
 * production while any published entry still carries a review tag. The first paragraph of each body
 * doubles as the page's meta description, so keep it to one or two plain sentences.
 */

const resource = (
  order: number,
  slug: string,
  category: string,
  title: string,
  body: string,
): ContentSeed => ({
  kind: "resource",
  key: `resource.${slug}`,
  category,
  title,
  body,
  reviewTag: "LEGAL_REVIEW_REQUIRED",
  order,
});

const NOT_ADVICE =
  "> This guide is general information, not legal or medical advice. Your employer, plan, or leave administrator decides leave requests.";

export const RESOURCES: ContentSeed[] = [
  resource(
    1,
    "fmla-for-anxiety-and-depression",
    "FMLA basics",
    "Can you take FMLA leave for anxiety or depression?",
    `Mental-health conditions can qualify as a serious health condition under the Family and Medical Leave Act when they meet the same tests as any other condition. Whether your leave is approved is decided by your employer, not by the clinician.

${NOT_ADVICE}

## What the law looks at

FMLA rules describe a serious health condition as one that involves inpatient care or continuing treatment by a health care provider. The U.S. Department of Labor has published guidance confirming that mental-health conditions can meet this definition. See the [Department of Labor's mental health FMLA guidance](https://www.dol.gov/agencies/whd/fact-sheets/28o-mental-health).

## Two separate questions

- **Are you eligible?** This depends on your employer's size, how long you've worked there, and the hours you've worked. Your HR team or leave administrator decides this.
- **Is leave medically supported?** This is what a clinical assessment addresses. A clinician looks at your symptoms and how they affect your ability to do your job.

## What a clinician can and can't do

A clinician can assess you and, when it is clinically supported, complete the medical part of your employer's form. A clinician can't decide eligibility, approve leave, or promise an outcome. Be cautious of any service that guarantees approval.`,
  ),
  resource(
    2,
    "who-can-complete-fmla-forms",
    "FMLA basics",
    "Who can complete FMLA paperwork for a mental-health condition?",
    `FMLA regulations list the types of health care providers whose certification an employer must accept. Some mental-health license types are named in that list and some are not, so check with your employer before you pay anyone to complete a form.

${NOT_ADVICE}

## The list in the regulation

The federal regulation at [29 CFR 825.125](https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/part-825/subpart-B/section-825.125) names provider types including doctors of medicine or osteopathy, clinical psychologists, clinical social workers, nurse practitioners, and physician assistants, when they practice within the scope of their license.

## Other providers

The same regulation also covers any provider from whom an employer or group health plan's benefits manager will accept certification. Licensed professional counselors are not named on the list, so whether a counselor's certification is accepted can depend on your employer or plan.

## What to do

- Ask your HR team or leave administrator which provider types they accept.
- Ask before you pay for any assessment, including ours.
- If your employer uses a third-party administrator, ask them directly.

LeaveBridge Health shows each clinician's license type in your portal so you can confirm it with your employer.`,
  ),
  resource(
    3,
    "no-regular-doctor",
    "Getting started",
    "Need FMLA paperwork but don't have a regular doctor?",
    `You don't need an existing doctor or a referral to be assessed. A licensed clinician can evaluate you from the start, as long as you are located in a state where they are licensed.

${NOT_ADVICE}

## Why this comes up

Many people searching for leave paperwork don't have a primary care provider, or can't get an appointment before their employer's deadline. Some therapy services also don't complete employer forms.

## What to look for in any service

- A licensed clinician who actually assesses you, not a form-filling service.
- A clear price with no subscription.
- A clinician licensed in the state where you are located.
- Honest language: no guarantees of approval.

## Telling us about a deadline

If your employer has given you a deadline, tell us during screening. The clinical team can see it, and we'll tell you honestly if the timing is tight. We can't guarantee a completion date.`,
  ),
  resource(
    4,
    "what-your-employer-can-see",
    "Privacy",
    "What can your employer see about your mental health leave?",
    `Employer certification forms generally ask about how a condition affects your ability to work and how much time you need. You decide who receives your documents from LeaveBridge Health.

${NOT_ADVICE}

## What forms usually ask

The Department of Labor's model certification form asks about the medical facts that support the need for leave, the expected duration, and whether you can perform your job functions. Your employer's form may differ. Read your form before it is completed.

## What stays private

- Your screening answers, questionnaires, and clinical notes stay in your secure portal.
- We don't contact your employer unless you ask us to.
- We don't bill insurance, so no insurance claim is created.

## Questions to ask your employer

- Who will see the completed form?
- Is it kept separate from your personnel file?

Rules about how employers must handle medical information depend on federal and state law. Ask your HR team, or a lawyer, if you have concerns.`,
  ),
  resource(
    5,
    "intermittent-leave-for-mental-health",
    "FMLA basics",
    "Intermittent leave for mental health: how it works",
    `Intermittent leave lets you take time off in separate periods, such as days when symptoms flare, instead of one block. A clinician documents what is clinically supported, which may differ from what you request.

${NOT_ADVICE}

## Types of leave

- **Continuous leave:** one block of time away from work.
- **Intermittent leave:** time off in separate periods as needed.
- **Reduced schedule:** working fewer hours per day or week.

## What a form may ask

Forms for intermittent leave usually ask for an estimate of how often episodes may happen and how long each may last. These are clinical estimates, not promises.

## Recertification

Employers can ask for recertification in some situations. LeaveBridge Health offers a separate recertification visit and follow-up forms, priced on our [pricing page](/pricing).`,
  ),
  resource(
    6,
    "before-you-pay-for-an-online-assessment",
    "Getting started",
    "What to check before paying for an online leave assessment",
    `Before paying for any online mental-health leave assessment, check that a licensed clinician will assess you, that your employer accepts that provider type, and that the price is clear. Avoid services that guarantee approval.

${NOT_ADVICE}

## A short checklist

- **A real assessment.** A licensed clinician should evaluate you, and may decide documentation isn't supported.
- **Licensed where you are.** The clinician must be licensed in the state where you are located during the visit.
- **Accepted by your employer.** Ask your HR team which provider types they accept. See [who can complete FMLA paperwork](/resources/who-can-complete-fmla-forms).
- **A clear price.** Look for one flat fee, with no subscription and clear refund rules.
- **No guarantees.** No honest service can promise that your leave will be approved.
- **A way to reach people.** Make sure you can contact the team if your employer asks for clarification.
- **Privacy.** Find out what is shared and with whom.`,
  ),
];

const state = (order: number, slug: string, title: string, body: string): ContentSeed => ({
  kind: "state",
  key: `state.${slug}`,
  title,
  body,
  reviewTag: "STATE_RULE_REQUIRED",
  order,
});

/** State pages exist only for states with real state-specific content and a configured jurisdiction. */
export const STATE_PAGES: ContentSeed[] = [
  state(
    0,
    "georgia",
    "Mental health leave assessments in Georgia",
    `LeaveBridge Health clinicians authorized to practice in Georgia can assess adults located in Georgia at the time of their visit. Here is what is specific to Georgia.

${NOT_ADVICE}

## Leave in Georgia

Georgia does not have a state paid family or medical leave program for private-sector workers, so most rely on federal FMLA, if eligible, and their employer's own policies.

## Authorized where you are

Your clinician practices in Georgia under a Counseling Compact privilege to practice, which is based on their home-state license in Tennessee. You must be physically located in Georgia during your visit.

## Crisis support in Georgia

- Call or text **988**, the Suicide and Crisis Lifeline, available 24/7.
- Georgia Crisis and Access Line: [1-800-715-4225](tel:18007154225).
- In an emergency, call [911](tel:911).`,
  ),
  state(
    1,
    "mississippi",
    "Mental health leave assessments in Mississippi",
    `LeaveBridge Health clinicians licensed in Mississippi can assess adults located in Mississippi at the time of their visit. Here is what is specific to Mississippi.

${NOT_ADVICE}

## Leave in Mississippi

Mississippi does not have a state paid family or medical leave program, so most private-sector workers rely on federal FMLA, if eligible, and their employer's own policies.

## State employees

Mississippi state employee leave rules include their own documentation requirements for illness absences, which may name the type of provider who must certify. If you work for the State of Mississippi, ask your agency's HR office which provider types it accepts before you pay.

## Licensed where you are

Your clinician must be licensed in Mississippi, and you must be physically located in Mississippi during your visit.

## Crisis support in Mississippi

- Call or text **988**, the Suicide and Crisis Lifeline, available 24/7.
- Mississippi Department of Mental Health helpline: [1-877-210-8513](tel:18772108513).
- In an emergency, call [911](tel:911).`,
  ),
  state(
    2,
    "tennessee",
    "Mental health leave assessments in Tennessee",
    `LeaveBridge Health clinicians licensed in Tennessee can assess adults located in Tennessee at the time of their visit. Here is what is specific to Tennessee.

${NOT_ADVICE}

## Leave in Tennessee

Tennessee does not have a state paid family or medical leave program for private-sector workers, so most rely on federal FMLA, if eligible, and their employer's own policies.

## Licensed where you are

Your clinician must be licensed in Tennessee, and you must be physically located in Tennessee during your visit.

## Crisis support in Tennessee

- Call or text **988**, the Suicide and Crisis Lifeline, available 24/7.
- Tennessee Statewide Crisis Line: [855-274-7471](tel:18552747471).
- In an emergency, call [911](tel:911).`,
  ),
];
