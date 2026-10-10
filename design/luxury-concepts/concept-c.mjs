import * as C from "./content.mjs";

// Concept C — Boutique Healthcare.
// Layout: an immersive full-width photograph with an ivory text panel set into it, then the process told
// as three illustrated "chapters", a framed price card with champagne hairlines, and a personal profile.
export function conceptC() {
  const navLinks = C.NAV.map(([t, h]) => `<a href="${h}">${t}</a>`).join("");
  return `<title>LeaveBridge Concept C</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Jost:wght@400;500;600&display=swap">
<style>
/* Boutique Healthcare: ivory and sand, immersive photography, champagne hairlines, storytelling chapters. */
:root{
  --ivory:#F7F3EC; --porcelain:#FFFDFA; --espresso:#302722; --forest:#263C34; --forest-2:#1b2c25;
  --sage:#DDE5DA; --gold:#B79A65; --gold-deep:#8a7044; --taupe:#6E6259; --sand:#E9E0D4; --sand-2:#efe7dc;
  --serif:"DM Serif Display", Didot, "Bodoni 72", Georgia, serif;
  --sans:"Jost", "Futura", "Avenir Next", Arial, sans-serif;
  --gut:clamp(16px,4vw,56px); --max:1280px; color-scheme:light;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ivory);color:var(--espresso);font:400 1.1rem/1.7 var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:var(--max);margin:0 auto;padding-inline:var(--gut)}
h1,h2,h3{font-family:var(--serif);font-weight:400;margin:0;text-wrap:balance;line-height:1.1}
p{margin:0}
:focus-visible{outline:2px solid var(--forest);outline-offset:3px}
.preview-bar{background:var(--sand);color:var(--espresso);font:500 13px/1.4 var(--sans);text-align:center;padding:7px 16px;border-bottom:1px solid #dccfbd}
.eyebrow{font:500 .8rem/1.3 var(--sans);letter-spacing:.2em;text-transform:uppercase;color:var(--gold-deep)}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:.8em 1.7em;font:500 .98rem/1 var(--sans);letter-spacing:.04em;text-decoration:none;border-radius:0;border:1px solid transparent;transition:background .3s,color .3s,border-color .3s}
.btn-primary{background:var(--forest);color:var(--porcelain)}
.btn-primary:hover{background:var(--forest-2)}
.btn-text{padding-inline:0;min-height:44px;border-bottom:1px solid var(--gold);color:var(--espresso)}
.btn-text:hover{border-color:var(--espresso)}
.hair{display:flex;align-items:center;gap:14px;color:var(--gold)}
.hair::before,.hair::after{content:"";flex:1;border-top:1px solid var(--gold);opacity:.7}
${C.PHOTO_CSS}
.ph{background:
  radial-gradient(90% 70% at 70% 18%, #fdf6e8 0%, rgba(253,246,232,0) 60%),
  linear-gradient(180deg,#e9dfcf 0%,#dccdb7 64%,#b59878 64.2%,#9e8061 100%)}

header{position:sticky;top:env(safe-area-inset-top,0px);z-index:10;background:rgba(247,243,236,.97);border-bottom:1px solid var(--sand)}
.nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;min-height:84px;gap:24px}
.nav-links{display:flex;gap:28px;font-size:.98rem}
.nav-links a{text-decoration:none}
.nav-links a:hover{color:var(--gold-deep)}
.wordmark{display:grid;justify-items:center;gap:2px;text-decoration:none;color:var(--espresso)}
.wordmark .mark{color:var(--gold)}
.wm-text{display:grid;justify-items:center;line-height:1}
.wm-name{font:400 1.75rem/1 var(--serif);letter-spacing:.01em}
.wm-sub{font:500 .62rem/1 var(--sans);letter-spacing:.55em;text-transform:uppercase;color:var(--taupe);margin-top:6px;padding-left:.55em}
.nav-end{display:flex;justify-content:flex-end;align-items:center;gap:22px;font-size:.98rem}
.nav-end .signin{text-decoration:none}
.nav-end .btn{min-height:44px;padding-inline:1.2em}
.menu-btn{display:none;justify-self:end;background:none;border:0;border-bottom:1px solid var(--gold);color:var(--espresso);font:500 .95rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:14px 2px;min-height:44px}
#mobile-menu{padding-block:8px 28px;border-top:1px solid var(--sand);text-align:center}
#mobile-menu a{display:block;padding:14px 0;text-decoration:none;font:400 1.6rem/1.2 var(--serif)}
#mobile-menu .btn{margin-top:16px;width:100%;font:500 1rem/1 var(--sans)}
@media (max-width:1060px){.nav{grid-template-columns:auto 1fr}.nav-links,.nav-end{display:none}.menu-btn{display:inline-flex}.wordmark{justify-items:start}.wm-text{justify-items:start}.wm-sub{padding-left:0}}

.hero{position:relative;padding-block:0 clamp(40px,6vw,80px)}
.hero .ph{width:100%;aspect-ratio:16/6;min-height:420px}
.hero .ph .ph-cap{left:auto;right:16px;top:16px;bottom:auto}
.hero-panel{position:relative;margin:-180px auto 0;max-width:820px;background:var(--porcelain);padding:clamp(28px,5vw,64px);text-align:center;outline:1px solid var(--gold);outline-offset:-12px;z-index:1}
.hero-panel h1{font-size:clamp(2.4rem,5.4vw,4.6rem);margin-top:20px;line-height:1.04}
.hero-panel h1 em{color:var(--forest)}
.hero-panel .sub{font-size:1.2rem;max-width:40ch;margin:22px auto 0}
.hero-panel .actions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 28px;margin-top:32px}
.hero-panel .note{margin-top:16px;color:var(--taupe);font-size:1rem}
.hero-sum{margin:32px auto 0;display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:6px 18px;padding-top:22px;border-top:1px solid var(--sand);font-size:.98rem}
.hero-sum b{font:400 1.2rem/1.2 var(--serif)}
.hero-sum .p{font:400 1.6rem/1 var(--serif);color:var(--forest);font-variant-numeric:lining-nums}
.hero-sum .dot{color:var(--gold)}
@media (max-width:760px){
  .hero{display:flex;flex-direction:column-reverse}
  .hero .ph{aspect-ratio:4/3;min-height:0}
  .hero-panel{margin:0;outline-offset:-8px;text-align:left}
  .hero-panel .actions{justify-content:flex-start}
  .hero-sum{justify-content:flex-start}
  .hero-panel .sub{margin-left:0}
}

.trust{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;padding-block:24px 8px;text-align:center}
.trust h2{font:500 1rem/1.4 var(--sans);letter-spacing:.06em}
.trust h2::before{content:"";display:block;width:6px;height:6px;margin:0 auto 14px;background:var(--gold);transform:rotate(45deg)}
.trust p{font-size:.96rem;color:var(--taupe);margin-top:6px;max-width:30ch;margin-inline:auto}
@media (max-width:760px){.trust{grid-template-columns:1fr;gap:24px}}

section.block{padding-block:clamp(72px,10vw,136px)}
.center{text-align:center;max-width:780px;margin:0 auto}
.center h2{font-size:clamp(2.1rem,4vw,3.4rem);margin-top:18px}
.story{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:clamp(32px,6vw,96px);align-items:center;margin-top:56px}
.story .ph{aspect-ratio:5/4}
.story .prose{display:grid;gap:20px}
.story .prose p:first-child{font:400 1.55rem/1.45 var(--serif)}
.fit{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:8px;font-size:1rem}
.fit h3{font:500 .78rem/1.3 var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:8px}
.fit ul{margin:0;padding-left:1.1em;display:grid;gap:6px}
.disclose{font-size:.98rem;padding:18px 0;border-top:1px solid var(--gold);border-bottom:1px solid var(--gold);color:var(--espresso)}
@media (max-width:860px){.story{grid-template-columns:1fr}.fit{grid-template-columns:1fr}}

.chapters{background:var(--sand-2)}
.chapter-list{list-style:none;padding:0;margin:64px 0 0;display:grid;gap:clamp(48px,7vw,96px)}
.chapter{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:clamp(28px,6vw,96px);align-items:center}
.chapter:nth-child(even) .ph{order:2}
.chapter .ph{aspect-ratio:4/3}
.chapter .label{font:italic 400 1.15rem/1 var(--serif);color:var(--gold-deep)}
.chapter h3{font-size:clamp(1.8rem,3vw,2.5rem);margin-top:12px}
.chapter .lede{margin-top:14px;font-size:1.15rem}
.chapter ul{margin:20px 0 0;padding:0;list-style:none;display:grid;gap:10px;color:#4f453e;font-size:1rem;border-top:1px solid var(--sand);padding-top:18px}
.chapter ul li{padding-left:22px;position:relative}
.chapter ul li::before{content:"";position:absolute;left:0;top:.72em;width:12px;border-top:1px solid var(--gold)}
@media (max-width:860px){.chapter{grid-template-columns:1fr}.chapter:nth-child(even) .ph{order:0}}

.pricecard{margin-top:56px;background:var(--porcelain);border:1px solid var(--gold);padding:8px}
.pricecard-in{border:1px solid rgba(183,154,101,.5);display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.pc{padding:clamp(28px,3.5vw,44px);display:grid;gap:16px;align-content:start;border-left:1px solid var(--sand)}
.pc:first-child{border-left:0}
.pc h3{font-size:1.55rem;min-height:2.3em}
.pc .price{font:400 3rem/1 var(--serif);font-variant-numeric:lining-nums tabular-nums;color:var(--forest)}
.pc .unit{display:block;font:500 .78rem/1.3 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--taupe);margin-top:8px}
.pc .for{font-size:1rem;color:#4f453e}
.pc dl{margin:0;display:grid;gap:12px;font-size:.96rem;border-top:1px solid var(--sand);padding-top:16px}
.pc dt{font:500 .74rem/1.3 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--gold-deep)}
.pc dd{margin:4px 0 0}
.pc dd ul{margin:0;padding-left:1.1em}
.pc .btn{justify-self:start;margin-top:4px}
@media (max-width:960px){.pricecard-in{grid-template-columns:1fr}.pc{border-left:0;border-top:1px solid var(--sand)}.pc:first-child{border-top:0}.pc h3{min-height:0}}

.profile{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:clamp(32px,6vw,96px);align-items:center}
.profile .frame{padding:14px;border:1px solid var(--gold)}
.profile .ph{aspect-ratio:4/5}
.profile h2{font-size:clamp(2.4rem,4.6vw,3.8rem);margin-top:18px}
.profile .post{font:italic 400 1.35rem/1.3 var(--serif);color:var(--taupe);margin-top:10px}
.profile dl{margin:28px 0 0;display:grid;gap:14px;font-size:1rem}
.profile dt{font:500 .74rem/1.3 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--gold-deep)}
.profile dd{margin:2px 0 0}
.letter{margin-top:28px;padding:22px 24px;background:var(--sand-2);border-left:1px solid var(--gold);font:italic 400 1.1rem/1.6 var(--serif)}
.letter b{font:600 .78rem/1.3 var(--sans);letter-spacing:.14em;text-transform:uppercase;font-style:normal;display:block;margin-bottom:6px;color:var(--gold-deep)}
@media (max-width:860px){.profile{grid-template-columns:1fr}}

.faq{max-width:820px;margin:48px auto 0;border-top:1px solid var(--gold)}
details{border-bottom:1px solid var(--sand)}
summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:20px;padding:22px 0;font:400 1.3rem/1.35 var(--serif)}
summary::-webkit-details-marker{display:none}
summary::after{content:"";flex:none;width:11px;height:11px;margin-top:.45em;border-right:1px solid var(--gold-deep);border-bottom:1px solid var(--gold-deep);transform:rotate(45deg);transition:transform .3s}
details[open] summary::after{transform:rotate(-135deg)}
details p{padding:0 0 24px;color:#4a3f38;max-width:64ch}

.final{position:relative;background:var(--forest);color:var(--porcelain);text-align:center;padding-block:clamp(80px,10vw,140px)}
.final::before{content:"";position:absolute;inset:18px;border:1px solid rgba(183,154,101,.55);pointer-events:none}
.final h2{font-size:clamp(2.4rem,5vw,4.2rem);max-width:15ch;margin:24px auto 0}
.final p{margin:20px auto 36px;color:#dbe4dc}
.final .btn{background:var(--porcelain);color:var(--forest)}
.final .btn:hover{background:var(--sand)}
.final .mark{color:var(--gold)}

footer{background:var(--sand);padding-block:64px 36px;font-size:1rem}
.fgrid{display:grid;grid-template-columns:minmax(0,4fr) repeat(3,minmax(0,2fr));gap:36px}
footer .wordmark{justify-items:start}footer .wm-text{justify-items:start}footer .wm-sub{padding-left:0}
footer h3{font:500 .78rem/1.3 var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:12px}
footer ul{list-style:none;padding:0;margin:0;display:grid;gap:9px}
footer a{text-decoration:none}footer a:hover{text-decoration:underline;text-decoration-color:var(--gold)}
footer .disc{margin-top:48px;padding-top:24px;border-top:1px solid #d6c8b4;display:grid;gap:8px;font-size:.96rem}
@media (max-width:860px){.fgrid{grid-template-columns:1fr 1fr}.fgrid > div:first-child{grid-column:1 / -1}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

${C.PREVIEW_BAR("Concept C, Boutique Healthcare")}
<header>
  <div class="wrap nav">
    <nav class="nav-links" aria-label="Main">${navLinks}</nav>
    ${C.wordmark({ accent: "var(--gold)", stroke: "var(--espresso)", size: 34 })}
    <div class="nav-end"><a class="signin" href="#">Patient Sign In</a><a class="btn btn-primary" href="#">Begin Your Assessment</a></div>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-btn><span class="mb-label">Menu</span></button>
  </div>
  <div id="mobile-menu" class="wrap" hidden>
    <nav aria-label="Mobile">${navLinks}<a href="#">Patient Sign In</a></nav>
    <a class="btn btn-primary" href="#">Begin Your Assessment</a>
  </div>
</header>

<main id="top">
  <div class="hero">
    ${C.photo("", "2400 × 1080 px, wide", "A quiet, sunlit room: a Black woman seated in an armchair with a cup of tea and a tablet, linen, wood and a plant. Calm, unposed. Must not appear to be our clinician or a patient.")}
    <div class="wrap"><div class="hero-panel">
      <p class="eyebrow">${C.HERO.eyebrow}</p>
      <h1>Your Wellbeing Deserves <em>Exceptional</em> Care.</h1>
      <p class="sub">${C.HERO.sub}</p>
      <div class="actions"><a class="btn btn-primary" href="#">${C.HERO.primary}</a><a class="btn btn-text" href="#services">${C.HERO.secondary}</a></div>
      <p class="note">${C.HERO.note}</p>
      <p class="hero-sum"><b>Mental Health Leave Assessment</b><span class="dot" aria-hidden="true">◆</span><span>Online clinical assessment</span><span class="dot" aria-hidden="true">◆</span><span class="p">${C.PRICES.assessment}</span></p>
    </div></div>
  </div>

  <div class="wrap"><div class="trust">
    ${C.TRUST.map(([t, d]) => `<div><h2>${t}</h2><p>${d}</p></div>`).join("")}
  </div></div>

  <section class="block" aria-labelledby="u-title">
    <div class="wrap">
      <div class="center"><p class="eyebrow">Our service</p><h2 id="u-title">${C.UNDERSTAND.heading}</h2></div>
      <div class="story">
        ${C.photo("", "1500 × 1200 px, 5:4", "Hands holding a mug beside an open notebook on a wooden table, window light. No faces or readable text.")}
        <div class="prose">
          ${C.UNDERSTAND.body.map((p) => `<p>${p}</p>`).join("")}
          <div class="fit">
            <div><h3>This may be right for you</h3><ul>${C.UNDERSTAND.forYou.map((x) => `<li>${x}</li>`).join("")}</ul></div>
            <div><h3>We do not provide</h3><ul>${C.UNDERSTAND.notFor.map((x) => `<li>${x}</li>`).join("")}</ul></div>
          </div>
          <p class="disclose">${C.UNDERSTAND.qualification}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="block chapters" id="how" aria-labelledby="h-title">
    <div class="wrap">
      <div class="center"><p class="eyebrow">How it works</p><h2 id="h-title">Your path, from first question to outcome.</h2></div>
      <ol class="chapter-list">
        ${C.STEPS.map((s, i) => `<li class="chapter">
          ${C.photo("", "1600 × 1200 px, 4:3", ["A woman answering questions on her phone on a sofa, soft afternoon light, screen not readable.", "A laptop on a kitchen table set up for a video call, warm interior, no visible faces or details on screen.", "A person reading calmly by a window with a cup of coffee, sense of relief, no documents visible."][i])}
          <div><span class="label">Step ${["one", "two", "three"][i]}</span><h3>${s.title}</h3><p class="lede">${s.lede}</p><ul>${s.details.map((d) => `<li>${d}</li>`).join("")}</ul></div>
        </li>`).join("")}
      </ol>
    </div>
  </section>

  <section class="block" id="services" aria-labelledby="s-title">
    <div class="wrap">
      <div class="center"><p class="eyebrow">Services and pricing</p><h2 id="s-title">Clear fees, thoughtfully explained.</h2><p style="margin-top:18px;color:var(--taupe)">Self-pay, with no subscription and no insurance billing. Each fee covers clinical work, never a particular outcome.</p></div>
      <div class="pricecard"><div class="pricecard-in">
        ${C.SERVICES.map((s) => `<article class="pc" aria-labelledby="svc-${s.id}">
          <h3 id="svc-${s.id}">${s.name}</h3>
          <p><span class="price">${s.price}</span><span class="unit">${s.unit}</span></p>
          <p class="for">${s.forWho}</p>
          <dl>
            <div><dt>Included</dt><dd><ul>${s.includes.map((x) => `<li>${x}</li>`).join("")}</ul></dd></div>
            <div><dt>Before you start</dt><dd>${s.prereq}</dd></div>
            <div><dt>Scope</dt><dd>${s.scope}</dd></div>
          </dl>
          <a class="btn ${s.id === "assessment" ? "btn-primary" : "btn-text"}" href="#">${s.cta}</a>
        </article>`).join("")}
      </div></div>
    </div>
  </section>

  <section class="block chapters" id="clinician" aria-labelledby="c-title">
    <div class="wrap profile">
      <div class="frame">${C.photo("", "1200 × 1500 px, 4:5", "Your own professional photograph goes here. No stand-in or invented headshot.")}</div>
      <div>
        <p class="eyebrow">Clinical leadership</p>
        <h2 id="c-title">${C.CLINICIAN.name}</h2>
        <p class="post">${C.CLINICIAN.post} · ${C.CLINICIAN.role}</p>
        <dl>
          ${C.CLINICIAN.credentials.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
          <div><dt>Availability</dt><dd>${C.CLINICIAN.availability}</dd></div>
        </dl>
        <p class="letter"><b>To be supplied</b>${C.CLINICIAN.bioPlaceholder} ${C.CLINICIAN.licensePlaceholder}.</p>
      </div>
    </div>
  </section>

  <section class="block" id="faq" aria-labelledby="f-title">
    <div class="wrap">
      <div class="center"><p class="eyebrow">FAQs</p><h2 id="f-title">Questions you may have.</h2><p style="margin-top:18px;color:var(--taupe)">Anything else? Email ${C.FOOTER.contact}.</p></div>
      <div class="faq">${C.FAQ.map(([q, a], i) => `<details${i === 0 ? " open" : ""}><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
    </div>
  </section>

  <section class="final" aria-labelledby="final-title">
    <div class="wrap">
      ${C.bridgeMark("var(--porcelain)", "var(--gold)", 48)}
      <h2 id="final-title">${C.FINAL.heading}</h2>
      <p>${C.FINAL.body}</p>
      <a class="btn" href="#">${C.FINAL.cta}</a>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="fgrid">
      <div>${C.wordmark({ accent: "var(--gold)", stroke: "var(--espresso)" })}<p style="margin-top:16px;max-width:34ch;color:var(--taupe)">${C.FOOTER.blurb}</p><p style="margin-top:12px">${C.FOOTER.contact}</p></div>
      <div><h3>Services</h3><ul>${C.FOOTER.services.map((x) => `<li><a href="#services">${x}</a></li>`).join("")}</ul></div>
      <div><h3>Practice</h3><ul><li><a href="#how">How It Works</a></li><li><a href="#clinician">About</a></li><li><a href="#faq">FAQs</a></li><li><a href="#">Patient Sign In</a></li></ul></div>
      <div><h3>Policies</h3><ul>${C.FOOTER.legal.map((x) => `<li><a href="#">${x}</a></li>`).join("")}</ul></div>
    </div>
    <div class="disc"><p><b>In crisis?</b> ${C.FOOTER.emergency}</p><p>${C.FOOTER.clinical}</p><p style="color:var(--taupe)">© 2026 LeaveBridge Health</p></div>
  </div>
</footer>
${C.MENU_JS}`;
}
