// Shared, factual content for the three luxury homepage concepts.
// Every concept renders exactly this copy so the designs can be compared fairly.
// Sources: src/config/catalog.ts (services, prices), src/config/settings.ts (refund rules, support),
// docs/OWNER-SIGNOFF.md and project memory (clinician, states). Items marked FLAG need owner input.

export const PRICES = {
  assessment: "$279.99", // LAUNCH_PRICE_CENTS = 27999
  recert: "$119.99", // RECERTIFICATION_PRICE_CENTS = 11999
  followUp: "$9.99", // FOLLOW_UP_FORM_PRICE_CENTS = 999 (meaning still OWNER_DECISION_REQUIRED)
};

export const STATES = ["Mississippi", "Tennessee"];

export const NAV = [
  ["Services", "#services"],
  ["How It Works", "#how"],
  ["About", "#credentials"],
  ["FAQs", "#faq"],
];

export const HERO = {
  eyebrow: "A more personal approach to mental healthcare",
  headline: "Your Wellbeing Deserves Exceptional Care.",
  sub: "Professional mental health assessments and leave documentation support, thoughtfully delivered online.",
  primary: "Begin Your Assessment",
  secondary: "Explore Our Services",
  note: "Start with a brief screening to explore whether our service may be right for you.",
};

export const TRUST = [
  ["Licensed mental health professional", "Every assessment and decision is made by a licensed professional counselor."],
  ["Convenient online assessments", "A secure portal, with a video visit when your clinician needs one."],
  ["Private patient experience", "You review your documents first and decide who receives them."],
];

export const UNDERSTAND = {
  heading: "Support when your mental health affects your work.",
  body: [
    "Anxiety, depression, burnout and other symptoms can make ordinary workdays feel impossible. An assessment gives you a careful, professional look at what is happening.",
    "Your clinician considers your symptoms, how they affect your daily functioning and your work, and whether leave-related documentation is clinically appropriate.",
  ],
  forYou: [
    "Adults 18 and older",
    "Located in Mississippi or Tennessee during your care",
    "Symptoms are affecting your ability to work",
  ],
  notFor: ["Emergency or crisis care", "Ongoing therapy or medication", "Deciding FMLA eligibility or approving leave"],
  qualification:
    "Payment covers a clinical assessment. Documentation depends on the clinician’s findings; leave approval is determined by the applicable employer or administrator.",
};

export const STEPS = [
  {
    title: "Start your screening",
    lede: "Answer a few questions and review the next steps.",
    details: [
      "About two minutes, with no account or payment.",
      "Create your account, upload a photo ID and confirm where you are located.",
      `Pay ${PRICES.assessment} once, by card, for the assessment.`,
    ],
  },
  {
    title: "Complete your assessment",
    lede: "Complete the required intake and participate in the clinical assessment process.",
    details: [
      "Share your history and answer two short questionnaires. You can save and return.",
      "Upload any forms from your employer or leave administrator.",
      "Your clinician reviews everything and books a 30-minute secure video visit when one is needed.",
    ],
  },
  {
    title: "Receive your outcome",
    lede: "Review your assessment outcome and access documentation when clinically appropriate.",
    details: [
      "Your clinician makes an independent decision and explains it.",
      "Signed documents appear in your private portal.",
      "You read them first and choose who receives them.",
    ],
  },
];

export const SERVICES = [
  {
    id: "assessment",
    tag: "Assessment",
    name: "Mental Health Leave Assessment",
    price: PRICES.assessment,
    unit: "one-time fee",
    forWho: "Adults whose mental health is affecting their work and who need leave documentation considered.",
    includes: [
      "Clinical review of your intake, questionnaires and employer forms",
      "A secure video visit when your clinician needs one",
      "A written outcome from your clinician",
      "Completed FMLA or leave forms when clinically supported",
    ],
    prereq: "18 or older and located in Mississippi or Tennessee.",
    scope: "Covers the assessment, not a particular outcome.",
    cta: "Begin Your Assessment",
  },
  {
    id: "recert",
    tag: "After your assessment",
    name: "Leave Recertification",
    price: PRICES.recert,
    unit: "per recertification visit",
    forWho: "Patients whose employer or leave administrator has asked to recertify an existing leave.",
    includes: [
      "Reassessment of your current condition and functioning",
      "A secure video visit",
      "Updated documentation when clinically supported",
    ],
    prereq: "The recertification request from your employer or administrator.",
    scope: "Recertification is not automatic.",
    cta: "Request Recertification",
  },
  {
    id: "followup",
    tag: "After your assessment",
    name: "Follow-up Form",
    price: PRICES.followUp,
    unit: "per form",
    forWho: "Existing patients whose employer sends an additional or updated form after the assessment.",
    includes: [
      "Your clinician completes the form if it matches their clinical findings",
      "No new visit",
    ],
    prereq: "A completed LeaveBridge assessment.",
    scope: "Does not include a new evaluation. If one is needed, you are told before anything else is charged.",
    cta: "Send a Form",
  },
];

