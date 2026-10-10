import * as C from "./content.mjs";

// Concept B — Contemporary Concierge.
// Layout: a precise 12-column grid on porcelain. The hero pairs the headline with a photograph and an
// assessment summary panel set like a concierge itinerary; sage bands separate practical sections.
const icon = (name) => {
  const p = {
    badge: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13 7 21l5-2.5L17 21l-1.5-8"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  }[name];
  return `<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
};

export function conceptB() {
  const navLinks = C.NAV.map(([t, h]) => `<a href="${h}">${t}</a>`).join("");
  return `<title>LeaveBridge Concept B</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;500;600&display=swap">
<style>
/* Contemporary Concierge: porcelain ground, sage bands, forest for action, a summary panel as the signature. */
:root{
  --porcelain:#FFFDFA; --ivory:#F7F3EC; --espresso:#302722; --forest:#263C34; --forest-2:#1b2c25;
  --sage:#DDE5DA; --sage-2:#eef2ec; --gold:#B79A65; --taupe:#6B5F56; --sand:#E9E0D4;
  --serif:"Libre Baskerville", Baskerville, Georgia, serif;
  --sans:"Source Sans 3", "Segoe UI", Arial, sans-serif;
  --gut:clamp(16px,4vw,48px); --max:1200px; color-scheme:light;
}
*{box-sizing:border-box}
body{margin:0;background:var(--porcelain);color:var(--espresso);font:400 1.125rem/1.6 var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:var(--max);margin:0 auto;padding-inline:var(--gut)}
h1,h2,h3{font-family:var(--serif);font-weight:400;margin:0;text-wrap:balance;letter-spacing:-.015em}
p{margin:0}
:focus-visible{outline:2px solid var(--forest);outline-offset:3px}
.preview-bar{background:var(--forest);color:var(--porcelain);font:500 13px/1.4 var(--sans);text-align:center;padding:7px 16px}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font:600 .8rem/1.3 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--forest)}
.eyebrow::before{content:"";width:22px;border-top:1px solid var(--gold)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:.75em 1.4em;font:600 1rem/1 var(--sans);text-decoration:none;border-radius:6px;border:1px solid transparent;transition:background .2s,border-color .2s,color .2s}
.btn .ic{width:18px;height:18px;transition:transform .2s}
.btn:hover .ic{transform:translateX(3px)}
.btn-primary{background:var(--forest);color:var(--porcelain)}
.btn-primary:hover{background:var(--forest-2)}
.btn-line{border-color:#b9c4b5;color:var(--forest);background:var(--porcelain)}
.btn-line:hover{border-color:var(--forest)}
${C.PHOTO_CSS}

header{background:var(--porcelain);border-bottom:1px solid var(--sand);position:sticky;top:env(safe-area-inset-top,0px);z-index:10}
.nav{display:flex;align-items:center;gap:32px;min-height:78px}
.wordmark{display:inline-flex;align-items:center;gap:12px;text-decoration:none;color:var(--espresso)}
.wordmark .mark{color:var(--forest)}
.wm-text{display:flex;align-items:baseline;gap:9px;line-height:1}
.wm-name{font:400 1.32rem/1 var(--serif);letter-spacing:-.01em}
.wm-sub{font:600 .66rem/1 var(--sans);letter-spacing:.3em;text-transform:uppercase;color:var(--taupe);padding-left:10px;border-left:1px solid var(--gold)}
.nav-links{display:flex;gap:30px;margin-left:auto;font-weight:500;font-size:1rem}
.nav-links a{text-decoration:none;color:var(--espresso)}
.nav-links a:hover{color:var(--forest);text-decoration:underline;text-underline-offset:6px;text-decoration-color:var(--gold)}
.nav-end{display:flex;align-items:center;gap:18px;font-size:1rem;font-weight:500}
.nav-end .signin{text-decoration:none}
.nav-end .btn{min-height:44px}
.menu-btn{display:none;margin-left:auto;background:var(--sage-2);border:1px solid #c6d0c2;color:var(--forest);font:600 .95rem/1 var(--sans);padding:12px 16px;border-radius:6px;min-height:44px}
#mobile-menu{padding-block:8px 24px;border-top:1px solid var(--sand)}
#mobile-menu a{display:block;padding:15px 0;border-bottom:1px solid var(--sand);text-decoration:none;font-weight:500;font-size:1.1rem}
#mobile-menu .btn{width:100%;margin-top:18px;border:0}
@media (max-width:1000px){.nav-links,.nav-end{display:none}.menu-btn{display:inline-flex}}

.hero{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;padding-block:clamp(40px,6vw,88px) clamp(56px,7vw,96px);align-items:center}
.hero-text{grid-column:1 / span 6}
.hero h1{font-size:clamp(2.5rem,4.8vw,4.1rem);line-height:1.08;margin-top:22px}
.hero h1 i{color:var(--forest)}
.hero .sub{font-size:1.25rem;line-height:1.55;margin-top:24px;max-width:36ch;color:#4a3f38}
.hero .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.hero .note{margin-top:16px;font-size:1rem;color:var(--taupe);display:flex;gap:10px;align-items:flex-start;max-width:46ch}
.hero .note .ic{flex:none;color:var(--forest);margin-top:2px}
.hero-visual{grid-column:8 / span 5;position:relative;padding-bottom:110px}
.hero-visual .ph{aspect-ratio:5/6;border-radius:6px}
.hero-visual .ph .ph-cap{top:12px;bottom:auto}
.panel{position:absolute;left:-18%;right:14%;bottom:0;background:var(--porcelain);border:1px solid var(--sand);border-radius:8px;box-shadow:0 18px 40px -24px rgba(48,39,34,.35);padding:22px 24px}
.panel .ph-tag{font:600 .74rem/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--taupe)}
.panel h2{font-size:1.35rem;line-height:1.25;margin-top:10px}
.panel dl{margin:16px 0 0;display:grid;grid-template-columns:1fr auto;gap:0;border-top:1px solid var(--sand)}
.panel dt,.panel dd{padding:10px 0;border-bottom:1px solid var(--sand);font-size:.98rem;margin:0}
.panel dt{color:var(--taupe)}
.panel dd{text-align:right;font-weight:600}
.panel dd.price{font:400 1.45rem/1 var(--serif);font-variant-numeric:lining-nums tabular-nums;color:var(--forest)}
.panel .btn{width:100%;margin-top:16px}
@media (max-width:900px){.hero-text,.hero-visual{grid-column:1 / -1}.hero-visual{padding-bottom:0;display:grid;gap:16px}.panel{position:static}}

.trust-band{background:var(--sage)}
.trust{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;padding-block:32px}
.trust div{display:grid;grid-template-columns:44px 1fr;gap:4px 14px;align-items:start}
.trust .ic{grid-row:span 2;width:44px;height:44px;padding:10px;border:1px solid #b9c7b4;border-radius:50%;color:var(--forest);background:var(--sage-2)}
.trust h2{font:600 1.05rem/1.3 var(--sans);letter-spacing:0}
.trust p{font-size:.98rem;color:#4f453e}
@media (max-width:800px){.trust{grid-template-columns:1fr}}

section.block{padding-block:clamp(64px,8vw,112px)}
.head{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;align-items:end}
.head > div{grid-column:1 / span 7}
.head > p{grid-column:9 / span 4;color:var(--taupe)}
.head h2{font-size:clamp(1.9rem,3.2vw,2.75rem);line-height:1.15;margin-top:16px}
@media (max-width:900px){.head > div,.head > p{grid-column:1 / -1}}

.understand{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;margin-top:48px}
.understand .prose{grid-column:1 / span 6;display:grid;gap:18px;max-width:58ch}
.understand .fit{grid-column:8 / span 5;display:grid;gap:16px}
.fitcard{border:1px solid var(--sand);border-radius:8px;padding:22px 24px;background:var(--porcelain)}
.fitcard.yes{background:var(--sage-2);border-color:#d3dccf}
.fitcard h3{font:600 .82rem/1.3 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--forest)}
.fitcard ul{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:8px;font-size:1rem}
.fitcard li{display:flex;gap:10px}
.fitcard li .ic{flex:none;width:18px;height:18px;margin-top:4px;color:var(--forest)}
.fitcard.no li::before{content:"";flex:none;width:10px;border-top:1px solid var(--taupe);margin:13px 4px 0}
.disclose{font-size:1rem;padding:16px 20px;border-left:2px solid var(--gold);background:var(--ivory)}
@media (max-width:900px){.understand .prose,.understand .fit{grid-column:1 / -1}}

.process{background:var(--ivory);border-top:1px solid var(--sand);border-bottom:1px solid var(--sand)}
.timeline{list-style:none;padding:0;margin:56px 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;position:relative}
.timeline::before{content:"";position:absolute;left:24px;right:24px;top:24px;border-top:1px solid var(--gold)}
.timeline > li{position:relative;display:grid;gap:14px;align-content:start}
.timeline .num{width:48px;height:48px;border-radius:50%;background:var(--forest);color:var(--porcelain);display:grid;place-items:center;font:400 1.15rem/1 var(--serif);position:relative}
.timeline .card{background:var(--porcelain);border:1px solid var(--sand);border-radius:8px;padding:24px;display:grid;gap:12px;height:100%}
.timeline h3{font-size:1.4rem;line-height:1.25}
.timeline .lede{font-weight:500}
.timeline ul{list-style:none;padding:0;margin:4px 0 0;display:grid;gap:9px;font-size:.98rem;color:#4f453e;border-top:1px solid var(--sand);padding-top:14px}
.timeline ul li{display:flex;gap:10px}
.timeline ul .ic{flex:none;width:17px;height:17px;margin-top:4px;color:var(--forest)}
@media (max-width:900px){.timeline{grid-template-columns:1fr}.timeline::before{left:23px;right:auto;top:24px;bottom:24px;border-top:0;border-left:1px solid var(--gold)}.timeline > li{grid-template-columns:48px 1fr;gap:16px}}

.prices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:48px;align-items:stretch}
.svc{border:1px solid var(--sand);border-radius:8px;background:var(--porcelain);display:grid;grid-template-rows:auto 1fr auto;overflow:hidden}
.svc .top{padding:26px 26px 22px;border-bottom:1px solid var(--sand);display:grid;gap:10px}
.svc.feature .top{background:var(--forest);color:var(--porcelain);border-color:var(--forest)}
.svc.feature .top .for{color:#dfe7df}
.svc.feature .top .unit{color:#c9d5c9}
.svc h3{font-size:1.3rem;line-height:1.25}
.svc .amount{display:flex;align-items:baseline;gap:8px}
.svc .price{font:400 2.3rem/1 var(--serif);font-variant-numeric:lining-nums tabular-nums}
.svc .unit{font-size:.92rem;color:var(--taupe)}
.svc .for{font-size:1rem;color:#4f453e}
.svc .body{padding:22px 26px;display:grid;gap:16px;align-content:start;font-size:1rem}
.svc .body h4{margin:0;font:600 .78rem/1.3 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--taupe)}
.svc .body ul{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:7px}
.svc .body ul li{display:flex;gap:10px}
.svc .body .ic{flex:none;width:17px;height:17px;margin-top:4px;color:var(--forest)}
.svc .body p{margin-top:6px}
.svc .foot{padding:0 26px 26px}
.svc .foot .btn{width:100%}
@media (max-width:960px){.prices{grid-template-columns:1fr}}

.clin{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;margin-top:48px;align-items:start}
.clin .ph{grid-column:1 / span 4;aspect-ratio:4/5;border-radius:6px}
.clin .info{grid-column:6 / span 7;display:grid;gap:18px}
.clin h3{font-size:clamp(2rem,3.4vw,2.8rem);line-height:1.1}
.clin .post{font-weight:600;color:var(--forest);font-size:1.05rem}
.clin table{border-collapse:collapse;width:100%;font-size:1rem}
.clin th,.clin td{text-align:left;padding:12px 0;border-bottom:1px solid var(--sand);vertical-align:top}
.clin th{font:600 .78rem/1.8 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--taupe);width:150px;padding-right:16px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{border:1px solid #c6d0c2;background:var(--sage-2);color:var(--forest);font-weight:600;font-size:.92rem;padding:6px 12px;border-radius:999px}
.missing{padding:16px 18px;border:1px dashed var(--gold);border-radius:6px;background:var(--ivory);font-size:.98rem}
@media (max-width:900px){.clin .ph{grid-column:1 / -1;max-width:420px}.clin .info{grid-column:1 / -1}.clin th{width:110px}}

.exp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;margin-top:40px}
.exp > div{border-top:2px solid var(--forest);padding-top:18px}
.exp h3{font-size:1.2rem;line-height:1.3}
.exp p{margin-top:8px;font-size:1rem;color:#4f453e}
@media (max-width:960px){.exp{grid-template-columns:1fr 1fr}}
@media (max-width:560px){.exp{grid-template-columns:1fr}}
.credbox{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(24px,5vw,72px);padding:clamp(24px,4vw,44px);border:1px solid var(--sand);border-radius:8px;background:var(--porcelain)}
.credbox h2{font-size:1.6rem;margin-top:12px}
.credbox p{margin-top:12px;color:var(--taupe);font-size:1rem}
.credbox table{border-collapse:collapse;width:100%;font-size:1rem}
.credbox th,.credbox td{text-align:left;padding:11px 0;border-bottom:1px solid var(--sand);vertical-align:top}
.credbox th{font:600 .78rem/1.8 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--taupe);width:150px;padding-right:16px}
.tbd{font-style:italic;color:var(--taupe)}
@media (max-width:860px){.credbox{grid-template-columns:1fr}.credbox th{width:110px}}
.faq-band{background:var(--sage-2);border-top:1px solid #d3dccf}
.faq{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px;margin-top:40px;align-items:start}
details{background:var(--porcelain);border:1px solid #d3dccf;border-radius:8px}
summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px;font-weight:600;font-size:1.05rem}
summary::-webkit-details-marker{display:none}
summary::after{content:"";flex:none;width:9px;height:9px;border-right:1.5px solid var(--forest);border-bottom:1.5px solid var(--forest);transform:rotate(45deg) translateY(-3px);transition:transform .2s}
details[open] summary::after{transform:rotate(-135deg) translateY(-2px)}
details p{padding:0 20px 20px;color:#4a3f38;font-size:1.02rem}
@media (max-width:860px){.faq{grid-template-columns:1fr}}

.final{background:var(--forest);color:var(--porcelain)}
.final .wrap{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;align-items:center;padding-block:72px}
.final h2{grid-column:1 / span 7;font-size:clamp(2rem,3.6vw,3rem);line-height:1.12}
.final .side{grid-column:9 / span 4;display:grid;gap:18px}
.final p{color:#dbe4dc}
.final .btn{background:var(--porcelain);color:var(--forest)}
.final .btn:hover{background:var(--sage)}
@media (max-width:900px){.final h2,.final .side{grid-column:1 / -1}}

footer{background:var(--ivory);padding-block:64px 36px;font-size:1rem;border-top:1px solid var(--sand)}
.fgrid{display:grid;grid-template-columns:minmax(0,4fr) repeat(3,minmax(0,2fr));gap:36px}
footer h3{font:600 .8rem/1.3 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--taupe);margin-bottom:12px}
footer ul{list-style:none;padding:0;margin:0;display:grid;gap:9px}
footer a{text-decoration:none}footer a:hover{text-decoration:underline;text-decoration-color:var(--gold)}
footer .disc{margin-top:48px;padding:20px 22px;border:1px solid var(--sand);border-radius:8px;background:var(--porcelain);display:grid;gap:8px;font-size:.96rem}
@media (max-width:860px){.fgrid{grid-template-columns:1fr 1fr}.fgrid > div:first-child{grid-column:1 / -1}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

${C.PREVIEW_BAR("Concept B, Contemporary Concierge")}
<header>
  <div class="wrap nav">
    ${C.wordmark({ accent: "var(--gold)" })}
    <nav class="nav-links" aria-label="Main">${navLinks}</nav>
    <div class="nav-end"><a class="signin" href="#">Patient Sign In</a><a class="btn btn-primary" href="#">Begin Your Assessment</a></div>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-btn><span class="mb-label">Menu</span></button>
  </div>
  <div id="mobile-menu" class="wrap" hidden>
    <nav aria-label="Mobile">${navLinks}<a href="#">Patient Sign In</a></nav>
    <a class="btn btn-primary" href="#">Begin Your Assessment</a>
  </div>
</header>

<main id="top">
  <div class="wrap hero">
    <div class="hero-text">
      <p class="eyebrow">${C.HERO.eyebrow}</p>
      <h1>Your Wellbeing Deserves <i>Exceptional</i> Care.</h1>
      <p class="sub">${C.HERO.sub}</p>
      <div class="actions">
        <a class="btn btn-primary" href="#">${C.HERO.primary} ${icon("arrow")}</a>
        <a class="btn btn-line" href="#services">${C.HERO.secondary}</a>
      </div>
      <p class="note">${icon("check")}<span>${C.HERO.note}</span></p>
    </div>
    <div class="hero-visual">
      ${C.photo("", "1500 × 1800 px, 5:6", "Warm, uncluttered home study: window light across an oak desk, closed laptop, ceramic cup, linen curtain. Detail-led, no person as the focal point.")}
      <aside class="panel" aria-labelledby="panel-title">
        <span class="ph-tag">Your assessment</span>
        <h2 id="panel-title">Mental Health Leave Assessment</h2>
        <dl>
          <dt>Format</dt><dd>Online clinical assessment</dd>
          <dt>Provided by</dt><dd>Licensed professional counselor</dd>
          <dt>Fee</dt><dd class="price">${C.PRICES.assessment}</dd>
        </dl>
        <a class="btn btn-primary" href="#">Start your screening ${icon("arrow")}</a>
      </aside>
    </div>
  </div>

  <div class="trust-band"><div class="wrap trust">
    ${C.TRUST.map(([t, d], i) => `<div>${icon(["badge", "screen", "lock"][i])}<h2>${t}</h2><p>${d}</p></div>`).join("")}
  </div></div>

  <section class="block" aria-labelledby="e-title" style="padding-bottom:0">
    <div class="wrap">
      <div class="head"><div><p class="eyebrow">The experience</p><h2 id="e-title">Expert care, arranged around your life.</h2></div></div>
      <div class="exp">${C.EXPERIENCE.map(([t, d]) => `<div><h3>${t}</h3><p>${d}</p></div>`).join("")}</div>
    </div>
  </section>

  <section class="block" aria-labelledby="u-title">
    <div class="wrap">
      <div class="head"><div><p class="eyebrow">Our service</p><h2 id="u-title">${C.UNDERSTAND.heading}</h2></div></div>
      <div class="understand">
        <div class="prose">${C.UNDERSTAND.body.map((p) => `<p>${p}</p>`).join("")}<p class="disclose">${C.UNDERSTAND.qualification}</p></div>
        <div class="fit">
          <div class="fitcard yes"><h3>This may be right for you</h3><ul>${C.UNDERSTAND.forYou.map((x) => `<li>${icon("check")}<span>${x}</span></li>`).join("")}</ul></div>
          <div class="fitcard no"><h3>We do not provide</h3><ul>${C.UNDERSTAND.notFor.map((x) => `<li><span>${x}</span></li>`).join("")}</ul></div>
        </div>
      </div>
    </div>
  </section>

  <section class="block process" id="how" aria-labelledby="h-title">
    <div class="wrap">
      <div class="head"><div><p class="eyebrow">How it works</p><h2 id="h-title">Three clear stages, handled in one secure portal.</h2></div><p>Every clinical decision is made by your clinician. No software makes it, and payment never decides it.</p></div>
      <ol class="timeline">
        ${C.STEPS.map((s, i) => `<li><span class="num" aria-hidden="true">${i + 1}</span><div class="card"><h3>${s.title}</h3><p class="lede">${s.lede}</p><ul>${s.details.map((d) => `<li>${icon("check")}<span>${d}</span></li>`).join("")}</ul></div></li>`).join("")}
      </ol>
    </div>
  </section>

  <section class="block" id="services" aria-labelledby="s-title">
    <div class="wrap">
      <div class="head"><div><p class="eyebrow">Services and pricing</p><h2 id="s-title">One clear fee for each service.</h2></div><p>Self-pay, no subscription, no insurance billing. Fees cover clinical work, never a particular outcome.</p></div>
      <div class="prices">
        ${C.SERVICES.map((s) => `<article class="svc${s.id === "assessment" ? " feature" : ""}" aria-labelledby="svc-${s.id}">
          <div class="top"><h3 id="svc-${s.id}">${s.name}</h3><div class="amount"><span class="price">${s.price}</span><span class="unit">${s.unit}</span></div><p class="for">${s.forWho}</p></div>
          <div class="body">
            <div><h4>Included</h4><ul>${s.includes.map((x) => `<li>${icon("check")}<span>${x}</span></li>`).join("")}</ul></div>
            <div><h4>Before you start</h4><p>${s.prereq}</p></div>
            <div><h4>Scope</h4><p>${s.scope}</p></div>
          </div>
          <div class="foot"><a class="btn ${s.id === "assessment" ? "btn-primary" : "btn-line"}" href="#">${s.cta}</a></div>
        </article>`).join("")}
      </div>
    </div>
  </section>

  <section class="block" id="credentials" aria-labelledby="c-title" style="padding-top:0">
    <div class="wrap">
      <div class="credbox">
        <div><p class="eyebrow">Clinical credentials</p><h2 id="c-title">Who provides your care</h2><p>${C.CLINICIAN.intro}</p></div>
        <table><tbody>
          <tr><th scope="row">Clinician</th><td>${C.CLINICIAN.name}, ${C.CLINICIAN.post}</td></tr>
          ${C.CLINICIAN.credentials.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join("")}
          <tr><th scope="row">Serves</th><td><div class="chips">${C.STATES.map((s) => `<span class="chip">${s}</span>`).join("")}</div></td></tr>
          <tr><th scope="row">License numbers</th><td class="tbd">${C.CLINICIAN.licensePlaceholder}</td></tr>
        </tbody></table>
      </div>
    </div>
  </section>

  <section class="block faq-band" id="faq" aria-labelledby="f-title">
    <div class="wrap">
      <div class="head"><div><p class="eyebrow">FAQs</p><h2 id="f-title">Answers before you begin.</h2></div><p>Still have a question? Email ${C.FOOTER.contact}.</p></div>
      <div class="faq">${C.FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
    </div>
  </section>

  <section class="final" aria-labelledby="final-title">
    <div class="wrap">
      <h2 id="final-title">${C.FINAL.heading}</h2>
      <div class="side"><p>${C.FINAL.body}</p><a class="btn" href="#">${C.FINAL.cta} ${icon("arrow")}</a></div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="fgrid">
      <div>${C.wordmark({ accent: "var(--gold)" })}<p style="margin-top:16px;max-width:34ch;color:var(--taupe)">${C.FOOTER.blurb}</p><p style="margin-top:12px">${C.FOOTER.contact}</p></div>
      <div><h3>Services</h3><ul>${C.FOOTER.services.map((x) => `<li><a href="#services">${x}</a></li>`).join("")}</ul></div>
      <div><h3>Practice</h3><ul><li><a href="#how">How It Works</a></li><li><a href="#credentials">About</a></li><li><a href="#faq">FAQs</a></li><li><a href="#">Patient Sign In</a></li></ul></div>
      <div><h3>Policies</h3><ul>${C.FOOTER.legal.map((x) => `<li><a href="#">${x}</a></li>`).join("")}</ul></div>
    </div>
    <div class="disc"><p><b>In crisis?</b> ${C.FOOTER.emergency}</p><p>${C.FOOTER.clinical}</p><p style="color:var(--taupe)">© 2026 LeaveBridge Health</p></div>
  </div>
</footer>
${C.MENU_JS}`;
}
