# LeaveBridge Health: Search Demand and Customer Language Research

> Note (2026-10-09): written before the owner set the price to $279.99 with recertification at $119.99 and follow-up forms at $9.99, and before the owner (an LPC licensed in MS and TN) signed off on LPC certification under 29 CFR 825.125(b)(4). References to $275 or to MS needing a clinician predate those decisions. The compact research (compact-states.md) later found Tennessee went live in the Counseling Compact in September 2026; Mississippi is not live yet.

Prepared 2026-10-08. Scope: a US self-pay ($275) telehealth mental-health leave assessment, in which a licensed clinician decides independently whether leave documentation is clinically supported. Markets of interest: Mississippi (MS) and Tennessee (TN).

## Method and limits

- **No keyword-volume data was used.** Nothing in this report is a search volume. Where demand is discussed, the evidence is qualitative.
- **Google Trends** returned `ROBOTS_DISALLOWED` and could not be fetched. No Trends data appears here.
- **Google autocomplete** (`suggestqueries.google.com`, client=firefox) could be fetched. Autocomplete shows that a query string is common enough for Google to suggest it. It does not show volume, and results vary by location and time. All autocomplete strings below were captured on 2026-10-08 from a US-located fetch.
- **Reddit** could not be fetched directly. Reddit threads were read through mirrors (reddit.sentinel-team.org snapshots and a redlib instance) that link to the original reddit.com URLs. Much of the richest first-person language came from Blind (teamblind.com) and Fishbowl. Those users skew toward tech and professional workers, a sampling bias to keep in mind for MS and TN.
- **Evidence labels:** OBSERVED = seen at a URL. SUPPORTED = several sources agree. INFERRED = my reasoning from observed facts. HYPOTHESIS = needs testing.
- **Legal claims** are flagged "needs legal review." Nothing here is a legal conclusion.

Autocomplete sources, cited once and referred to below as "[AC: seed]". Each URL has the form `https://suggestqueries.google.com/complete/search?client=firefox&q=<seed>`. Seeds used: `fmla for anxiety`, `fmla for depression`, `fmla paperwork`, `stress leave`, `stress leave doctor`, `mental health leave`, `short term disability for`, `doctors note for`, `doctors note for anxiety`, `online fmla`, `fmla doctor near me`, `intermittent fmla for`, `can my therapist fill out`, `will my employer know`, `how to get fmla for`, `fmla denied`, `what to say to doctor to get`, `fmla mississippi`, `fmla tennessee`, `fmla memphis`, `fmla nashville`, `fmla jackson ms`, `mental health leave tennessee`, `mental health leave mississippi`, `stress leave tennessee`.

---

## 1. Demand clusters

