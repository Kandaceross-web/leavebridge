"""Shared, factual homepage content for the three LeaveBridge Health design previews.

Every concept renders exactly this content so the designs can be compared fairly. Facts come from
src/config/catalog.ts, src/config/settings.ts, docs/OPEN-DECISIONS.md and the live public site
(2026-10-10). Anything not yet verified is marked with a visible [Placeholder] or [Needs approval] label.
"""

NAV = [
    ("Services", "#services"),
    ("How It Works", "#how"),
    ("About", "#clinician"),
    ("FAQs", "#faqs"),
]

HERO = {
    "eyebrow": "A more personal approach to mental healthcare",
    "headline": "Your Wellbeing Deserves Exceptional Care.",
    "lede": "Private, professional mental health assessments and leave documentation support, thoughtfully delivered online.",
    "cta": "Begin Your Assessment",
    "cta2": "Explore Our Services",
    "note": "Start with a brief screening to explore whether our service may be right for you.",
    "availability": "Currently serving adults located in Mississippi and Tennessee.",
}

PANEL = {
    "title": "Mental Health Leave Assessment",
    "kind": "Online clinical assessment",
    "price": "$279.99",
    "price_note": "One flat self-pay fee. No subscription.",
    "steps": ["Two-minute screening, no account needed", "Secure intake and questionnaires", "Licensed clinician’s independent determination"],
    "cta": "Begin Your Assessment",
}

TRUST = [
    ("Licensed mental health professional", "Assessments by a Licensed Professional Counselor in Mississippi and Tennessee."),
    ("Convenient online assessments", "Screening, intake and any video visit happen online, from home."),
    ("Private patient experience", "Nothing goes to an employer without your written authorization."),
]

UNDERSTAND = {
    "eyebrow": "Understanding the service",
    "heading": "Support when your mental health affects your work.",
    "paras": [
        "When anxiety, depression, burnout or other symptoms make work feel unmanageable, you deserve a careful, unhurried assessment rather than a rushed form.",
        "A licensed clinician considers your symptoms, how you are functioning day to day, and whether leave-related documentation is clinically appropriate. The decision is theirs alone, made with independent professional judgment.",
    ],
    "qualifier": "Payment covers a clinical assessment. Documentation depends on the clinician’s findings; leave approval is determined by the applicable employer or administrator.",
    "for": ["Adults 18 and older", "Located in Mississippi or Tennessee during care", "Symptoms are affecting work and documentation may be needed"],
    "not_for": ["Emergency or crisis care", "Ongoing therapy or medication management", "A decision on FMLA eligibility or leave approval"],
}

STEPS = [
    {
        "n": "01",
        "title": "Start your screening",
        "summary": "Answer a few questions and review the next steps.",
        "detail": [
            "About two minutes, with no account or payment.",
            "Confirms you are 18 or older and located in a state we serve.",
            "Tell us about any form deadline so the clinical team can see it.",
        ],
    },
    {
        "n": "02",
        "title": "Complete your assessment",
        "summary": "Complete the required intake and participate in the clinical assessment process.",
        "detail": [
            "Create your account, then verify your photo ID and location.",
            "Pay the flat fee once, after which your secure intake opens.",
            "Share your history, two short questionnaires and any employer forms (PDF, JPG or PNG). You can save and return.",
            "A licensed clinician reviews everything and books a secure video visit if they determine one is needed.",
        ],
    },
    {
        "n": "03",
        "title": "Receive your outcome",
        "summary": "Review your assessment outcome and access documentation when clinically appropriate.",
        "detail": [
            "Your clinician’s independent determination is explained in your portal.",
            "When documentation is clinically supported, it is completed, signed and delivered securely in your portal.",
            "You decide who receives it. We never contact your employer unless you ask.",
        ],
    },
]

SERVICES = [
    {
        "name": "Mental Health Leave Assessment",
        "price": "$279.99",
        "unit": "self-pay",
        "for": "Adults whose mental-health symptoms may be affecting their ability to work and who may need leave documentation.",
        "includes": [
            "Review of your intake, questionnaires and uploaded forms",
            "A telehealth visit when your clinician determines one is needed",
            "The clinician’s independent determination, explained in your portal",
            "Completion of this leave request’s paperwork when clinically supported",
        ],
        "prereq": "Photo ID and location verification. Check that your employer accepts a licensed mental-health clinician.",
        "scope": "Does not guarantee documentation, a diagnosis or leave approval.",
        "cta": "Begin Your Assessment",
        "featured": True,
    },
    {
        "name": "Leave Recertification",
        "price": "$119.99",
        "unit": "self-pay",
        "for": "People whose employer or leave administrator has asked for recertification of an existing leave.",
        "includes": [
            "A clinical re-evaluation of your current condition and functioning",
            "Completion of the recertification form when clinically supported",
        ],
        "prereq": "The recertification form from your employer or leave administrator.",
        "scope": "Recertification is not automatic.",
        "cta": "Request Recertification",
        "featured": False,
    },
    {
        "name": "Follow-up Form",
        "price": "$9.99",
        "unit": "per form",
        "for": "Existing patients whose employer sends an additional or updated form after their assessment.",
        "includes": [
            "Completion of the form when it is consistent with your clinician’s existing findings",
        ],
        "prereq": "A completed LeaveBridge assessment and the new form.",
        "scope": "Not a new clinical assessment. If a new evaluation is needed, you are told before anything else is charged.",
        "cta": "Request a Form",
        "featured": False,
    },
]