export const CLINICIAN = {
  name: "Kandace S. Ross",
  post: "LPC, NCC",
  credentials: [
    ["Mississippi", "Licensed Professional Counselor (LPC), license no. 2581"],
    ["Tennessee", "Licensed Professional Counselor, Mental Health Service Provider (LPC-MHSP), license no. 7581"],
    ["National", "National Certified Counselor (NCC)"],
  ],
  availability: "Patients located in Mississippi and Tennessee",
  intro:
    "Every assessment is provided by a licensed professional counselor. Your clinician’s name, license and state are also shown inside your assessment, before you share any information.",
};

// Quality and convenience of the experience, stated only as far as the current system supports.
export const EXPERIENCE = [
  ["Clinical expertise", "A licensed professional counselor reviews your case and makes every clinical decision. No software decides, and payment never does."],
  ["Discreet by design", "We do not bill insurance, and nothing reaches your employer unless you choose to share it."],
  ["Online, at your pace", "Begin whenever suits you. Save your intake and return later; a video visit is arranged only when your clinician needs one."],
  ["Clear from the start", "Each fee is published in full, and the refund rules are shown before you pay."],
];

export const FAQ = [
  [
    "What does the assessment include?",
    "A review of your intake, two standard questionnaires and any employer forms, a secure video visit when your clinician needs one, a written outcome, and completed leave forms when they are clinically supported.",
  ],
  [
    "Does payment guarantee documentation?",
    "No. Payment covers the clinical assessment. Your clinician decides independently whether documentation is clinically appropriate, and your employer or leave administrator decides whether leave is approved.",
  ],
  [
    "How does the process work?",
    "Start with a two-minute screening. Then create your account, verify your ID and location, pay, and complete your intake. Your clinician reviews your case, meets with you by video if needed, and shares the outcome in your portal.",
  ],
  [
    "Who provides the assessment?",
    "Kandace S. Ross, LPC, NCC, a licensed professional counselor in Mississippi and Tennessee. Assessments are not provided by a physician.",
  ],
  [
    "Where is the service available?",
    "Right now, for adults who are physically located in Mississippi or Tennessee during their care. Your clinician can only provide care where they are licensed.",
  ],
  [
    "What information or forms should I prepare?",
    "A photo ID, any form your employer or leave administrator gave you (such as a WH-380-E), the date it is due, and notes on how your symptoms have affected your work.",
  ],
  [
    "How will I receive my outcome?",
    "In your private patient portal. Signed documents appear there for you to read first. We do not send anything to your employer unless you ask us to.",
  ],
  [
    "What if documentation is not clinically appropriate?",
    "Your clinician explains the decision in your portal. The fee covers the assessment whatever the outcome, and you can request a copy of your records to share with another provider.",
  ],
  [
    "What are the current refund and cancellation policies?",
    "You get a full refund if you cancel before your clinician starts reviewing your case, if your clinician decides the service is not right for you, or if your case is paused for safety reasons. There is no refund once a determination is made, if you miss your video visit, or if you cancel less than 24 hours before it.",
  ],
  [
    "Can I request recertification or additional paperwork?",
    `Yes. Recertification is ${PRICES.recert} per visit. Additional or updated forms after your assessment are ${PRICES.followUp} each, and are completed only when they match your clinician’s findings.`,
  ],
  [
    "How can I contact support?",
    "Patients can message us from the portal. Everyone else can email support@leavebridgehealth.com.",
  ],
];

// Section headings: short two-part lines with one emphasised phrase (set in italic by each concept).
export const H = {
  understand: "Support when your mental health <em>affects your work.</em>",
  experience: "Expert care, <em>arranged around your life.</em>",
  how: "Three steps. <em>One private portal.</em>",
  services: "Clear services. <em>Published fees.</em>",
  credentials: "Who provides <em>your care</em>",
  faq: "Questions, <em>answered clearly.</em>",
  final: "Take the next step <em>toward support.</em>",
};

export const FINAL = {
  heading: "Take the next step toward support.",
  body: "The screening takes about two minutes and asks for no payment.",
  cta: "Begin Your Assessment",
};

export const FOOTER = {
  blurb: "Mental health leave assessments and documentation support, delivered online.",
  contact: "support@leavebridgehealth.com",
  services: ["Leave Assessment", "Recertification", "Follow-up Forms", "Pricing"],
  legal: ["Privacy Policy", "Notice of Privacy Practices", "Terms of Use", "Refund and Cancellation Policy", "Accessibility"],
  emergency:
    "LeaveBridge Health is not an emergency service. If you are in crisis, call or text 988, the Suicide and Crisis Lifeline, or call 911.",
  clinical:
    "Assessments are provided by a licensed professional counselor, not a physician. Leave eligibility and approval are decided by your employer or leave administrator.",
};