| # | Cluster | Intent | Example queries and phrases actually seen | Source / label |
|---|---|---|---|---|
| 1 | **"Can I get FMLA for anxiety/depression?"** | Informational / problem-aware | "fmla for anxiety", "fmla for anxiety and depression", "fmla for anxiety and panic attacks", "fmla for anxiety and stress", "fmla for anxiety and ptsd", "fmla for anxiety and adhd", "fmla for depression", "fmla for grief depression", "fmla for depression after death", "family medical leave for depression" | OBSERVED [AC: fmla for anxiety], [AC: fmla for depression] |
| 2 | **How-to and "what do I say to my doctor"** | Problem-aware, close to solution-aware | "how to get fmla for mental health", "how to get fmla for stress and anxiety", "how to get fmla for anxiety and depression", "what to say to doctor to get stress leave", "what to say to doctor to get fmla for anxiety", "what do i tell my doctor to get fmla", "how do i get fmla from my doctor" | OBSERVED [AC: how to get fmla for], [AC: what to say to doctor to get], [AC: fmla doctor near me] |
| 3 | **Stress leave** | Problem-aware | "stress leave from work", "stress leave from work paid", "stress leave fmla", "what qualifies for stress leave", "do you get paid for a stress leave", "does stress leave have to be work related". Note: many stress-leave suggestions are California-specific ("stress leave california paid"), reflecting CA SDI. | OBSERVED [AC: stress leave], [AC: stress leave tennessee] |
| 4 | **Finding a provider who will complete leave forms** | Provider-seeking / local | "fmla doctor near me", "fmla clinic near me", "fmla paperwork doctor near me", "same day fmla doctor near me", "stress leave doctor near me", "stress leave doctor online", "doctors note for work online" | OBSERVED [AC: fmla doctor near me], [AC: stress leave doctor], [AC: doctors note for] |
| 5 | **Online FMLA services** | Solution-aware / transactional / comparison | "online fmla doctor", "online fmla doctor reddit", "online fmla paperwork", "online fmla certification", "online fmla certification reddit", "online fmla approval" | OBSERVED [AC: online fmla]. The "reddit" variants suggest people check legitimacy before buying (INFERRED). |
| 6 | **Intermittent leave** | Solution-aware | "intermittent fmla for mental health", "intermittent fmla for anxiety", "intermittent fmla for depression", "intermittent fmla form" | OBSERVED [AC: intermittent fmla for], [AC: fmla for depression] |
| 7 | **Short-term disability for mental health** | Problem-aware / solution-aware | "short term disability for mental health", "short term disability for depression", "short term disability for anxiety", "mental health leave of absence short-term disability", "fmla denied but std approved" | OBSERVED [AC: short term disability for], [AC: mental health leave], [AC: fmla denied] |
| 8 | **Who can sign: therapist, psychiatrist, PCP** | Problem-aware (blocked) | "can my therapist fill out fmla paperwork", "can my therapist fill out short term disability paperwork", "can my therapist fill out ada paperwork", "can my psychiatrist fill out fmla paperwork". Blind thread title: "can my therapist sign the fmla forms". | OBSERVED [AC: can my therapist fill out]; https://www.teamblind.com/post/can-my-therapist-sign-the-fmla-forms-v5dpyx7g |
| 9 | **Doctor's note or sick note for anxiety** | Mixed: solution-aware plus low-value | "doctors note for anxiety at work", "doctor's note for anxiety and depression", "sick note for anxiety and stress", "doctor's note for anxiety to work from home" (an accommodation, not leave), "doctors note for anxiety jury duty" (off-target) | OBSERVED [AC: doctors note for anxiety] |
| 10 | **Fake or template notes** | **Low-value / reputational risk** | "doctors note for work template", "doctors note for work free", "stress leave doctor's note sample" | OBSERVED [AC: doctors note for], [AC: stress leave doctor]. Do not target. |
| 11 | **Denied or problem certification** | Urgent / problem-aware | "fmla denied", "fmla denied by employer", "fmla denied reddit", "fmla denied now what". Deadline posts: "I have roughly 2 weeks to submit the documentation for FMLA" (Blind); "deadline is Friday" (r/mentalhealth, paraphrased by the mirror). | OBSERVED [AC: fmla denied]; https://www.teamblind.com/post/how-to-find-doctor-for-fmla-for-amazon-tzscfr42 ; https://reddit.com/r/mentalhealth/comments/1u7y0rh/fmla_help_with_provider/ |
| 12 | **Employer-specific leave** | Informational / local | "mental health leave amazon", "mental health leave walmart", "fmla city of memphis", "metro nashville fmla policy", "fmla mississippi state university". Blind: "how to find doctor for fmla for amazon". | OBSERVED [AC: mental health leave], [AC: fmla memphis], [AC: fmla nashville], [AC: fmla mississippi] |
| 13 | **State-law leave lookups (MS/TN)** | Informational / local | MS: "mississippi fmla laws", "mississippi fmla paperwork", "mississippi fmla requirements", "intermittent fmla mississippi", "fmla mississippi maternity leave". TN: "fmla tennessee rules", "fmla tennessee pay", "fmla tennessee 16 weeks", "do you get paid for fmla in tennessee", "how does fmla work in tn", "fmla stress leave tennessee". | OBSERVED [AC: fmla mississippi], [AC: fmla tennessee], [AC: fmla memphis], [AC: stress leave tennessee] |
| 14 | **Privacy: will my boss know the diagnosis?** | Problem-aware (fear) | Blind title: "does amazon dls share fmla diagnosis or the type of medical loa with the manager". r/fednews: "Will submitting an FMLA request for burnout negatively impact my career?" Autocomplete for "will my employer know" returned no health-related completions. | OBSERVED https://www.teamblind.com/post/does-amazon-dls-share-fmla-diagnosis-or-the-type-of-medical-loa-with-the-manager-c4thdyya ; https://reddit.com/r/fednews/comments/1t9rhkd/will_submitting_an_fmla_request_for_burnout/ ; [AC: will my employer know] |
| 15 | **Burnout leave** | Problem-aware | "how does one successfully use fmla to take much needed mental break" (Blind), "advice for taking a burnout leave" (Elpha), "has anyone gone on short term leave to help manage their mental health and recoup… burnout" (Fishbowl) | OBSERVED https://www.teamblind.com/post/how-does-one-successfully-use-fmla-to-take-much-needed-mental-break-fkglx772 ; https://elpha.com/posts/ajbb3lbt/advice-for-taking-a-burnout-leave ; https://www.fishbowlapp.com/post/has-anyone-gone-on-short-term-leave-to-help-manage-their-mental-health-and-recoup-ive-felt-burnout-coming-for-months-and |
| 16 | **Crisis-adjacent** | Urgent (not a fit) | r/fednews poster mentions "some pretty dark thoughts". Blind commenter describes citing "suicidal thoughts and tendencies". | OBSERVED (URLs above and https://www.teamblind.com/post/therapists-who-would-support-fmla-ecxm758z). The service is not urgent care, so pages need 988 routing (INFERRED). |
| 17 | **"Mental health leave" + MS/TN** | Local | "mental health leave mississippi", "mental health leave tennessee", "fmla jackson ms": **autocomplete returned no suggestions** | OBSERVED [AC: those seeds]. Suggests thin long-tail state demand for this phrasing (INFERRED). |

HYPOTHESIS queries, not observed and needing testing: "fmla paperwork without a regular doctor", "mental health leave evaluation online", "fmla certification for anxiety telehealth tennessee", "psychiatrist fill out fmla memphis".

**Underlying demand: public data**
- Mental and physical conditions can be FMLA serious health conditions. Chronic conditions such as "anxiety, depression, or dissociative disorders" can qualify. "A diagnosis is not required" on the certification. OBSERVED, DOL Fact Sheet #28O: https://www.dol.gov/agencies/whd/fact-sheets/28o-mental-health
- 15% of employees took FMLA-qualifying leave in the prior 12 months. 51% of leaves were for the employee's own illness. OBSERVED, DOL 2018 FMLA survey: https://www.dol.gov/resource-library/employee-and-worksite-perspectives-family-and-medical-leave-act-2018-employee
- 7% reported unmet leave need. 45% of those feared losing their job, and 35% feared different treatment or lost advancement. About 56% of employees are FMLA-eligible, and only 38% of those earning under $15/hour. OBSERVED, CLASP summary of the DOL 2018 survey: https://www.clasp.org/publications/fact-sheet/new-fmla-data-need-paid-leave/
- Short-term disability access (March 2026): 52% of full-time and 19% of part-time private-industry workers. OBSERVED, BLS: https://www.bls.gov/charts/employee-benefits/percent-access-benefits-by-work-status.htm
- Mental-health leaves rose about 300% from 2019 to 2024 and were flat from 2023 to 2024 (ComPsych, 6M+ lives). They were 11% of all leaves in Q1 2024, and women took 69–71% of them. SUPPORTED: https://www.businesswire.com/news/home/20250910175522/en/ComPsych-Data-Uncovers-a-New-Normal-in-Employee-Leaves-Since-the-COVID-19-Pandemic ; https://www.compsych.com/press-release/mental-health-leaves-of-absence-continue-to-proliferate-among-u-s-workers-according-to-new-compsych-data/ ; https://www.entrepreneur.com/business-news/the-number-of-workers-taking-mental-health-leaves-has-risen/497040
- Employers report an "influx of leave and accommodation requests tied to mental health." OBSERVED, Littler 2026 survey coverage: https://www.littler.com/press/news/mental-health-leave-requests-are-rising-survey-says

---

## 2. Customer language

### How people describe the problem (OBSERVED)
- "I’m so exhausted and was diagnosed with anxiety and depression a few months ago by a licensed therapist… I feel like a desperately need some time to sleep, care for myself, focus on therapy, just be a ‘normal’ person a few hours a day…" https://www.teamblind.com/post/how-do-i-talk-to-my-doctor-about-supporting-time-off-hoidgqtf
- "I am in extreme stress, anxiety and depression." https://www.teamblind.com/post/how-to-find-doctor-for-fmla-for-amazon-tzscfr42
- "My mental state is the worst it has been." https://www.teamblind.com/post/therapists-who-would-support-fmla-ecxm758z
- "Thanks to a toxic boss, my job has been beyond stressful, and it's caused me to become both depressed and anxious." https://www.boston.com/uncategorized/jobs/2024/09/04/due-to-mental-health-issues-caused-by-my-workplace-im-seriously-considering-taking-fmla-leave-and-prioritizing-my-health/
- Running on fumes, once loved the job, guilt about taking leave (paraphrased by the mirror). https://reddit.com/r/fednews/comments/1t9rhkd/will_submitting_an_fmla_request_for_burnout/
- Near-daily panic attacks (paraphrased by the mirror). https://reddit.com/r/mentalhealth/comments/1u7y0rh/fmla_help_with_provider/

### What they call the service (OBSERVED unless marked)
- "FMLA paperwork", "FMLA forms", "sign off", "a note", "written note to substantiate time off" (Blind, above)
- "approve mental health leave", "approval for mental health leave (under FMLA)", "a therapist that has granted your leave". https://reddit.com/r/sanfrancisco/comments/1q4zz80/psychiatrist_in_sf_who_will_approve_mental_health/ . **The language of "approval" and "granting" is a risk for LeaveBridge.** Users expect a purchase to produce an approval (INFERRED).
- "doctors/therapists… who would support FMLA" (Blind): users say "support", which fits the "clinically supported" framing better.
- "stress leave", "mental health leave of absence", "short term disability for depression/anxiety", "doctor's note for anxiety", "sick note for anxiety", "intermittent FMLA" [AC above]
- "burnout leave", "mental break" (Elpha, Blind above)

### Fears
- **Not being taken seriously / looking like a form-seeker:** "I’m scared they won’t take me seriously." (Blind hoidgqtf) and "they might think that I am doing this only for the sign off and they might refuse the appointment." (Blind tzscfr42). OBSERVED.
- **Losing money and time to a deadline:** "I will be in trouble losing out on money and the time of 2 weeks." (Blind tzscfr42). OBSERVED.
- **No regular doctor:** "I don't have a Primary Care Physician." (Blind tzscfr42). The employer requires a PCP signature and the poster has none (r/mentalhealth 1u7y0rh, paraphrased). OBSERVED. SUPPORTED as a recurring blocker.
- **Existing clinician refuses:** "My PCP declined to support me." (Blind ecxm758z). Teladoc is "worthless to help" (r/sanfrancisco). OBSERVED.
- **Providers won't certify new patients:** "Most psychiatrists I know (I'm a psychologist) won't complete this for a new patient." "you need to be a patient for at least 6 months." "Most doctors will require you to have been in treatment with them for more than one session." (r/sanfrancisco 1q4zz80). OBSERVED. SUPPORTED. **This is a direct objection to a one-visit model, because clinicians themselves doubt one-visit certification.**
- **Retaliation and career damage:** the r/fednews title itself; job "on the path to getting fired" (Blind ecxm758z); laid off after returning from a 9-month leave, "proceed with caution" (r/sanfrancisco). 45% of people with unmet need fear job loss (DOL via CLASP). SUPPORTED.
- **Diagnosis disclosure:** "Is the type of Medical LOA shared with the manager? (I.e., Surgery v. Mental Health?)" (Blind c4thdyya). OBSERVED.
- **Insurance record:** "Do not run any of this through your insurance… you don't want this to ever be held against you later." (Blind ecxm758z). OBSERVED. **This supports a self-pay positioning** (INFERRED).
- **Cost:** "They'll meet you for 15 mins then charge $300 to your insurance." (Blind tzscfr42). OBSERVED. **This is a reference price close to $275** (INFERRED).
- **Guilt toward colleagues:** "feel bad about 1) leaving my colleagues alone to cover for me" (Boston.com). OBSERVED.

