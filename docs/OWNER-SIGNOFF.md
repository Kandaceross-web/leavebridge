# Owner sign-off questions

The owner (Zxryeni, the launch clinician) waived outside legal and security review on 2026-10-08. Each row in
`docs/OPEN-DECISIONS.md` marked LEG, CLN, STR or SEC now closes when the owner answers its question below. Questions are
asked one at a time in the project thread, in this order (production blockers first). Most can be answered "keep it" because
the build already has a safe default; any other answer becomes a change request.

An answer records the owner's decision and accepted risk. It is not a legal opinion or a security audit.

When a question is answered: record the answer and date in the Answer column, change the matching row's Status in
OPEN-DECISIONS to `Closed (date, Zxryeni, owner sign-off; outside review waived)`, and clear the matching review tags (in
the seed config for development, and in Admin → Compliance reviews for production, logging an "owner" review).

Three rows are not on this list because they need evidence, not an answer: SEC-09 (signed AWS BAA), SEC-10 (restore drill)
and SEC-14 (penetration test of sign-in and access control).

| # | Row | Question in plain language | Built default | Answer |
| --- | --- | --- | --- | --- |
| 1 | LEG-01 | Federal FMLA rules don't name LPCs as providers whose forms employers must accept. Do you accept that some employers may refuse your forms, and keep the site telling people to check with HR before paying? | Copy tells people to check first; screening flags employers that restrict provider types for review | **Signed off 2026-10-08:** "I can sign off there is a statement on fmla forms federally that covers us" (29 CFR 825.125(b)(4)). Check-with-HR copy kept. |
| 2 | CLN-01 | If someone signals danger to themselves or others, the site stops, shows crisis lines, and alerts the clinical team. Is that the emergency process you want? | As described | **Signed off 2026-10-09:** "Keep it" (decision card). |
| 3 | CLN-02 | Crisis resources shown: 988, 911, nearest ER, MS DMH helpline and TN statewide crisis line. Keep these? | As listed | **Signed off 2026-10-09:** "Keep them" (decision card). |
| 4 | CLN-03 | Are the screening questions and the rules for "we can help / needs review / can't help" right? | Conservative v1 ruleset | **Signed off 2026-10-09:** "Keep them" (decision card). Seed ruleset tag cleared. |
| 5 | CLN-12 | Should forms let you write a diagnosis, given your LPC scope in MS and TN? | No diagnosis field; findings are free text | **Signed off 2026-10-09:** "Keep it" (decision card). |
| 6 | STR-01 | Will you look up and record your MS and TN license numbers (and any compact privileges) from the state boards before launch? | Entered by hand with who verified and when | **Signed off 2026-10-09:** "Yes, before launch" (decision card). |
| 7 | SEC-01 | Sign-in: passwords plus an authenticator app for staff, re-confirm before signing documents, sign out after 15 minutes idle (staff) and 30 (patients). Keep? | As described | **Signed off 2026-10-09:** "Keep it" (decision card). |
| 8 | SEC-02 | Health data is encrypted and each person only sees their own records (checked by the database itself). Accept this design? | As described; automated check runs every release | **Signed off 2026-10-09:** "Accept it" (decision card). |
| 9 | LEG-02 | What business name and entity will patients pay, and what should appear on card statements? | "Professional assessment service" | **Signed off 2026-10-09:** "defining you therapeutic services for now and ill change once I get the payment and everything set up." Patients pay Defining You Therapeutic Services for now; the card statement descriptor is set in Stripe when the account is created (OWN Stripe setup) and stays neutral. Revisit when the owner sets up the payment entity. |
| 10 | LEG-03 | Will you operate as a HIPAA covered entity and publish a Notice of Privacy Practices you approve? | Built as if HIPAA applies; NPP placeholder | **Signed off 2026-10-09:** "Yes, follow HIPAA" (decision card). Built as if HIPAA applies; the Notice of Privacy Practices text is drafted for the owner to approve with the other policy documents (Q22). |
| 11 | LEG-04 | Approve the consent documents' wording (you'll get each one to read). | Placeholders | |
| 12 | LEG-05 | Approve the public copy and status labels (no outcome promises)? | Neutral labels | |
| 13 | LEG-06 / SEC-04 / CLN-06 | Keep AI drafting turned off at launch? | Off | **Signed off 2026-10-09:** "Keep it off" (decision card). |
| 14 | LEG-07 | Patients send their own documents to employers; LeaveBridge doesn't send them. Keep for launch? | External sending off | **Signed off 2026-10-09:** "Patients send them" (decision card). |
| 15 | LEG-08 | Show the price before payment and not issue a separate Good Faith Estimate document. Accept? | Price shown before payment || **Answered 2026-10-09:** "Add the estimate" (decision card). Build a written Good Faith Estimate in the portal before payment; LEG-08 stays open until it is built. |
| 16 | LEG-09 / OWN-07 | Approve the refund rules (full refund before intake is submitted; partial after). | Placeholder policy | **Signed off 2026-10-09:** "Full until review" (decision card): 100% refund until the clinician starts review; 0% for no-show, late cancel (<24h) and after determination; 100% if out of scope or emergency-routed. Settings default updated. |
| 17 | LEG-10 / SEC-07 | Delete screening answers from people who never sign up after 30 days. Keep? | 30 days | **Signed off 2026-10-09:** "30 days" (decision card). |
| 18 | LEG-11 | Require a photo ID upload reviewed by staff. Keep? | Required | **Signed off 2026-10-09:** "Keep ID check" (decision card). |
| 19 | LEG-12 / SEC-05 | Card details stay with the payment processor; it only sees a neutral description. Accept? | As described | **Signed off 2026-10-09:** "Keep it" (decision card). |
| 20 | LEG-13 | Emails only say "something is waiting in your portal"; texts off unless the patient opts in. Keep? | As described | **Signed off 2026-10-09:** "Keep it" (decision card). |
| 21 | LEG-14 | No ad pixels or third-party cookies; only optional privacy-friendly analytics on marketing pages. Keep? | No analytics configured | **Signed off 2026-10-09:** "No pixels" (decision card); no analytics script configured. |
| 22 | LEG-15 | Approve Terms of Use, Privacy Policy and Notice of Privacy Practices text (you'll get drafts). | Placeholders | |
| 23 | LEG-16 | Patients consent by typing their name; you sign by re-confirming your identity. Accept these e-signatures? | As described | **Signed off 2026-10-09:** "Accept them" (decision card). |
| 24 | LEG-17 | Approve the FAQ and the six guides that mention FMLA rules. | Drafts, tagged | |
| 25 | LEG-19 | Have you checked that "LeaveBridge Health" is free to use as a name? | Working name | **Signed off 2026-10-09:** "Already checked" (decision card): owner checked the name is clear. |
| 26 | LEG-20 / SEC-16 | Approve a short breach and incident plan (who you notify and when). | Not written | |
| 27 | CLN-04 | Approve the intake questions. | Intake v1 | |
| 28 | CLN-05 | Use the PHQ-9 and GAD-7, with scores shown only to you. | On | **Signed off 2026-10-09:** "Show patients too" (decision card). Patients see their own total score ("Your score: N out of M") with a note that the clinician interprets it; severity bands stay clinician-only. |
| 29 | CLN-07 | Patients can message you through a secure thread that isn't monitored in real time. Keep? | As described | **Signed off 2026-10-09:** "Keep it" (decision card). |
| 30 | CLN-09 | Who can see all cases and reassign them (clinical director)? | Directors see all | **Signed off 2026-10-09:** "Just me" (decision card): the owner is the only clinical director at launch. |
| 31 | CLN-10 | You write the outcome message to each patient yourself, no canned text. Keep? | As described || **Answered 2026-10-09:** "Add starter text" (decision card). Editable starting points per determination added (setting `outcomeStarters`); recording is refused while bracketed parts remain. CLN-10 stays open until the owner approves the starter wording (signoff/drafts/outcome-starters.md). |
| 32 | CLN-11 | Assessment video visits are 50 minutes. Keep? | 50 minutes | **Signed off 2026-10-09:** "30 minutes" (decision card). Seed catalog set to 30; on an existing database, change it in Admin -> Services. |
| 33 | CLN-13 | Patients confirm their location every time they join a video visit. Keep? | As described | **Signed off 2026-10-09:** "Keep it" (decision card): patients confirm their state before every visit. |
| 34 | CLN-14 | Approve the document templates (continuous, intermittent, reduced schedule, summary letter). | Drafts | |
| 35 | STR-02 | Recheck your license is current at booking, at the visit and at signing. Keep? | As described | **Signed off 2026-10-09:** "Signing only" (decision card). License expiry is now checked only before signing (and at determination/assignment, unchanged); booking and visit join still require an active license matching the patient's state but skip the expiry date. |
| 36 | STR-03 | Block a visit when the patient's location doesn't match a state you're licensed in. Keep? | As described | **Signed off 2026-10-09:** "Keep the block" (decision card). |
| 37 | STR-04 | Approve MS and TN telehealth consent wording. | Not written | |
| 38 | STR-05 | Keep clinical and audit records for 7 years? | 7 years | **Signed off 2026-10-09:** "7 years" (decision card). Owner to confirm the MS and TN board minimums are not longer. No automatic deletion of clinical records exists yet; it must be built before records reach 7 years. |
| 39 | STR-06 | Approve the mandatory reporting and duty-to-warn notice in consent. | Not written | |
| 40 | SEC-03 | Emergency access to a case needs a reason and a second person's approval. With one clinician, should you be able to approve your own? | Second approver required | **Signed off 2026-10-09:** "Allow self-approval" (decision card). An approver can approve their own break-glass request with a written reason; the audit event is marked selfApproved and needsReview, and the access page labels it self-approved. Setting: security.allowSelfApprovedAccess (on). |
| 41 | SEC-06 | Uploads limited to 15 MB PDF, JPG or PNG, virus-scanned. Keep? | As described | **Signed off 2026-10-09:** "Keep it" (decision card). Uploads stay 15 MB, PDF/JPG/PNG only. ClamAV must be running on AWS before launch (not set up yet). |
| 42 | SEC-08 | Which video service will you use? | None chosen | **Signed off 2026-10-09:** "Amazon video (built in)" (decision card). Visits run in the portal on Amazon Chime SDK under the AWS BAA. Build in progress. |
| 43 | SEC-11 / SEC-12 | No third-party error monitoring; logs only keep fields on an allow-list. Keep? | As described |  **Signed off 2026-10-09:** "Add Sentry" (decision card). Errors also go to Sentry, only after Sentry signs a BAA (business plan), with PHI scrubbed before sending. Build in progress; the log allow-list stays. |
| 44 | SEC-13 | Audit log can't be edited and is checked for tampering. Accept? | As described | |
| 45 | SEC-15 | HIPAA expects a written security risk analysis. Will you sign the one generated from this build's controls? | Not done | |
| 46 | OWN-25 | No referral fees, credits or commissions to anyone, ever (ACA A.10.b). Keep that stated on the therapist page? | Stated | |
| 47 | OWN-25 | The therapist page says you may ask a referring therapist for treatment history, only with the client's written authorization. Keep? | As described | |
| 48 | OWN-25 | Add an optional "email me a link to continue" box for people who finish screening but don't sign up? | Not built | |