// Bridge-inspired symbol: a single shallow arch over a deck line, drawn with strokes only.
export const bridgeMark = (stroke = "currentColor", accent = "currentColor", size = 30) => `
<svg class="mark" width="${size}" height="${Math.round(size * 0.6)}" viewBox="0 0 40 24" aria-hidden="true" focusable="false">
  <path d="M3 19 C 11 5, 29 5, 37 19" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M1 19 H39" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M13 11.2 V19 M20 9 V19 M27 11.2 V19" fill="none" stroke="${accent}" stroke-width="1" stroke-linecap="round" opacity=".75"/>
</svg>`;

export const wordmark = (opts = {}) => `
<a class="wordmark" href="#top" aria-label="LeaveBridge Health, home">
  ${opts.mark === false ? "" : bridgeMark(opts.stroke, opts.accent, opts.size)}
  <span class="wm-text" aria-hidden="true"><span class="wm-name">LeaveBridge</span><span class="wm-sub">Health</span></span>
</a>`;

// Clearly labeled photo placeholder with art-directed tones and the required dimensions.
export const photo = (cls, spec, brief) => `
<figure class="ph ${cls}" role="img" aria-label="Photo placeholder: ${brief}">
  <span class="ph-window" aria-hidden="true"></span>
  <span class="ph-plant" aria-hidden="true"></span>
  <span class="ph-table" aria-hidden="true"></span>
  <figcaption class="ph-cap"><b>Photo placeholder · ${spec}</b><span>${brief}</span></figcaption>
</figure>`;

export const PHOTO_CSS = `
.ph{position:relative;margin:0;overflow:hidden;background:
  radial-gradient(120% 80% at 18% 12%, #fbf4e6 0%, rgba(251,244,230,0) 55%),
  linear-gradient(180deg,#e7dccb 0%,#d9cab5 62%,#b89c7c 62.2%,#a88a69 100%);
  max-width:100%}
.ph-window{position:absolute;left:10%;top:8%;width:min(34%,520px);height:46%;background:linear-gradient(180deg,#fffaf0,#f3e7d2);box-shadow:0 0 60px 30px rgba(255,248,232,.65);border-radius:2px}
.ph-window::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 48.5%,rgba(160,135,105,.35) 48.5% 51.5%,transparent 51.5%),linear-gradient(180deg,transparent 48.5%,rgba(160,135,105,.35) 48.5% 51.5%,transparent 51.5%)}
.ph-plant{position:absolute;right:9%;bottom:30%;height:30%;aspect-ratio:1;border-radius:50% 50% 46% 54%;background:radial-gradient(circle at 40% 40%,#a9b7a0,#7f9178);opacity:.85}
.ph-table{position:absolute;left:0;right:0;bottom:24%;height:4%;background:#8b6c4f}
.ph-table::after{content:"";position:absolute;left:34%;bottom:100%;width:min(26%,260px);aspect-ratio:16/10;background:linear-gradient(180deg,#d9d2c6,#c9c0b2);border:3px solid #6f5d4f;border-bottom:0;border-radius:4px 4px 0 0}
.ph-cap{position:absolute;left:12px;right:12px;bottom:12px;display:grid;gap:2px;padding:10px 12px;background:rgba(48,39,34,.82);color:#fffdfa;font:500 12px/1.4 var(--sans, system-ui, sans-serif);border-radius:2px;max-width:420px}
.ph-cap b{font-weight:600;letter-spacing:.02em}
.ph-cap span{opacity:.86}
`;

export const PREVIEW_BAR = (label) =>
  `<div class="preview-bar" role="note">Design preview · ${label} · Fictional demo content, not the live site</div>`;

export const MENU_JS = `
<script>
(function(){
  var btn=document.querySelector('[data-menu-btn]');var panel=document.getElementById('mobile-menu');
  if(!btn||!panel)return;
  function set(open){btn.setAttribute('aria-expanded',String(open));panel.hidden=!open;btn.querySelector('.mb-label').textContent=open?'Close':'Menu';if(open){var f=panel.querySelector('a');f&&f.focus();}}
  btn.addEventListener('click',function(){set(btn.getAttribute('aria-expanded')!=='true')});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&btn.getAttribute('aria-expanded')==='true'){set(false);btn.focus();}});
  panel.addEventListener('click',function(e){if(e.target.closest('a'))set(false)});
  document.querySelectorAll('a[href="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault()})});
})();
</script>`;

export const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