### Confusions
- **Who may sign:** "I think you need paperwork from therapist and not your doctor" versus "In my state, the written documentation needs to come from a medical doctor or psychiatrist" (Blind hoidgqtf). "LMFT's can do standard notes for work, but usually need an MD for any state disability benefits." (r/sanfrancisco). "Therapist's note will get the process started but at some point it won't be enough." (Blind tzscfr42). OBSERVED.
  - Fact: FMLA's "health care provider" definition names physicians, clinical psychologists, clinical social workers, NPs and PAs. **LPCs and LMFTs are not named.** They count only if the employer or plan accepts their certification. https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-C/part-825/subpart-A/section-825.125 . OBSERVED. Implications for LeaveBridge's clinician mix need legal review.
- **Whether burnout qualifies:** "burn out (as a diagnosis) is unlikely to qualify but similar diagnoses do" (Blind hoidgqtf). OBSERVED.
- **Pay:** "Do you get paid when you take this fmla leaves?" (Blind) and "do you get paid for fmla in tennessee" [AC: fmla memphis]. OBSERVED. FMLA itself is unpaid.
- **How to fill out the form:** "I have no idea how to fill it out… My therapist and doctor said to check which ever box I wanted." https://redlib.belloworld.it/r/MentalHealthSupport/comments/1dum2q3/fmla_paperwork (r/MentalHealthSupport, Jul 2024). OBSERVED.
- **Eligibility:** "make sure you are eligible, sometimes you have to work there a year first" https://www.fishbowlapp.com/post/how-do-i-take-leave-of-absence-for-stress-and-mental-health-im-not-currently-on-prescription-medication . OBSERVED.
- **Whether employers accept online certifications:** "online fmla certification reddit" [AC]. A July 2026 J.J. Keller piece says employers "should accept FMLA certifications from online service providers" when they are complete and signed by a licensed provider. https://jjkellercompliancenetwork.com/news/must-employers-accept-fmla-certifications-from-online-services . OBSERVED. Needs legal review before use in copy.

