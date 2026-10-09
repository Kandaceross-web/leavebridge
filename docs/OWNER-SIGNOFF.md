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
| 2 | CLN-01 | If someone signals danger to themselves or others, the site stops, shows crisis lines, and alerts the clinical team. Is that the emergency process you want? | As described | |
| 3 | CLN-02 | Crisis resources shown: 988, 911, nearest ER, MS DMH helpline and TN statewide crisis line. Keep these? | As listed | |
| 4 | CLN-03 | Are the screening questions and the rules for "we can help / needs review / can't help" right? | Conservative v1 ruleset | |
| 5 | CLN-12 | Should forms let you write a diagnosis, given your LPC scope in MS and TN? | No diagnosis field; findings are free text | |
| 6 | STR-01 | Will you look up and record your MS and TN license numbers (and any compact privileges) from the state boards before launch? | Entered by hand with who verified and when | |
| 7 | SEC-01 | Sign-in: passwords plus an authenticator app for staff, re-confirm before signing documents, sign out after 15 minutes idle (staff) and 30 (patients). Keep? | As described | |
| 8 | SEC-02 | Health data is encrypted and each person only sees their own records (checked by the database itself). Accept this design? | As described; automated check runs every release | |
| 9 | LEG-02 | What business name and entity will patients pay, and what should appear on card statements? | "Professional assessment service" | |
| 10 | LEG-03 | Will you operate as a HIPAA covered entity and publish a Notice of Privacy Practices you approve? | Built as if HIPAA applies; NPP placeholder | |
| 11 | LEG-04 | Approve the consent documents' wording (you'll get each one to read). | Placeholders | |
| 12 | LEG-05 | Approve the public copy and status labels (no outcome promises)? | Neutral labels | |
| 13 | LEG-06 / SEC-04 / CLN-06 | Keep AI drafting turned off at launch? | Off | |
| 14 | LEG-07 | Patients send their own documents to employers; LeaveBridge doesn't send them. Keep for launch? | External sending off | |
| 15 | LEG-08 | Show the price before payment and not issue a separate Good Faith Estimate document. Accept? | Price shown before payment | |
| 16 | LEG-09 / OWN-07 | Approve the refund rules (full refund before intake is submitted; partial after). | Placeholder policy | |
| 17 | LEG-10 / SEC-07 | Delete screening answers from people who never sign up after 30 days. Keep? | 30 days | |
| 18 | LEG-11 | Require a photo ID upload reviewed by staff. Keep? | Required | |
| 19 | LEG-12 / SEC-05 | Card details stay with the payment processor; it only sees a neutral description. Accept? | As described | |
| 20 | LEG-13 | Emails only say "something is waiting in your portal"; texts off unless the patient opts in. Keep? | As described | |
| 21 | LEG-14 | No ad pixels or third-party cookies; only optional privacy-friendly analytics on marketing pages. Keep? | No analytics configured | |
| 22 | LEG-15 | Approve Terms of Use and Privacy Policy text (you'll get drafts). | Placeholders | |
| 23 | LEG-16 | Patients consent by typing their name; you sign by re-confirming your identity. Accept these e-signatures? | As described | |
| 24 | LEG-17 | Approve the FAQ and the six guides that mention FMLA rules. | Drafts, tagged | |
| 25 | LEG-19 | Have you checked that "LeaveBridge Health" is free to use as a name? | Working name | |
| 26 | LEG-20 / SEC-16 | Approve a short breach and incident plan (who you notify and when). | Not written | |
| 27 | CLN-04 | Approve the intake questions. | Intake v1 | |
| 28 | CLN-05 | Use the PHQ-9 and GAD-7, with scores shown only to you. | On | |
| 29 | CLN-07 | Patients can message you through a secure thread that isn't monitored in real time. Keep? | As described | |
| 30 | CLN-09 | Who can see all cases and reassign them (clinical director)? | Directors see all | |
| 31 | CLN-10 | You write the outcome message to each patient yourself, no canned text. Keep? | As described | |
| 32 | CLN-11 | Assessment video visits are 50 minutes. Keep? | 50 minutes | |
| 33 | CLN-13 | Patients confirm their location every time they join a video visit. Keep? | As described | |
| 34 | CLN-14 | Approve the document templates (continuous, intermittent, reduced schedule, summary letter). | Drafts | |
| 35 | STR-02 | Recheck your license is current at booking, at the visit and at signing. Keep? | As described | |
| 36 | STR-03 | Block a visit when the patient's location doesn't match a state you're licensed in. Keep? | As described | |
| 37 | STR-04 | Approve MS and TN telehealth consent wording. | Not written | |
| 38 | STR-05 | Keep clinical and audit records for 7 years? | 7 years | |
| 39 | STR-06 | Approve the mandatory reporting and duty-to-warn notice in consent. | Not written | |
| 40 | SEC-03 | Emergency access to a case needs a reason and a second person's approval. With one clinician, should you be able to approve your own? | Second approver required | |
| 41 | SEC-06 | Uploads limited to 15 MB PDF, JPG or PNG, virus-scanned. Keep? | As described | |
| 42 | SEC-08 | Which video service will you use? | None chosen | |
| 43 | SEC-11 / SEC-12 | No third-party error monitoring; logs only keep fields on an allow-list. Keep? | As described | |
| 44 | SEC-13 | Audit log can't be edited and is checked for tampering. Accept? | As described | |
| 45 | SEC-15 | HIPAA expects a written security risk analysis. Will you sign the one generated from this build's controls? | Not done | |
| 46 | OWN-25 | No referral fees, credits or commissions to anyone, ever (ACA A.10.b). Keep that stated on the therapist page? | Stated | |
| 47 | OWN-25 | The therapist page says you may ask a referring therapist for treatment history, only with the client's written authorization. Keep? | As described | |
| 48 | OWN-25 | Add an optional "email me a link to continue" box for people who finish screening but don't sign up? | Not built | |