CLINICIAN = {
    "eyebrow": "Clinical leadership",
    "name": "Kandace Ross",
    "credentials": "LPC, NCC",
    "role": "Founder and Licensed Professional Counselor",
    "licensure": "Licensed in Mississippi and Tennessee",
    "license_placeholder": "[Placeholder] License numbers to be added after board verification",
    "bio_placeholder": "[Placeholder] Professional biography and relevant experience, in Kandace’s own words. Approved copy needed.",
    "photo_placeholder": "Professional photograph of Kandace Ross required. 1200 × 1500 px (4:5), natural light.",
}

FAQS = [
    ("What does the assessment include?",
     "A licensed clinician reviews your intake, two short questionnaires and any forms you upload, meets with you by secure video when they determine it is needed, and records an independent determination. When documentation is clinically supported, they complete the paperwork for this leave request."),
    ("Does payment guarantee documentation?",
     "No. Payment covers a professional clinical assessment. The clinician may find that documentation is not clinically supported, that more information is needed, or that a different kind of care is more appropriate."),
    ("How does the process work?",
     "Start with a two-minute screening. If we may be able to help, you create an account, verify your ID and location, pay, and complete your intake. A clinician reviews your case, and your outcome and any documents appear in your secure portal."),
    ("Where is the service available?",
     "We currently serve adults who are physically located in Mississippi or Tennessee during care. What matters is where you are during care, not where you live or work."),
    ("What information or forms should I prepare?",
     "A photo ID, any certification form from your employer or leave administrator, and your form deadline. Before you pay, ask HR whether they accept certification from a licensed mental-health clinician by telehealth."),
    ("How will I receive my outcome?",
     "Your clinician’s determination is explained in your secure portal. Completed, signed documents are delivered there too, and you choose who receives them."),
    ("What if documentation is not clinically appropriate?",
     "Your clinician will explain their determination in your portal. If they decide this service is not appropriate for you, you receive a full refund. If they complete the assessment and find documentation is not supported, the fee covers the assessment that was provided."),
    ("What are the current refund and cancellation policies?",
     "You receive a full refund if you cancel before your clinician starts reviewing your case, if the clinician decides the service is not appropriate, or if your case is paused for safety reasons. Missed video visits, cancellations less than 24 hours before a visit, and cases where a determination has been made are not refunded. [Needs approval] The public policy is still labelled “pending legal review”."),
    ("Can I request recertification or additional paperwork?",
     "Yes. Leave Recertification is $119.99 and includes a clinical re-evaluation. A Follow-up Form is $9.99 per form for existing patients and is completed only when consistent with your clinician’s findings."),
    ("How can I contact support?",
     "Email support@leavebridgehealth.com, Monday to Friday, 9 a.m. to 5 p.m. Central. Please don’t include health details by email. Patients can message their care team securely in the portal."),
]

FINAL = {
    "heading": "Take the next step toward support.",
    "line": "The screening takes about two minutes, and there is no account or payment required to begin.",
    "cta": "Begin Your Assessment",
}

CRISIS = "Not an emergency service. If you are in crisis, call or text 988, call 911, or contact Mississippi 1-877-210-8513 or Tennessee 855-274-7471."

FOOTER = {
    "tagline": "Thoughtful mental health assessments and leave documentation support, delivered online.",
    "cols": [
        ("Services", [("Leave Assessment", "#services"), ("Recertification", "#services"), ("Follow-up Forms", "#services"), ("Where we serve", "#faqs")]),
        ("Practice", [("How It Works", "#how"), ("About", "#clinician"), ("FAQs", "#faqs"), ("Patient Sign In", "#")]),
        ("Policies", [("Privacy Policy", "#"), ("Terms of Use", "#"), ("Notice of Privacy Practices", "#"), ("Financial and Refund Policy", "#"), ("Accessibility [Needs page]", "#")]),
    ],
    "contact": "support@leavebridgehealth.com",
    "hours": "Monday to Friday, 9 a.m. to 5 p.m. Central",
    "disclosure": "Independent clinical assessments. Clinicians make their own determinations. LeaveBridge Health does not decide FMLA eligibility or approve leave; your employer or leave administrator does.",
}