### Why people hesitate (SUPPORTED unless marked)
Stigma and career fear, guilt, fear of refusal after paying, uncertainty about eligibility, not knowing who can sign, and worry about online-service legitimacy ("reddit" modifiers on "online fmla"). A Trustpilot reviewer of FMLA NOW wrote "At first I was kind of scared to use this platform." https://ie.trustpilot.com/review/fmlanow.com (OBSERVED)

### What builds trust (OBSERVED quotes; INFERRED implications)
- **Being heard:** "I finally felt seen, heard, and taken care of." (FMLA NOW Trustpilot)
- **Forms the employer accepts the first time:** "I did not have any issues with the forms my employer requested." (same)
- **Responding to employer follow-up:** the top complaint is "No one addresses the requests from my work for further information." (same). Employers may contact the provider for authentication or clarification, but never the direct supervisor, and may require second and third opinions at their own expense. https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-C/part-825/subpart-C/section-825.307 . **INFERRED: an explicit, included clarification-response service is a trust differentiator.**
- **A clean exit and real support:** complaints include "kept trying to charge me…" and "There is no number to actually speak to a live representative".
- **Privacy facts:** a supervisor "does not know the reason for your fmla unless you tell them" (r/fednews comment, paraphrased). "a diagnosis is not required" (DOL 28O). Medical records must be kept separate (DOL 28O). Content should cite DOL directly, with legal review.
- **Clinician seniority and type:** "find a psychologist and one that is older or been in practice longer" (Blind ecxm758z).
- **A balanced outcome promise:** the r/sanfrancisco thread shows clinicians distrust one-visit certification. INFERRED: honest messaging ("not everyone is supported; here is what happens if you are not") answers both clinician skeptics and employers.

---

## 3. Mississippi and Tennessee

