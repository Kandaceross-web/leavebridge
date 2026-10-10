import * as C from "./content.mjs";

// Concept A — Editorial Private Care.
// Layout: a magazine spread. Huge serif headline beside one tall portrait photograph, hairline rules,
// a menu-style price list with dotted leaders, and a profile set like a feature article.
export function conceptA() {
  const navLinks = C.NAV.map(([t, h]) => `<a href="${h}">${t}</a>`).join("");
  return `<title>LeaveBridge Concept A</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap">
<style>
/* Editorial Private Care: ivory page, espresso type, one tall photograph, hairlines instead of boxes. */
:root{
  --ivory:#F7F3EC; --porcelain:#FFFDFA; --espresso:#302722; --forest:#263C34; --forest-2:#1d2f28;
  --sage:#DDE5DA; --gold:#B79A65; --taupe:#6E6259; --sand:#E9E0D4; --line:#d8ccbb;
  --serif:"Cormorant Garamond", "Iowan Old Style", Georgia, serif;
  --sans:"Inter", "Helvetica Neue", Arial, sans-serif;
  --step-0:1.0625rem; --step-1:1.25rem; --step-2:1.75rem; --step-3:clamp(2.1rem,3.4vw,2.9rem); --step-4:clamp(2.9rem,6.6vw,5.9rem);
  --gut:clamp(16px,4vw,56px); --max:1240px; color-scheme:light;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ivory);color:var(--espresso);font:400 var(--step-0)/1.65 var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:var(--max);margin:0 auto;padding-inline:var(--gut)}
h1,h2,h3{font-family:var(--serif);font-weight:500;line-height:1.05;margin:0;text-wrap:balance;letter-spacing:-.01em}
p{margin:0}
:focus-visible{outline:2px solid var(--forest);outline-offset:3px}
.preview-bar{background:var(--espresso);color:var(--porcelain);font:500 12.5px/1.4 var(--sans);text-align:center;padding:7px 16px;letter-spacing:.02em}
.eyebrow{font:500 .78rem/1.3 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--taupe)}
.rule{border:0;border-top:1px solid var(--line);margin:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.6em;min-height:48px;padding:.8em 1.5em;font:500 .98rem/1 var(--sans);text-decoration:none;border-radius:2px;border:1px solid transparent;transition:background .25s,color .25s,border-color .25s}
.btn-primary{background:var(--forest);color:var(--porcelain)}
.btn-primary:hover{background:var(--forest-2)}
.btn-ghost{border-color:var(--espresso);color:var(--espresso)}
.btn-ghost:hover{background:var(--espresso);color:var(--porcelain)}
.link{font-weight:500;text-decoration:underline;text-decoration-color:var(--gold);text-underline-offset:5px;text-decoration-thickness:1px}
.link:hover{text-decoration-color:var(--espresso)}
${C.PHOTO_CSS}

/* header */
header{border-bottom:1px solid var(--line);background:var(--ivory);position:sticky;top:env(safe-area-inset-top,0px);z-index:10}
.nav{display:flex;align-items:center;gap:28px;min-height:76px}
.wordmark{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--espresso)}
.wordmark .mark{color:var(--espresso)}
.wm-text{display:grid;line-height:1}
.wm-name{font:500 1.7rem/1 var(--serif);letter-spacing:.005em}
.wm-sub{font:500 .6rem/1 var(--sans);letter-spacing:.42em;text-transform:uppercase;color:var(--taupe);margin-top:4px;padding-left:2px}
.nav-links{display:flex;gap:28px;margin-left:auto;font-size:.95rem}
.nav-links a{text-decoration:none;padding:6px 0;border-bottom:1px solid transparent}
.nav-links a:hover{border-color:var(--gold)}
.nav-end{display:flex;align-items:center;gap:20px;font-size:.95rem}
.nav-end .signin{text-decoration:none}
.menu-btn{display:none;margin-left:auto;background:none;border:1px solid var(--espresso);color:var(--espresso);font:500 .9rem/1 var(--sans);padding:12px 16px;border-radius:2px;min-height:44px}
#mobile-menu{border-top:1px solid var(--line);padding-block:12px 24px}
#mobile-menu a{display:block;padding:14px 0;border-bottom:1px solid var(--line);text-decoration:none;font:500 1.5rem/1.2 var(--serif)}
#mobile-menu .btn{margin-top:20px;width:100%;font-family:var(--sans);font-size:1rem;border:0}
@media (max-width:980px){.nav-links,.nav-end{display:none}.menu-btn{display:inline-flex}}

/* hero */
.hero{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:clamp(32px,5vw,80px);padding-block:clamp(40px,7vw,96px) clamp(48px,7vw,104px);align-items:center}
.hero h1{font-size:var(--step-4);font-weight:400;margin-top:22px}
.hero h1 em{font-style:italic;color:var(--forest)}
.hero .sub{font-size:var(--step-1);line-height:1.55;max-width:34ch;margin-top:26px;color:var(--espresso)}
.hero .actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
.hero .note{margin-top:16px;font-size:.95rem;color:var(--taupe);max-width:46ch}
.lineitem{margin-top:44px;display:grid;grid-template-columns:1fr auto;gap:4px 24px;padding:18px 0;border-top:1px solid var(--espresso);border-bottom:1px solid var(--line);max-width:560px}
.lineitem .li-name{font:500 1.35rem/1.2 var(--serif)}
.lineitem .li-meta{font-size:.9rem;color:var(--taupe)}
.lineitem .li-price{grid-row:1 / span 2;grid-column:2;align-self:center;font:500 2rem/1 var(--serif);font-variant-numeric:lining-nums tabular-nums}
.lineitem a{grid-column:1 / -1;margin-top:8px;font-size:.95rem}
.hero-photo{position:relative}
.hero-photo .ph{aspect-ratio:4/5;width:100%}
.hero-photo::before{content:"";position:absolute;inset:-14px 14px 14px -14px;border:1px solid var(--gold);pointer-events:none}
@media (max-width:860px){.hero{grid-template-columns:1fr;align-items:start}.hero-photo::before{display:none}.hero-photo .ph{aspect-ratio:4/4.4}}

/* key visual + booking bar (Clinique La Prairie reference: one key visual, a booking-style summary) */
.kv{position:relative;isolation:isolate;display:grid}
.kv .ph{grid-area:1/1;width:100%;height:100%;min-height:640px}
.kv .ph .ph-cap{left:auto;right:16px;top:16px;bottom:auto}
.kv-text{position:relative;z-index:1;grid-area:1/1;align-self:end;padding-block:220px 72px;background:linear-gradient(180deg,rgba(48,39,34,0) 0%,rgba(48,39,34,.62) 40%,rgba(38,31,27,.88) 100%);color:var(--porcelain)}
.kv .eyebrow{color:#e6dccd}
.kv h1{font-size:clamp(2.7rem,5.6vw,5.1rem);font-weight:400;margin-top:18px;max-width:17ch}
.kv h1 em{color:#e9dcc2}
.kv .sub{font-size:var(--step-1);line-height:1.5;max-width:44ch;margin-top:20px}
.kv .actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}
.kv .note{margin-top:14px;font-size:.95rem;color:#e6dccd;max-width:50ch}
.btn-light{background:var(--porcelain);color:var(--espresso)}
.btn-light:hover{background:var(--sand)}
.btn-outline-light{border-color:rgba(255,253,250,.75);color:var(--porcelain)}
.btn-outline-light:hover{background:rgba(255,253,250,.12)}
.bookbar{position:relative;margin-top:-1px;display:grid;grid-template-columns:1.4fr 1.2fr .8fr auto;align-items:center;gap:0;background:var(--porcelain);border:1px solid var(--line);border-top:2px solid var(--gold)}
.bookbar > div{display:grid;gap:4px;padding:22px 28px;border-right:1px solid var(--line)}
.bb-label{font:600 .72rem/1.3 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--taupe)}
.bb-val{font:500 1.3rem/1.25 var(--serif)}
.bb-price{font-size:1.7rem;font-variant-numeric:lining-nums tabular-nums}
.bookbar .btn{margin:16px 24px}
@media (max-width:860px){
  .kv .ph{min-height:0}
  .kv .ph .ph-cap{left:12px;right:12px}
  .kv-text{padding-block:230px 40px;background:linear-gradient(180deg,rgba(48,39,34,.15) 0%,rgba(48,39,34,.7) 30%,rgba(38,31,27,.9) 100%)}
  .bookbar{grid-template-columns:1fr 1fr}
  .bookbar > div:first-child{grid-column:1 / -1;border-bottom:1px solid var(--line)}
  .bookbar > div{padding:16px 18px}
  .bookbar > div:nth-child(3){border-right:0}
  .bookbar .btn{grid-column:1 / -1;margin:0 18px 18px}
}
h2 em{font-style:italic;color:var(--forest)}
.final h2 em{color:var(--forest)}

/* trust */
.trust{margin-top:clamp(40px,5vw,72px);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.trust div{padding:28px clamp(16px,2.5vw,36px);border-left:1px solid var(--line)}
.trust div:first-child{border-left:0;padding-left:0}
.trust h2{font:500 1.35rem/1.2 var(--serif)}
.trust p{font-size:.94rem;color:var(--taupe);margin-top:6px}
@media (max-width:760px){.trust{grid-template-columns:1fr}.trust div{border-left:0;border-top:1px solid var(--line);padding-inline:0}.trust div:first-child{border-top:0}}

section.block{padding-block:clamp(64px,9vw,128px)}
.split{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,6vw,96px)}
@media (max-width:860px){.split{grid-template-columns:1fr}}
.block h2.big{font-size:var(--step-3);margin-top:16px}
.prose{display:grid;gap:18px;max-width:60ch}
.prose p:first-child{font:400 1.6rem/1.45 var(--serif)}
.fit{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px}
.fit h3{font:600 .78rem/1.3 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--taupe);padding-bottom:12px;border-bottom:1px solid var(--line)}
.fit ul{list-style:none;padding:0;margin:0}
.fit li{padding:12px 0;border-bottom:1px solid var(--line);font-size:.98rem}
@media (max-width:560px){.fit{grid-template-columns:1fr}}
.disclose{margin-top:36px;padding:20px 24px;background:var(--porcelain);border:1px solid var(--line);font-size:.95rem;max-width:62ch}
.disclose b{font-weight:600}

/* process */
.process{background:var(--porcelain);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(24px,4vw,64px);margin-top:56px;list-style:none;padding:0}
.steps li{border-top:1px solid var(--espresso);padding-top:24px;display:grid;gap:14px;align-content:start}
.steps .num{font:italic 400 3.4rem/1 var(--serif);color:var(--gold)}
.steps h3{font-size:var(--step-2)}
.steps .lede{font-size:1rem}
.steps ul{margin:6px 0 0;padding:0;list-style:none;display:grid;gap:10px;font-size:.93rem;color:var(--taupe)}
.steps ul li{border:0;padding:0 0 0 18px;position:relative;display:block}
.steps ul li::before{content:"";position:absolute;left:0;top:.75em;width:8px;border-top:1px solid var(--gold)}
@media (max-width:860px){.steps{grid-template-columns:1fr}}

/* pricing */
.menu{margin-top:56px;border-top:1px solid var(--espresso)}
.menu-item{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px 64px;padding-block:40px;border-bottom:1px solid var(--line)}
.menu-head{grid-column:1 / -1;display:flex;align-items:baseline;gap:16px}
.menu-head h3{font-size:var(--step-2);white-space:nowrap}
.menu-head .dots{flex:1;border-bottom:1px dotted var(--taupe);transform:translateY(-6px);min-width:24px}
.menu-head .price{font:500 2.1rem/1 var(--serif);font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.menu-head .unit{font-size:.85rem;color:var(--taupe);white-space:nowrap}
.menu-item .for{font:italic 400 1.3rem/1.45 var(--serif);max-width:40ch}
.menu-item dl{margin:0;display:grid;gap:14px;font-size:.94rem}
.menu-item dt{font:600 .72rem/1.3 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--taupe)}
.menu-item dd{margin:4px 0 0}
.menu-item ul{margin:0;padding-left:1.1em}
.menu-item .act{grid-column:1;align-self:end}
@media (max-width:760px){.menu-item{grid-template-columns:1fr}.menu-head{flex-wrap:wrap}.menu-head h3{white-space:normal;flex-basis:100%}.menu-head .dots{display:none}}

/* experience + credentials */
.exp{padding-block:clamp(56px,7vw,104px)}
.exp-list{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:36px 48px}
.exp-list dt{font:500 1.45rem/1.2 var(--serif);padding-top:16px;border-top:1px solid var(--gold)}
.exp-list dd{margin:10px 0 0;color:var(--taupe);font-size:.98rem}
@media (max-width:620px){.exp-list{grid-template-columns:1fr}}
.tbd{font-style:italic;color:var(--taupe)}
.profile{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,6vw,96px);align-items:start}
.profile .ph{aspect-ratio:4/5}
.profile h2{font-size:var(--step-4);font-weight:400;margin-top:14px}
.profile .post{font:italic 400 1.5rem/1.3 var(--serif);color:var(--taupe);margin-top:8px}
.creds{margin:32px 0 0;padding:0;list-style:none;border-top:1px solid var(--espresso)}
.creds li{display:grid;grid-template-columns:140px 1fr;gap:16px;padding:14px 0;border-bottom:1px solid var(--line);font-size:.96rem}
.creds li span:first-child{font:600 .72rem/1.9 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--taupe)}
.missing{display:inline-block;margin-top:24px;padding:14px 18px;border:1px dashed var(--gold);background:var(--porcelain);font-size:.92rem;color:var(--espresso);max-width:60ch}
.missing b{font-weight:600}
@media (max-width:860px){.profile{grid-template-columns:1fr}.creds li{grid-template-columns:1fr;gap:2px}}

/* faq */
.faq-grid{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:clamp(32px,6vw,96px)}
.faq-grid .intro{position:sticky;top:110px;align-self:start}
details{border-bottom:1px solid var(--line)}
details:first-of-type{border-top:1px solid var(--espresso)}
summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:24px;padding:22px 0;font:500 1.4rem/1.3 var(--serif)}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";font:300 1.6rem/1 var(--sans);color:var(--gold);transition:transform .25s}
details[open] summary::after{transform:rotate(45deg)}
details p{padding:0 0 24px;max-width:62ch;color:var(--espresso)}
@media (max-width:860px){.faq-grid{grid-template-columns:1fr}.faq-grid .intro{position:static}}

/* final + footer */
.final{text-align:center;padding-block:clamp(72px,10vw,140px);border-top:1px solid var(--line)}
.final h2{font-size:var(--step-4);font-weight:400;max-width:14ch;margin:0 auto}
.final p{margin:22px auto 34px;color:var(--taupe)}
footer{background:var(--espresso);color:#efe7dc;padding-block:72px 40px;font-size:.93rem}
footer .wordmark{color:var(--porcelain)}footer .wordmark .mark{color:var(--porcelain)}
footer .wm-sub{color:#cdbfae}
.fgrid{display:grid;grid-template-columns:minmax(0,4fr) repeat(3,minmax(0,2fr));gap:40px}
footer h3{font:600 .72rem/1.3 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:#cdbfae;margin-bottom:14px}
footer ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
footer a{text-decoration:none}footer a:hover{text-decoration:underline;text-decoration-color:var(--gold)}
footer .disc{margin-top:56px;padding-top:24px;border-top:1px solid #4d4038;display:grid;gap:10px;color:#d9cdbf;max-width:90ch}
footer .disc b{color:var(--porcelain)}
@media (max-width:860px){.fgrid{grid-template-columns:1fr 1fr}.fgrid > div:first-child{grid-column:1 / -1}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
</style>

${C.PREVIEW_BAR("Concept A, Maison (after Clinique La Prairie)")}
<header>
  <div class="wrap nav">
    ${C.wordmark()}
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
  <div class="kv">
    ${C.photo("", "2400 × 1200 px, 2:1 (mobile crop 4:5)", "Architectural key visual: a quiet consulting room or reading room with tall windows, morning light on plaster, linen and oak. No person as the focal point.")}
    <div class="kv-text"><div class="wrap">
      <p class="eyebrow">${C.HERO.eyebrow}</p>
      <h1>Your Wellbeing Deserves <em>Exceptional</em> Care.</h1>
      <p class="sub">${C.HERO.sub}</p>
      <div class="actions">
        <a class="btn btn-light" href="#">${C.HERO.primary}</a>
        <a class="btn btn-outline-light" href="#services">${C.HERO.secondary}</a>
      </div>
      <p class="note">${C.HERO.note}</p>
    </div></div>
  </div>
  <div class="wrap">
    <div class="bookbar" aria-label="Assessment summary">
      <div><span class="bb-label">Service</span><span class="bb-val">Mental Health Leave Assessment</span></div>
      <div><span class="bb-label">Format</span><span class="bb-val">Online clinical assessment</span></div>
      <div><span class="bb-label">Fee</span><span class="bb-val bb-price">${C.PRICES.assessment}</span></div>
      <a class="btn btn-primary" href="#">Begin Your Assessment</a>
    </div>
  </div>

  <div class="wrap"><div class="trust">
    ${C.TRUST.map(([t, d]) => `<div><h2>${t}</h2><p>${d}</p></div>`).join("")}
  </div></div>

  <section class="block" aria-labelledby="u-title">
    <div class="wrap split">
      <div><p class="eyebrow">Our service</p><h2 id="u-title" class="big">${C.H.understand}</h2></div>
      <div>
        <div class="prose">${C.UNDERSTAND.body.map((p) => `<p>${p}</p>`).join("")}</div>
        <div class="fit">
          <div><h3>This may be right for you</h3><ul>${C.UNDERSTAND.forYou.map((x) => `<li>${x}</li>`).join("")}</ul></div>
          <div><h3>We do not provide</h3><ul>${C.UNDERSTAND.notFor.map((x) => `<li>${x}</li>`).join("")}</ul></div>
        </div>
        <p class="disclose"><b>Before you begin.</b> ${C.UNDERSTAND.qualification}</p>
      </div>
    </div>
  </section>

  <section class="block exp" aria-labelledby="e-title">
    <div class="wrap split">
      <div><p class="eyebrow">The experience</p><h2 id="e-title" class="big">${C.H.experience}</h2></div>
      <dl class="exp-list">${C.EXPERIENCE.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join("")}</dl>
    </div>
  </section>

  <section class="block process" id="how" aria-labelledby="h-title">
    <div class="wrap">
      <p class="eyebrow">How it works</p>
      <h2 id="h-title" class="big" style="max-width:18ch">${C.H.how}</h2>
      <ol class="steps">
        ${C.STEPS.map((s, i) => `<li><span class="num" aria-hidden="true">${["i.", "ii.", "iii."][i]}</span><h3>${s.title}</h3><p class="lede">${s.lede}</p><ul>${s.details.map((d) => `<li>${d}</li>`).join("")}</ul></li>`).join("")}
      </ol>
    </div>
  </section>

  <section class="block" id="services" aria-labelledby="s-title">
    <div class="wrap">
      <div class="split" style="align-items:end">
        <div><p class="eyebrow">Services and pricing</p><h2 id="s-title" class="big">${C.H.services}</h2></div>
        <p style="max-width:52ch;color:var(--taupe)">Self-pay, with no subscription. We do not bill insurance. Each fee covers the clinical work described, never a particular outcome.</p>
      </div>
      <div class="menu">
        ${C.SERVICES.map((s) => `<article class="menu-item" aria-labelledby="svc-${s.id}">
          <div class="menu-head"><h3 id="svc-${s.id}">${s.name}</h3><span class="dots" aria-hidden="true"></span><span class="price">${s.price}</span><span class="unit">${s.unit}</span></div>
          <div style="display:grid;gap:24px;align-content:space-between"><p class="for">${s.forWho}</p><a class="${s.id === "assessment" ? "btn btn-primary" : "btn btn-ghost"} act" href="#">${s.cta}</a></div>
          <dl>
            <div><dt>Included</dt><dd><ul>${s.includes.map((x) => `<li>${x}</li>`).join("")}</ul></dd></div>
            <div><dt>Before you start</dt><dd>${s.prereq}</dd></div>
            <div><dt>Scope</dt><dd>${s.scope}</dd></div>
          </dl>
        </article>`).join("")}
      </div>
    </div>
  </section>

  <section class="block" id="credentials" aria-labelledby="c-title">
    <div class="wrap split">
      <div><p class="eyebrow">Clinical credentials</p><h2 id="c-title" class="big" style="font-size:var(--step-2)">${C.H.credentials}</h2><p style="margin-top:16px;color:var(--taupe);max-width:40ch">${C.CLINICIAN.intro}</p></div>
      <ul class="creds">
        <li><span>Clinician</span><span>${C.CLINICIAN.name}, ${C.CLINICIAN.post}</span></li>
        ${C.CLINICIAN.credentials.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join("")}
        <li><span>Serves</span><span>${C.CLINICIAN.availability}</span></li>
      </ul>
    </div>
  </section>

  <section class="block" id="faq" aria-labelledby="f-title">
    <div class="wrap faq-grid">
      <div class="intro"><p class="eyebrow">FAQs</p><h2 id="f-title" class="big">${C.H.faq}</h2><p style="margin-top:20px;color:var(--taupe)">Still unsure? Email <span style="color:var(--espresso)">${C.FOOTER.contact}</span>.</p></div>
      <div>${C.FAQ.map(([q, a], i) => `<details${i === 0 ? " open" : ""}><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
    </div>
  </section>

  <section class="final" aria-labelledby="final-title">
    <div class="wrap">
      ${C.bridgeMark("var(--espresso)", "var(--gold)", 44)}
      <h2 id="final-title">${C.H.final}</h2>
      <p>${C.FINAL.body}</p>
      <a class="btn btn-primary" href="#">${C.FINAL.cta}</a>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="fgrid">
      <div>${C.wordmark()}<p style="margin-top:18px;max-width:34ch;color:#d9cdbf">${C.FOOTER.blurb}</p><p style="margin-top:14px">${C.FOOTER.contact}</p></div>
      <div><h3>Services</h3><ul>${C.FOOTER.services.map((x) => `<li><a href="#services">${x}</a></li>`).join("")}</ul></div>
      <div><h3>Practice</h3><ul><li><a href="#how">How It Works</a></li><li><a href="#credentials">About</a></li><li><a href="#faq">FAQs</a></li><li><a href="#">Patient Sign In</a></li></ul></div>
      <div><h3>Policies</h3><ul>${C.FOOTER.legal.map((x) => `<li><a href="#">${x}</a></li>`).join("")}</ul></div>
    </div>
    <div class="disc"><p><b>In crisis?</b> ${C.FOOTER.emergency}</p><p>${C.FOOTER.clinical}</p><p>© 2026 LeaveBridge Health</p></div>
  </div>
</footer>
${C.MENU_JS}`;
}