### 3a. Evidence of demand
- **Generic FMLA-by-state demand exists in both states.** Autocomplete returns state-modified FMLA queries: "mississippi fmla laws", "mississippi fmla paperwork", "intermittent fmla mississippi", "fmla tennessee rules", "fmla tennessee 16 weeks", "do you get paid for fmla in tennessee", "fmla city of memphis", "metro nashville fmla policy", "fmla stress leave tennessee". OBSERVED [AC].
- **Mental-health-leave demand modified by MS or TN is not visible.** "mental health leave mississippi", "mental health leave tennessee" and "fmla jackson ms" returned **no** autocomplete suggestions. OBSERVED [AC]. Searches of Reddit and forums for Memphis, Nashville, Knoxville and Jackson leave threads found **no state-specific first-person posts** (OBSERVED absence). INFERRED: people in MS and TN search the generic national phrasing, and a state modifier, when used, is attached to "FMLA" law and pay questions.
- **Employers in these states with large workforces and their own leave processes** (OBSERVED lists): MS: Walmart, State of Mississippi, Toyota, North Mississippi Health Services, Nissan, Ingalls Shipbuilding, UMMC, Baptist, FedEx. https://www.redfin.com/blog/mississippi-major-industries/ . Middle TN: VUMC (32,000+), HCA (27,000+), State of Tennessee (27,000+), Nissan (11,000+), Metro Nashville Government, Amazon, Dollar General. https://www.tylercauble.com/blog/largestemployersnashville2024 . Autocomplete for "mental health leave amazon" and "mental health leave walmart" (OBSERVED) connects to these employers. INFERRED: employer-plus-leave queries are a larger opportunity than state-plus-leave queries.
- **Verdict on demand:** state-level mental-health-leave search demand is **unproven and probably small**. A state page would mostly capture "FMLA [state]" informational traffic. INFERRED.

### 3b. State facts that would make a page genuinely useful

**Mississippi**
| Fact | Source | Label |
|---|---|---|
| No state paid family or medical leave program for private employers. DOL's paid-leave page counts 13 states plus DC with programs. Mississippi advocates note 79% of MS workers lack employer paid family leave. | https://www.dol.gov/agencies/wb/featured-paid-leave ; https://www.abetterbalance.org/paid-parental-leave-for-state-employees-takes-effect-in-mississippi/ | SUPPORTED (absence). Confirm with the DOL interactive map. |
| State Employees Paid Parental Leave Act: 6 weeks for primary caregivers, effective Jan 1, 2026, about 32,000 state and university employees. It covers birth or adoption, **not the employee's own mental-health condition**. | https://wdam.com/2025/03/28/reeves-signs-mandatory-paid-parental-leave-state-employees-into-law ; https://www.wlbt.com/2025/12/31/paid-parental-leave-mississippi-state-employees-set-go-into-effect-jan-1/ ; A Better Balance (above) | SUPPORTED |
| MS state employees: personal leave and major medical leave. The first day of each illness absence comes from personal leave. For an illness absence of **32 consecutive working hours or more**, major medical leave "can be authorized only when certified in writing by the attending physician" (Miss. Code 25-3-91 et seq., as summarized by an agency HR page). **Whether a psychologist's or counselor's certification satisfies "attending physician" needs legal review. This is critical before marketing to MS state employees.** | https://www.mpbonline.org/more/HR/benefits/ | OBSERVED (secondary agency summary). Verify the statute. |
| Physician telemedicine: "only physicians holding a valid Mississippi license are allowed to practice telemedicine in Mississippi" (20 Miss. Code R. 2-XXIV). | https://www.law.cornell.edu/regulations/mississippi/20-Miss-Code-R-2-XXIV | OBSERVED. Needs legal review. |
| Counselors: distance counseling requires a license "in good standing in both" the provider's and the client's locations (30 Miss. Code R. 2201-7.5). | https://www.law.cornell.edu/regulations/mississippi/30-Miss-Code-R-SS-2201-7-5 | OBSERVED. Needs legal review. |
| PSYPACT: MS SB 2157 was enacted 4/8/2024, but the official map lists it as "Enacted, Not Yet Effective" (effective date TBD). **Out-of-state psychologists cannot yet practice in MS via PSYPACT.** | https://psypact.gov/page/psypactmapS | OBSERVED |
| Counseling Compact: MS is a member state, but privileges are live only for licensees in AZ, MN and OH. **No compact privilege into MS exists today.** | https://counselingcompact.gov/map/ | OBSERVED |
| Telehealth business registry: provider entities offering telehealth to MS patients must register with the MS State Department of Health ($50, 2-year term), according to a 2022 law-firm summary. **Current status needs verification and legal review.** | https://www.foley.com/insights/publications/2022/02/mississippi-telemedicine-business-registry-know/ ; https://joneswalker.com/en/insights/mississippi-issues-minimum-standards-of-operation-for-the-practice-of-telemedicine.html | OBSERVED (secondary). Verify. |
| Crisis resources: 988 (call, text or chat); DMH Helpline 1-877-210-8513 (24/7); regional Mobile Crisis Response Teams covering all 82 counties. | https://dmh.ms.gov/ | OBSERVED |

**Tennessee**
| Fact | Source | Label |
|---|---|---|
| No state paid family or medical leave program for private employers. TN has no state FMLA for the employee's own health. The A Better Balance TN worker FAQ points workers to federal FMLA, the ADA and the TN Human Rights Act (employers with 8+ workers) for their own health needs. | https://www.abetterbalance.org/wp-content/uploads/2022/11/TN-FAQ-Caring-for-Yourself-While-Working-11.4-1.pdf ; https://www.dol.gov/agencies/wb/featured-paid-leave | SUPPORTED. Needs legal review. |
| Tennessee Parental Leave Act (T.C.A. 4-21-408): employers with 100+ full-time employees at a job site, up to 4 months for pregnancy, childbirth, adoption or nursing. Paid or unpaid at the employer's option, with 3 months' notice. **This explains the autocomplete "fmla tennessee 16 weeks". It is not mental-health leave.** | https://www.ctas.tennessee.edu/eli/interaction-tennessees-parental-leave-act | OBSERVED |
| TN state employees: 12 days of sick leave a year. A "health provider's statement certifying the need for absence cannot be denied" (5.12). Sick Leave Bank grants go up to 90 days per condition, with medical certification. Donated leave requires Form PR-0471 from the medical provider. Emotional Wellbeing Support (formerly EAP) gives up to 10 hours a year of excused time. State employees get 12 weeks of paid family leave, which press coverage describes as birth or adoption. **Read Ch. 23 to confirm whether it covers the employee's own health.** | https://www.tn.gov/hr/pr/attendance---leave-manual.html ; https://wpln.org/post/tennessee-to-give-state-workers-12-week-paid-family-leave-more-than-nearly-any-other-state ; https://www.nashvillescene.com/news/citylimits/paid-family-leave-policy-for-state-employees-passes-in-senate/article_8f392f0c-ccef-11ed-9d31-4b4532ea64d0.html | OBSERVED / SUPPORTED |
| Telemedicine licensure: "The practice of medicine occurs where the patient is located… If you see any patients that are located in Tennessee, you must also be licensed in Tennessee." (TN Board of Medical Examiners FAQ; see also Rule 0880-02-.16) | https://www.tn.gov/content/dam/tn/health/documents/Telemedicine_FAQs.pdf ; https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0880-02-.16 | OBSERVED (physicians). Rules for other professions need legal review. |
| PSYPACT: TN is participating (S 161, effective 5/11/2021). A psychologist licensed in another PSYPACT state who holds an APIT may provide telepsychology to TN patients, subject to PSYPACT rules. | https://psypact.gov/page/psypactmapS | OBSERVED. Scope (e.g., whether forms completion counts as telepsychology) needs legal review. |
| Counseling Compact: TN is a member, but privileges are not yet live for TN. | https://counselingcompact.gov/map/ | OBSERVED |
| Crisis resources: 988 and the TN Statewide Crisis Line, 855-CRISIS-1 (855-274-7471), 24/7, free. | https://tn.gov/crisisline | OBSERVED |
| Large employers with their own leave policies: State of Tennessee, Metro Nashville ("metro nashville fmla policy"), City of Memphis ("city of memphis fmla policy"), VUMC, HCA, Nissan, Amazon, FedEx (Memphis). | Autocomplete above; https://www.tylercauble.com/blog/largestemployersnashville2024 | OBSERVED |

### 3c. Thin or doorway page?
- **A page that swaps "Mississippi" or "Tennessee" into national copy would be a doorway page.** No observed search demand exists for "mental health leave [state]", and federal FMLA rules are identical in both states. INFERRED.
- **A state page is justified only if it carries genuinely state-specific, decision-relevant content:**
  - Clinician licensure for patients located in that state, and who will see them (MS: an MS-licensed clinician, since PSYPACT is not yet effective and the counseling compact is not live; TN: TN-licensed or PSYPACT).
  - The absence of a state paid-leave program, and what that means: FMLA is unpaid, so STD and employer PTO matter.
  - State-employee leave rules: the MS 32-hour "attending physician" certification; TN sick leave bank, PR-0471 and the "cannot be denied" provision.
  - The TN Parental Leave Act clarification.
  - State crisis lines.
- **Mississippi is the riskier, thinner case.** No MS-licensed clinician means the service cannot legally be offered there (needs legal review). MS state employees may need a *physician* certification. MS demand signals are weakest. INFERRED.
- **Tennessee is more viable.** PSYPACT is effective, the market is larger, and autocomplete shows "fmla stress leave tennessee", "do you get paid for fmla in tennessee" and city-employer FMLA queries. INFERRED.

---

## 4. Search-to-business mapping

| Query cluster | Intent | Customer problem | Best page | Offer | CTA | Objections | Trust needed |
|---|---|---|---|---|---|---|---|
| FMLA for anxiety/depression (#1) | Informational / problem-aware | "Does my condition count?" | Guide: "FMLA for anxiety and depression: what counts, who can certify" (cites DOL 28O, 29 CFR 825.125) | Free guide plus eligibility checklist | "Check if an assessment fits you" | "Burnout doesn't qualify"; "I'm not eligible" | DOL citations, clinician author byline, no guarantees |
| What to say to doctor / how to get FMLA (#2) | Problem-aware | Can't find words; fears dismissal | "How a mental health leave assessment works" | $275 assessment, outcome not guaranteed | "Book an assessment" | "Will they think I'm faking?" | Clinical process explained, structured intake, real clinician |
| No PCP / provider refused / deadline (#4, #8, #11) | Provider-seeking / urgent | Deadline approaching, no clinician | "Need FMLA forms completed but don't have a regular doctor?" | Assessment with turnaround stated (HYPOTHESIS: 48–72h) | "Check appointment availability" | "One visit isn't enough"; "employer requires PCP" | Clinician credentials and state license shown; what happens if the employer queries |
| Online FMLA services (#5) | Comparison / transactional | Is this legit and will my employer accept it? | "Is an online FMLA certification accepted?" plus comparison page | Assessment plus employer clarification support | "See what's included" | "Scam?"; "employer rejected"; "keeps charging me" | Flat price, no subscription, refund policy if not supported (HYPOTHESIS), named clinicians, reviews |
| Intermittent leave (#6) | Solution-aware | Needs time for flare-ups or appointments | "Intermittent leave for anxiety and depression" | Assessment covering frequency and duration estimates | "Book an assessment" | "Employer pushback on frequency" | Explain how frequency is estimated clinically |
| STD for depression/anxiety (#7) | Solution-aware | Needs income replacement | "Short-term disability paperwork for mental health" | Assessment; scope limits stated (carrier forms, attending-physician statements may need MD; needs legal review) | "Find out what your forms need" | "STD requires a physician"; "ongoing treatment required" | Honest scope page; which forms you can and can't complete |
| Therapist/psychiatrist who can sign (#8) | Problem-aware | Therapist can't or won't sign | "Who can complete FMLA forms for mental health?" | Assessment by a clinician type eligible under 825.125 | "Get assessed" | "My employer wants an MD" | Clinician type disclosed per state |
| Doctor's note for anxiety (#9) | Mixed | Short absence note | Short-absence FAQ, routing elsewhere | Likely not core (HYPOTHESIS) | "Is a full assessment right for you?" | Price too high for a note | Clarify scope |
| Template / free notes (#10) | Low-value | Wants a fake note | **None. Do not target.** | n/a | n/a | n/a | Reputational risk |
| Privacy / will boss know (#14) | Problem-aware | Fear of disclosure | "What your employer can and can't see" (DOL, 825.307; legal review) | Self-pay, no insurance claim | "Book privately" | "Diagnosis disclosed"; "insurance record" | Self-pay explanation, HIPAA notice, no-diagnosis-required citation |
| Retaliation / career (#14, r/fednews) | Problem-aware | Fear of firing | Rights explainer linking to DOL WHD (no legal advice) | n/a; refer to DOL / attorney | "Learn your FMLA rights" | "I'll be fired" | Neutral; no legal claims; legal review |
| Crisis-adjacent (#16) | Urgent | Danger to self | Persistent 988 banner and exclusion criteria | Not offered | "Call or text 988" | n/a | Safety-first messaging |
| FMLA Tennessee (#13) | Informational / local | TN rules and pay | TN page (see 3b) | Assessment for TN patients with a TN or PSYPACT clinician | "Book (Tennessee)" | "Is this legal in TN?" | License numbers, PSYPACT status, TN crisis line |
| FMLA Mississippi (#13) | Informational / local | MS rules | MS page **only once an MS-licensed clinician is in place** | Same | Same, or a waitlist | "Physician required for state employees" | MS license, honest scope |
| Employer-specific (#12) | Informational / local | e.g., Amazon, Walmart, Metro Nashville | HYPOTHESIS: generic "working with your employer's leave administrator" page, no trademark-led pages | Assessment | "Book" | "Leave administrator (Sedgwick, etc.) process" | Avoid implying affiliation |

---

## 5. Seasonality and timing signals

- **No Google Trends data** (fetch blocked). No seasonal pattern was found in ComPsych or Littler releases. OBSERVED absence.
- **Year-end burnout:** Fishbowl post title: "had a hard year personally and feeling so exhausted my billable year ends on dec 31 and im feeling like i cant make it until…" https://www.fishbowlapp.com/post/had-a-hard-year-personally-and-feeling-so-exhausted-my-billable-year-ends-on-dec-31-and-im-feeling-like-i-cant-make-it-until . OBSERVED (single anecdote).
- **Annual form refresh:** autocomplete "fmla paperwork 2026" (OBSERVED [AC: fmla paperwork]). INFERRED: people look for the current-year forms.
- **Deadline-driven urgency within a leave episode:** 15-day certification windows show up as "roughly 2 weeks" and "deadline is Friday" (OBSERVED, Blind and r/mentalhealth). This is per-person timing rather than seasonal, but it argues for fast turnaround and evening and weekend availability (INFERRED).
- **TN state-employee cycle:** Sick Leave Bank enrollment runs in August–October, and grants start February 1 (OBSERVED, TN Attendance & Leave Manual). This is a niche timing hook for TN state employees (INFERRED).
- **MS state-employee policy change:** paid parental leave started Jan 1, 2026 (OBSERVED). It is not mental-health leave, but it may drive "mississippi state employee leave" informational searches (HYPOTHESIS).
- HYPOTHESIS, to test with Trends or paid search once available: peaks in January (post-holiday, many FMLA leave years reset, new deductibles favor self-pay) and in September–October (school year for teachers and the Q4 workload crunch).

---

## Source list
- DOL Fact Sheet #28O: https://www.dol.gov/agencies/whd/fact-sheets/28o-mental-health
- 29 CFR 825.125: https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-C/part-825/subpart-A/section-825.125
- 29 CFR 825.307: https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-C/part-825/subpart-C/section-825.307
- DOL 2018 FMLA survey: https://www.dol.gov/resource-library/employee-and-worksite-perspectives-family-and-medical-leave-act-2018-employee
- CLASP on 2018 survey: https://www.clasp.org/publications/fact-sheet/new-fmla-data-need-paid-leave/
- BLS benefits access: https://www.bls.gov/charts/employee-benefits/percent-access-benefits-by-work-status.htm
- DOL paid leave: https://www.dol.gov/agencies/wb/featured-paid-leave
- ComPsych: https://www.businesswire.com/news/home/20250910175522/en/ComPsych-Data-Uncovers-a-New-Normal-in-Employee-Leaves-Since-the-COVID-19-Pandemic ; https://www.compsych.com/press-release/mental-health-leaves-of-absence-continue-to-proliferate-among-u-s-workers-according-to-new-compsych-data/
- Entrepreneur: https://www.entrepreneur.com/business-news/the-number-of-workers-taking-mental-health-leaves-has-risen/497040
- Littler: https://www.littler.com/press/news/mental-health-leave-requests-are-rising-survey-says
- J.J. Keller: https://jjkellercompliancenetwork.com/news/must-employers-accept-fmla-certifications-from-online-services
- PSYPACT map: https://psypact.gov/page/psypactmapS
- Counseling Compact map: https://counselingcompact.gov/map/
- MS telemedicine rule: https://www.law.cornell.edu/regulations/mississippi/20-Miss-Code-R-2-XXIV
- MS LPC distance rule: https://www.law.cornell.edu/regulations/mississippi/30-Miss-Code-R-SS-2201-7-5
- MS telehealth registry: https://www.foley.com/insights/publications/2022/02/mississippi-telemedicine-business-registry-know/ ; https://joneswalker.com/en/insights/mississippi-issues-minimum-standards-of-operation-for-the-practice-of-telemedicine.html
- MS state employee leave: https://www.mpbonline.org/more/HR/benefits/
- MS paid parental leave: https://wdam.com/2025/03/28/reeves-signs-mandatory-paid-parental-leave-state-employees-into-law ; https://www.wlbt.com/2025/12/31/paid-parental-leave-mississippi-state-employees-set-go-into-effect-jan-1/ ; https://www.abetterbalance.org/paid-parental-leave-for-state-employees-takes-effect-in-mississippi/
- MS DMH: https://dmh.ms.gov/
- TN medical board telemedicine FAQ: https://www.tn.gov/content/dam/tn/health/documents/Telemedicine_FAQs.pdf ; https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0880-02-.16
- TN Parental Leave Act (CTAS): https://www.ctas.tennessee.edu/eli/interaction-tennessees-parental-leave-act
- TN Attendance & Leave Manual: https://www.tn.gov/hr/pr/attendance---leave-manual.html
- TN paid family leave (state employees): https://wpln.org/post/tennessee-to-give-state-workers-12-week-paid-family-leave-more-than-nearly-any-other-state ; https://www.nashvillescene.com/news/citylimits/paid-family-leave-policy-for-state-employees-passes-in-senate/article_8f392f0c-ccef-11ed-9d31-4b4532ea64d0.html
- TN worker FAQ (A Better Balance): https://www.abetterbalance.org/wp-content/uploads/2022/11/TN-FAQ-Caring-for-Yourself-While-Working-11.4-1.pdf
- TN crisis line: https://tn.gov/crisisline
- Employers: https://www.redfin.com/blog/mississippi-major-industries/ ; https://www.tylercauble.com/blog/largestemployersnashville2024
- Forums: https://www.teamblind.com/post/how-do-i-talk-to-my-doctor-about-supporting-time-off-hoidgqtf ; https://www.teamblind.com/post/therapists-who-would-support-fmla-ecxm758z ; https://www.teamblind.com/post/how-to-find-doctor-for-fmla-for-amazon-tzscfr42 ; https://www.teamblind.com/post/does-amazon-dls-share-fmla-diagnosis-or-the-type-of-medical-loa-with-the-manager-c4thdyya ; https://www.teamblind.com/post/can-my-therapist-sign-the-fmla-forms-v5dpyx7g ; https://www.teamblind.com/post/how-does-one-successfully-use-fmla-to-take-much-needed-mental-break-fkglx772 ; https://www.fishbowlapp.com/post/how-do-i-take-leave-of-absence-for-stress-and-mental-health-im-not-currently-on-prescription-medication ; https://www.fishbowlapp.com/post/has-anyone-gone-on-short-term-leave-to-help-manage-their-mental-health-and-recoup-ive-felt-burnout-coming-for-months-and ; https://elpha.com/posts/ajbb3lbt/advice-for-taking-a-burnout-leave ; https://reddit.com/r/sanfrancisco/comments/1q4zz80/psychiatrist_in_sf_who_will_approve_mental_health/ (via https://reddit.sentinel-team.org/posts/1q4zz80/snapshots/2026-01-10T11%3A51%3A21.87059Z) ; https://reddit.com/r/mentalhealth/comments/1u7y0rh/fmla_help_with_provider/ (via https://reddit.sentinel-team.org/posts/1u7y0rh/snapshots/2026-06-20T02%3A10%3A24.75024Z) ; https://reddit.com/r/fednews/comments/1t9rhkd/will_submitting_an_fmla_request_for_burnout/ (via https://reddit.sentinel-team.org/posts/1t9rhkd/snapshots/2026-05-11T15%3A04%3A54.63052Z) ; https://redlib.belloworld.it/r/MentalHealthSupport/comments/1dum2q3/fmla_paperwork
- Media and reviews: https://www.boston.com/uncategorized/jobs/2024/09/04/due-to-mental-health-issues-caused-by-my-workplace-im-seriously-considering-taking-fmla-leave-and-prioritizing-my-health/ ; https://ie.trustpilot.com/review/fmlanow.com ; https://help.talkspace.com/hc/en-us/articles/4410065497499-Can-My-Provider-Fill-Out-an-Assessment-or-Other-Paperwork
