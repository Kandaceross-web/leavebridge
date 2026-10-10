"""Builds the three LeaveBridge Health homepage design previews (a.html, b.html, c.html) and index.html.

Run: python3 design-previews/build.py
All three concepts render the same content from content.py.
"""

from html import escape as e
from pathlib import Path

import content as C

OUT = Path(__file__).parent

FONTS = {
    "a": "family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600",
    "b": "family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;500;600",
    "c": "family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Hanken+Grotesk:wght@400;500;600",
}

TITLES = {
    "a": "Concept A · Editorial Private Care",
    "b": "Concept B · Contemporary Concierge",
    "c": "Concept C · Boutique Healthcare",
}

# ---------------------------------------------------------------- shared pieces

MARK = (
    '<svg class="wm-mark" viewBox="0 0 40 24" aria-hidden="true" focusable="false">'
    '<path d="M3 19 C 11 5, 29 5, 37 19" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
    '<path d="M1 19 H39" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
    '<path d="M12 11.2 V19 M20 8.6 V19 M28 11.2 V19" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".7"/>'
    "</svg>"
)


def wordmark(extra=""):
    return (
        f'<a class="wm {extra}" href="#top" aria-label="LeaveBridge Health, home">{MARK}'
        '<span class="wm-text"><span class="wm-name">LeaveBridge</span><span class="wm-sub">Health</span></span></a>'
    )


ICONS = {
    "license": '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    "online": '<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
    "private": '<rect x="5" y="10" width="14" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "minus": '<path d="M6 12h12"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
}


def icon(name, cls="ic"):
    return (
        f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" '
        f'stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>'
    )


def img(name, alt, sizes, w=1600, h=1067, cls="", loading="lazy"):
    pri = ' fetchpriority="high"' if loading == "eager" else ""
    return (
        f'<img class="{cls}" src="img/{name}-1600.webp" srcset="img/{name}-800.webp 800w, img/{name}-1600.webp 1600w" '
        f'sizes="{sizes}" width="{w}" height="{h}" alt="{e(alt)}" loading="{loading}"{pri} decoding="async">'
    )


def header(concept):
    links = "".join(f'<li><a href="{h}">{e(t)}</a></li>' for t, h in C.NAV)
    return f"""
<header class="site-header">
  <div class="wrap bar">
    {wordmark()}
    <nav class="nav" aria-label="Main">
      <ul class="nav-links">{links}</ul>
    </nav>
    <div class="nav-end">
      <a class="link-quiet signin" href="#">Patient Sign In</a>
      <a class="btn btn-primary btn-sm nav-cta" href="#begin">{e(C.HERO['cta'])}</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu">
        <span class="menu-lines" aria-hidden="true"></span><span class="menu-label">Menu</span>
      </button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <nav aria-label="Mobile">
      <ul>{links}<li><a href="#">Patient Sign In</a></li></ul>
      <a class="btn btn-primary btn-block" href="#begin">{e(C.HERO['cta'])}</a>
    </nav>
  </div>
</header>"""


def preview_bar(concept):
    return (
        f'<div class="preview-bar" role="note"><div class="wrap">Design preview · {e(TITLES[concept])} · '
        'Demonstration only, not the live site. <a href="index.html">Compare concepts</a></div></div>'
    )


def faq_items():
    return "".join(
        f'<details class="faq"><summary><span>{e(q)}</span>{icon("plus", "ic faq-ic")}</summary>'
        f'<div class="faq-body"><p>{fmt(a)}</p></div></details>'
        for q, a in C.FAQS
    )


def fmt(text):
    """Escape, then style [Placeholder]/[Needs approval] tags as visible flags."""
    t = e(text)
    for tag in ("[Placeholder]", "[Needs approval]", "[Needs page]"):
        t = t.replace(tag, f'<mark class="flag">{tag[1:-1]}</mark>')
    return t


def footer():
    cols = "".join(
        f'<div class="f-col"><h3 class="f-h">{e(h)}</h3><ul>'
        + "".join(f'<li><a href="{href}">{fmt(t)}</a></li>' for t, href in links)
        + "</ul></div>"
        for h, links in C.FOOTER["cols"]
    )
    return f"""
<footer class="site-footer">
  <div class="wrap">
    <div class="f-top">
      <div class="f-brand">
        {wordmark("wm-footer")}
        <p>{e(C.FOOTER['tagline'])}</p>
        <p class="f-contact"><a href="mailto:{C.FOOTER['contact']}">{C.FOOTER['contact']}</a><br>{e(C.FOOTER['hours'])}</p>
      </div>
      {cols}
    </div>
    <div class="f-crisis" role="note"><strong>In crisis?</strong> Call or text <a href="tel:988">988</a> · Call <a href="tel:911">911</a> · Mississippi <a href="tel:18772108513">1-877-210-8513</a> · Tennessee <a href="tel:8552747471">855-274-7471</a></div>
    <div class="f-legal">
      <p>{e(C.FOOTER['disclosure'])} Photographs are illustrative and do not depict LeaveBridge Health patients or clinicians.</p>
      <p>© 2026 LeaveBridge Health</p>
    </div>
  </div>
</footer>"""


BASE_CSS = """
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:1.0625rem;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;height:auto;display:block}
a{color:inherit}
h1,h2,h3{font-family:var(--serif);font-weight:500;margin:0;color:var(--ink);text-wrap:balance}
p{margin:0 0 1em}
ul,ol{margin:0;padding:0;list-style:none}
.wrap{width:min(100% - 32px, var(--maxw));margin-inline:auto}
@media(min-width:768px){.wrap{width:min(100% - 64px, var(--maxw))}}
.skip{position:absolute;left:-9999px;top:8px;z-index:100;background:var(--forest);color:#fff;padding:10px 16px}
.skip:focus{left:8px}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px;border-radius:2px}
.preview-bar{background:#302722;color:#EFE7DA;font-size:.8125rem;padding:7px 0;letter-spacing:.01em}
.preview-bar a{color:#fff}
/* wordmark */
.wm{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink)}
.wm-mark{width:34px;height:21px;color:var(--gold);flex:none}
.wm-text{display:flex;flex-direction:column;line-height:1}
.wm-name{font-family:var(--serif);font-size:1.5rem;font-weight:500;letter-spacing:.005em}
.wm-sub{font-family:var(--sans);font-size:.625rem;letter-spacing:.42em;text-transform:uppercase;margin-top:5px;color:var(--taupe);font-weight:500}
/* header */
.site-header{position:sticky;top:0;z-index:50;background:var(--header-bg);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:76px}
.nav{display:none}
.nav-links{display:flex;gap:32px}
.nav-links a,.link-quiet{text-decoration:none;font-size:.9375rem;color:var(--ink);padding:6px 0;background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;transition:background-size .25s ease}
.nav-links a:hover,.link-quiet:hover{background-size:100% 1px}
.nav-end{display:flex;align-items:center;gap:20px}
.nav-end .signin,.nav-end .nav-cta{display:none}
.menu-btn{display:inline-flex;align-items:center;gap:10px;background:none;border:1px solid var(--line);color:var(--ink);font:inherit;font-size:.9375rem;padding:9px 14px;border-radius:var(--r);cursor:pointer;min-height:44px}
.menu-lines{width:16px;height:9px;border-top:1.5px solid currentColor;border-bottom:1.5px solid currentColor}
.mobile-menu{border-top:1px solid var(--line);background:var(--header-bg);padding:8px 16px 24px}
.mobile-menu li a{display:block;padding:14px 0;border-bottom:1px solid var(--line);text-decoration:none;font-size:1.0625rem}
.mobile-menu .btn{margin-top:20px}
@media(min-width:1024px){.nav{display:block}.nav-end .signin,.nav-end .nav-cta{display:inline-flex}.menu-btn,.mobile-menu{display:none!important}}
/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 28px;border-radius:var(--r);font-family:var(--sans);font-weight:500;font-size:1rem;text-decoration:none;border:1px solid transparent;transition:background-color .2s ease,color .2s ease,border-color .2s ease;cursor:pointer;letter-spacing:.01em}
.btn-sm{min-height:44px;padding:0 20px;font-size:.9375rem}
.btn-block{display:flex;width:100%}
.btn-primary{background:var(--forest);color:#F7F3EC}
.btn-primary:hover{background:var(--forest-deep)}
.btn-secondary{background:transparent;color:var(--ink);border-color:var(--ink-line)}
.btn-secondary:hover{background:var(--ink);color:var(--bg)}
.btn .ic{width:18px;height:18px}
.ic{width:24px;height:24px;flex:none}
.eyebrow{font-family:var(--sans);font-size:.8125rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--eyebrow)}
.flag{background:#FBF0C9;color:#4A3A12;font-size:.75em;font-weight:600;letter-spacing:.04em;padding:1px 6px;border-radius:2px;text-transform:uppercase;white-space:nowrap}
/* faq */
.faq{border-bottom:1px solid var(--line)}
.faq summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 0;cursor:pointer;font-size:1.0625rem;font-weight:500}
.faq summary::-webkit-details-marker{display:none}
.faq-ic{width:20px;height:20px;transition:transform .25s ease;color:var(--taupe)}
.faq[open] .faq-ic{transform:rotate(45deg)}
.faq-body{padding:0 40px 22px 0;color:var(--ink-soft);max-width:66ch}
/* footer */
.site-footer{background:var(--footer-bg);color:var(--footer-ink);padding:72px 0 40px;font-size:.9375rem}
.site-footer a{color:inherit;text-decoration:none}
.site-footer a:hover{text-decoration:underline}
.site-footer .wm,.site-footer .wm-name{color:var(--footer-ink)}
.site-footer .wm-sub{color:var(--footer-soft)}
.f-top{display:grid;gap:40px}
@media(min-width:900px){.f-top{grid-template-columns:1.4fr 1fr 1fr 1.2fr}}
.f-brand p{margin-top:20px;color:var(--footer-soft);max-width:34ch}
.f-h{font-family:var(--sans);font-size:.8125rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:16px;color:var(--footer-ink)}
.f-col li{margin-bottom:10px;color:var(--footer-soft)}
.f-crisis{margin-top:56px;padding:18px 0;border-top:1px solid var(--footer-line);border-bottom:1px solid var(--footer-line);color:var(--footer-ink)}
.f-crisis a{text-decoration:underline}
.f-legal{margin-top:24px;color:var(--footer-soft);font-size:.875rem;display:grid;gap:8px}
@media(min-width:900px){.f-legal{grid-template-columns:1fr auto;gap:40px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
"""

MENU_JS = """
<script>
(function(){
  var b=document.querySelector('.menu-btn'),m=document.getElementById('mobile-menu');
  if(!b||!m)return;
  function set(open){b.setAttribute('aria-expanded',String(open));m.hidden=!open;b.querySelector('.menu-label').textContent=open?'Close':'Menu';}
  b.addEventListener('click',function(){set(m.hidden)});
  document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&!m.hidden){set(false);b.focus();}});
  m.addEventListener('click',function(ev){if(ev.target.closest('a'))set(false)});
})();
</script>"""


def page(concept, css, body):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LeaveBridge Health · {e(TITLES[concept])}</title>
<meta name="description" content="Design preview: online mental health leave assessments by a licensed clinician, with clear steps and transparent pricing.">
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{FONTS[concept]}&display=swap">
<style>{BASE_CSS}{css}</style>
</head>
<body id="top">
<a class="skip" href="#main">Skip to main content</a>
{preview_bar(concept)}
{header(concept)}
<main id="main">
{body}
</main>
{footer()}
{MENU_JS}
</body>
</html>
"""


def list_items(items, ic="check"):
    return "".join(f"<li>{icon(ic)}<span>{fmt(x)}</span></li>" for x in items)


# ---------------------------------------------------------------- Concept A: Editorial Private Care

A_CSS = """
:root{--bg:#F7F3EC;--surface:#FFFDFA;--ink:#302722;--ink-soft:#4F443D;--taupe:#75695F;--eyebrow:#75695F;--forest:#263C34;--forest-deep:#1B2C26;--sage:#DDE5DA;--gold:#B79A65;--sand:#E9E0D4;--line:#E2D8CA;--ink-line:#302722;--focus:#263C34;--r:2px;--maxw:1240px;
--serif:"Cormorant Garamond",Georgia,serif;--sans:Inter,system-ui,sans-serif;--header-bg:rgba(247,243,236,.96);--footer-bg:#302722;--footer-ink:#F7F3EC;--footer-soft:#CFC3B4;--footer-line:#4A3F38}
body{font-size:1.0625rem}
.wm-name{font-size:1.625rem;font-weight:600}
.hero{padding:56px 0 72px}
.hero-grid{display:grid;gap:40px}
.hero .eyebrow{display:flex;align-items:center;gap:14px}
.hero .eyebrow::before{content:"";width:36px;height:1px;background:var(--gold)}
.hero h1{font-size:clamp(2.75rem,7.2vw,5.75rem);line-height:1.02;letter-spacing:-.01em;margin:22px 0 24px;font-weight:500}
.hero h1 em{font-style:italic;font-weight:500}
.lede{font-size:1.1875rem;color:var(--ink-soft);max-width:34ch;line-height:1.6}
.cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.cta-note{margin-top:18px;color:var(--taupe);font-size:.9375rem;max-width:42ch}
.avail{margin-top:28px;padding-top:20px;border-top:1px solid var(--line);font-size:.9375rem;color:var(--ink-soft);display:flex;gap:10px;align-items:baseline}
.avail strong{font-weight:600}
.hero-fig{position:relative;margin:0}
.hero-fig img{width:100%;aspect-ratio:4/5;object-fit:cover;object-position:42% 30%}
.hero-fig::after{content:"";position:absolute;inset:14px;border:1px solid rgba(255,253,250,.6);pointer-events:none}
.price-tag{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}
.price-tag .p-name{font-size:.9375rem;color:var(--ink-soft)}
.price-tag .p-name strong{display:block;color:var(--ink);font-weight:600}
.price-tag .p-amt{font-family:var(--serif);font-size:2.25rem;font-weight:600;line-height:1}
.price-tag a{font-size:.9375rem}
@media(min-width:960px){.hero{padding:88px 0 112px}.hero-grid{grid-template-columns:1.1fr .9fr;gap:80px;align-items:end}.hero-fig img{aspect-ratio:4/5}}
.trust{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface)}
.trust ul{display:grid}
.trust li{display:flex;gap:16px;padding:28px 0;border-bottom:1px solid var(--line)}
.trust li:last-child{border-bottom:0}
.trust .ic{color:var(--gold);margin-top:2px}
.trust strong{display:block;font-weight:600;font-size:1rem}
.trust span{color:var(--taupe);font-size:.9375rem}
@media(min-width:900px){.trust ul{grid-template-columns:repeat(3,1fr)}.trust li{border-bottom:0;border-right:1px solid var(--line);padding:36px 36px 36px 0}.trust li+li{padding-left:36px}.trust li:last-child{border-right:0}}
.section{padding:96px 0}
@media(min-width:960px){.section{padding:136px 0}}
.h2{font-size:clamp(2.25rem,4.6vw,3.75rem);line-height:1.06;letter-spacing:-.005em}
.split{display:grid;gap:40px}
@media(min-width:960px){.split{grid-template-columns:5fr 6fr;gap:96px}}
.prose{font-size:1.125rem;color:var(--ink-soft);max-width:58ch}
.qualifier{margin-top:32px;padding:22px 26px;border-left:2px solid var(--gold);background:var(--surface);font-size:.9875rem;color:var(--ink)}
.fit{display:grid;gap:32px;margin-top:48px}
@media(min-width:700px){.fit{grid-template-columns:1fr 1fr}}
.fit h3{font-family:var(--sans);font-size:.8125rem;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:var(--taupe);margin-bottom:14px}
.fit li{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:1rem}
.fit .ic{width:20px;height:20px;color:var(--forest);margin-top:3px}
.fit .no .ic{color:var(--taupe)}
.how{background:var(--surface);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.how-head{display:grid;gap:20px;margin-bottom:64px}
@media(min-width:960px){.how-head{grid-template-columns:5fr 6fr;gap:96px;align-items:end}}
.steps{display:grid;gap:56px;counter-reset:s}
@media(min-width:960px){.steps{grid-template-columns:repeat(3,1fr);gap:56px}}
.step{border-top:1px solid var(--ink);padding-top:28px}
.step-n{font-family:var(--serif);font-size:3.5rem;line-height:1;color:#8A6F3E;font-weight:500;font-style:italic}
.step h3{font-size:1.875rem;margin:18px 0 10px;font-weight:600}
.step .sum{color:var(--ink);font-weight:500}
.step ul{margin-top:18px;border-top:1px solid var(--line)}
.step li{padding:12px 0;border-bottom:1px solid var(--line);font-size:.96875rem;color:var(--ink-soft)}
.svc-list{margin-top:64px;border-top:1px solid var(--ink)}
.svc{display:grid;gap:20px;padding:44px 0;border-bottom:1px solid var(--line)}
@media(min-width:960px){.svc{grid-template-columns:4fr 5fr 3fr;gap:56px}}
.svc h3{font-size:2rem;font-weight:600;line-height:1.1}
.svc .for{margin-top:12px;color:var(--ink-soft);font-size:.96875rem}
.svc .tag{display:inline-block;margin-bottom:14px;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--forest);font-weight:600}
.svc dl{margin:0;display:grid;gap:14px;font-size:.9375rem}
.svc dt{font-weight:600}
.svc dd{margin:0;color:var(--ink-soft)}
.svc ul li{display:flex;gap:10px;padding:4px 0;color:var(--ink-soft)}
.svc ul .ic{width:18px;height:18px;color:var(--forest);margin-top:4px}
.svc .price{font-family:var(--serif);font-size:3rem;font-weight:600;line-height:1}
.svc .unit{color:var(--taupe);font-size:.9375rem;margin:6px 0 20px}
.svc-note{margin-top:28px;color:var(--taupe);font-size:.9375rem;max-width:70ch}
.clin{background:var(--sand)}
.clin-grid{display:grid;gap:48px;align-items:center}
@media(min-width:960px){.clin-grid{grid-template-columns:5fr 6fr;gap:96px}}
.ph{aspect-ratio:4/5;background:repeating-linear-gradient(135deg,#E2D7C7 0 1px,transparent 1px 14px),#EDE5D9;border:1px solid #CFC1AE;display:flex;align-items:flex-end;padding:24px;color:#4F443D;font-size:.875rem}
.ph strong{display:block;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}
.clin h2{font-size:clamp(2.5rem,5vw,4rem);margin:18px 0 6px}
.cred{font-size:1.125rem;color:var(--ink-soft)}
.cred strong{color:var(--ink);font-weight:600}
.clin-facts{margin:32px 0;border-top:1px solid #CFC1AE}
.clin-facts li{padding:14px 0;border-bottom:1px solid #CFC1AE;display:flex;justify-content:space-between;gap:20px;font-size:.96875rem}
.clin-facts li span:first-child{color:#5E534A}
.clin .eyebrow{color:#5E534A}
.faq-grid{display:grid;gap:40px}
@media(min-width:960px){.faq-grid{grid-template-columns:4fr 7fr;gap:96px}.faq-grid .sticky{position:sticky;top:120px;align-self:start}}
.faq summary{font-family:var(--serif);font-size:1.375rem;font-weight:600}
.final{background:var(--forest);color:#F7F3EC;text-align:center}
.final h2{color:#F7F3EC;font-size:clamp(2.5rem,5.4vw,4.5rem);line-height:1.05;max-width:16ch;margin:0 auto}
.final p{color:#DDE5DA;margin:24px auto 36px;max-width:46ch;font-size:1.125rem}
.final .btn{background:#F7F3EC;color:#263C34}
.final .btn:hover{background:#fff}
.final .rule{width:48px;height:1px;background:var(--gold);margin:0 auto 32px}
"""


def concept_a():
    steps = "".join(
        f'<li class="step"><div class="step-n" aria-hidden="true">{s["n"]}</div><h3>{e(s["title"])}</h3>'
        f'<p class="sum">{e(s["summary"])}</p><ul>{"".join(f"<li>{e(d)}</li>" for d in s["detail"])}</ul></li>'
        for s in C.STEPS
    )
    svcs = "".join(
        f'''<article class="svc">
  <div>{'<span class="tag">Start here</span>' if s["featured"] else ""}<h3>{e(s["name"])}</h3><p class="for">{e(s["for"])}</p></div>
  <dl><div><dt>What’s included</dt><dd><ul>{list_items(s["includes"])}</ul></dd></div>
      <div><dt>Before you begin</dt><dd>{e(s["prereq"])}</dd></div>
      <div><dt>Scope</dt><dd>{e(s["scope"])}</dd></div></dl>
  <div><div class="price">{s["price"]}</div><div class="unit">{e(s["unit"])}</div>
  <a class="btn {"btn-primary" if s["featured"] else "btn-secondary"}" href="#begin">{e(s["cta"])}</a></div>
</article>'''
        for s in C.SERVICES
    )
    trust = "".join(
        f'<li>{icon(k)}<div><strong>{e(t)}</strong><span>{e(d)}</span></div></li>'
        for k, (t, d) in zip(("license", "online", "private"), C.TRUST)
    )
    U = C.UNDERSTAND
    K = C.CLINICIAN
    body = f"""
<section class="hero" aria-labelledby="hero-h">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow">{e(C.HERO['eyebrow'])}</p>
      <h1 id="hero-h">Your Wellbeing Deserves <em>Exceptional</em> Care.</h1>
      <p class="lede">{e(C.HERO['lede'])}</p>
      <div class="cta-row" id="begin">
        <a class="btn btn-primary" href="#begin">{e(C.HERO['cta'])}{icon('arrow')}</a>
        <a class="btn btn-secondary" href="#services">{e(C.HERO['cta2'])}</a>
      </div>
      <p class="cta-note">{e(C.HERO['note'])}</p>
      <div class="price-tag"><span class="p-name"><strong>{e(C.PANEL['title'])}</strong>{e(C.PANEL['kind'])} · {e(C.PANEL['price_note'])}</span><span class="p-amt">{C.PANEL['price']}</span></div>
    </div>
    <figure class="hero-fig">{img('a-hero', 'A woman sits on a sofa in a sunlit room, working on a laptop.', '(min-width: 960px) 45vw, 100vw', 1600, 1067, loading='eager')}</figure>
  </div>
</section>
<section class="trust" aria-label="Why LeaveBridge Health"><div class="wrap"><ul>{trust}</ul></div></section>
<section class="section" aria-labelledby="u-h">
  <div class="wrap split">
    <div><p class="eyebrow">{e(U['eyebrow'])}</p><h2 class="h2" id="u-h" style="margin-top:18px">{e(U['heading'])}</h2></div>
    <div>
      <div class="prose">{"".join(f"<p>{e(p)}</p>" for p in U['paras'])}</div>
      <p class="qualifier">{e(U['qualifier'])}</p>
      <div class="fit">
        <div><h3>This may be right for you if</h3><ul>{list_items(U['for'])}</ul></div>
        <div class="no"><h3>This service is not</h3><ul>{list_items(U['not_for'], 'minus')}</ul></div>
      </div>
      <p class="avail" style="border:0;padding:0;margin-top:28px">{e(C.HERO['availability'])}</p>
    </div>
  </div>
</section>
<section class="section how" id="how" aria-labelledby="how-h">
  <div class="wrap">
    <div class="how-head"><div><p class="eyebrow">How it works</p><h2 class="h2" id="how-h" style="margin-top:18px">Three clear stages, one secure portal.</h2></div>
    <p class="prose" style="margin:0">Only a licensed clinician makes clinical decisions. No software does, and payment never decides the outcome.</p></div>
    <ol class="steps">{steps}</ol>
  </div>
</section>
<section class="section" id="services" aria-labelledby="svc-h">
  <div class="wrap">
    <div class="how-head" style="margin-bottom:0"><div><p class="eyebrow">Services and pricing</p><h2 class="h2" id="svc-h" style="margin-top:18px">Transparent, self-pay pricing.</h2></div>
    <p class="prose" style="margin:0">One flat fee for each service, shown before you pay. No subscription, and we do not bill insurance.</p></div>
    <div class="svc-list">{svcs}</div>
    <p class="svc-note">Refunds depend on how far your case has progressed: a full refund if you cancel before your clinician begins reviewing your case. <a href="#faqs">Read the refund policy</a>.</p>
  </div>
</section>
<section class="section clin" id="clinician" aria-labelledby="clin-h">
  <div class="wrap clin-grid">
    <div class="ph" role="img" aria-label="Placeholder for the clinician’s professional photograph"><div><strong>Photograph needed</strong>{e(K['photo_placeholder'])}</div></div>
    <div>
      <p class="eyebrow">{e(K['eyebrow'])}</p>
      <h2 id="clin-h">{e(K['name'])}<span style="font-size:.5em;font-weight:500">, {e(K['credentials'])}</span></h2>
      <p class="cred"><strong>{e(K['role'])}</strong></p>
      <ul class="clin-facts">
        <li><span>Licensure</span><span>{e(K['licensure'])}</span></li>
        <li><span>License numbers</span><span>{fmt(K['license_placeholder'].replace('[Placeholder] ', '[Placeholder] '))}</span></li>
        <li><span>Serves</span><span>Adults located in Mississippi and Tennessee</span></li>
      </ul>
      <p class="prose">{fmt(K['bio_placeholder'])}</p>
    </div>
  </div>
</section>
<section class="section" id="faqs" aria-labelledby="faq-h">
  <div class="wrap faq-grid">
    <div class="sticky"><p class="eyebrow">FAQs</p><h2 class="h2" id="faq-h" style="margin-top:18px">Questions, answered plainly.</h2>
    <p class="prose" style="margin-top:20px">Still have a question? Email <a href="mailto:support@leavebridgehealth.com">support@leavebridgehealth.com</a>.</p></div>
    <div>{faq_items()}</div>
  </div>
</section>
<section class="section final" aria-labelledby="final-h">
  <div class="wrap"><div class="rule" aria-hidden="true"></div><h2 id="final-h">{e(C.FINAL['heading'])}</h2><p>{e(C.FINAL['line'])}</p>
  <a class="btn" href="#begin">{e(C.FINAL['cta'])}{icon('arrow')}</a></div>
</section>"""
    return page("a", A_CSS, body)


# ---------------------------------------------------------------- Concept B: Contemporary Concierge

B_CSS = """
:root{--bg:#FFFDFA;--surface:#FFFFFF;--ink:#302722;--ink-soft:#4F443D;--taupe:#6E6259;--eyebrow:#263C34;--forest:#263C34;--forest-deep:#1B2C26;--sage:#DDE5DA;--sage-soft:#EEF2EC;--gold:#B79A65;--sand:#E9E0D4;--line:#E6DED2;--ink-line:#263C34;--focus:#263C34;--r:4px;--maxw:1200px;
--serif:"Libre Baskerville",Georgia,serif;--sans:"Source Sans 3",system-ui,sans-serif;--header-bg:rgba(255,253,250,.97);--footer-bg:#EEF2EC;--footer-ink:#302722;--footer-soft:#4F443D;--footer-line:#CBD6C7}
body{font-size:1.09375rem}
.wm-mark{color:var(--forest)}
.wm-name{font-size:1.375rem;font-weight:700;letter-spacing:-.01em}
.wm-sub{letter-spacing:.38em}
.btn-secondary{border-color:#263C34;color:#263C34}
.btn-secondary:hover{background:#263C34;color:#fff}
.hero{padding:48px 0 72px;background:linear-gradient(var(--bg),var(--bg))}
.hero-grid{display:grid;gap:44px}
.hero h1{font-size:clamp(2.375rem,5.4vw,4.125rem);line-height:1.1;letter-spacing:-.02em;margin:18px 0 22px;font-weight:400}
.lede{font-size:1.1875rem;color:var(--ink-soft);max-width:38ch}
.cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.cta-note{display:flex;gap:10px;margin-top:20px;color:var(--ink-soft);font-size:.96875rem;max-width:44ch}
.cta-note .ic{width:20px;height:20px;color:var(--forest);margin-top:3px}
.hero-media{position:relative}
.hero-media img{width:100%;aspect-ratio:5/4;object-fit:cover;object-position:50% 30%;border-radius:var(--r)}
.panel{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:28px;box-shadow:0 1px 2px rgba(48,39,34,.04),0 12px 32px -18px rgba(48,39,34,.18)}
.panel-k{font-size:.8125rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--forest)}
.panel h2{font-size:1.375rem;line-height:1.3;margin:10px 0 4px;font-weight:700}
.panel .kind{color:var(--taupe);font-size:.9375rem}
.panel .amt{display:flex;align-items:baseline;gap:10px;margin:18px 0 4px}
.panel .amt strong{font-family:var(--serif);font-size:2.375rem;font-weight:400;letter-spacing:-.02em}
.panel .amt span{color:var(--taupe);font-size:.9375rem}
.panel ol{margin:18px 0 22px;padding:16px 0 0;border-top:1px solid var(--line);counter-reset:p;list-style:none}
.panel ol li{counter-increment:p;display:flex;gap:12px;padding:6px 0;font-size:.96875rem}
.panel ol li::before{content:counter(p);flex:none;width:24px;height:24px;border-radius:50%;background:var(--sage);color:var(--forest);font-size:.8125rem;font-weight:600;display:grid;place-items:center}
.panel .fine{font-size:.84375rem;color:var(--taupe);margin:14px 0 0}
@media(min-width:960px){.hero{padding:72px 0 104px}.hero-grid{grid-template-columns:1fr 1.05fr;gap:72px;align-items:start}
.hero-media img{aspect-ratio:3/2;object-position:50% 25%}
.hero-media .panel{position:relative;width:380px;margin:-150px 0 0 -48px;padding:26px 28px}
.panel ol li{padding:4px 0}}
.trust{background:var(--sage)}
.trust ul{display:grid;gap:0}
.trust li{display:flex;gap:16px;align-items:flex-start;padding:24px 0;border-bottom:1px solid #C6D2C2}
.trust li:last-child{border:0}
.trust .ic-wrap{width:44px;height:44px;border-radius:50%;background:#fff;color:var(--forest);display:grid;place-items:center;flex:none}
.trust strong{display:block;font-weight:600}
.trust span{font-size:.9375rem;color:#3E4A43}
@media(min-width:900px){.trust ul{grid-template-columns:repeat(3,1fr);gap:40px}.trust li{border:0;padding:36px 0}}
.section{padding:96px 0}
@media(min-width:960px){.section{padding:120px 0}}
.sec-head{max-width:720px;margin-bottom:56px}
.h2{font-size:clamp(1.875rem,3.6vw,2.75rem);line-height:1.18;letter-spacing:-.015em;margin-top:14px}
.sec-head p{margin-top:18px;color:var(--ink-soft);font-size:1.125rem}
.u-grid{display:grid;gap:24px}
@media(min-width:960px){.u-grid{grid-template-columns:1.3fr 1fr 1fr}}
.card{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:32px}
.card h3{font-family:var(--sans);font-size:1.0625rem;font-weight:600;margin-bottom:16px}
.card li{display:flex;gap:12px;padding:8px 0;border-top:1px solid var(--line);font-size:1rem}
.card li:first-child{border-top:0}
.card .ic{width:20px;height:20px;color:var(--forest);margin-top:3px}
.card.muted{background:var(--sage-soft);border-color:#D7E0D3}
.card.muted .ic{color:var(--taupe)}
.u-text p{color:var(--ink-soft)}
.qualifier{margin-top:8px;padding:18px 20px;background:var(--sage-soft);border-radius:var(--r);font-size:.96875rem;color:var(--ink);border:1px solid #D7E0D3}
.how{background:var(--sage-soft);border-top:1px solid #D7E0D3;border-bottom:1px solid #D7E0D3}
.stepper{display:grid;gap:20px;position:relative}
@media(min-width:960px){.stepper{grid-template-columns:repeat(3,1fr);gap:24px}}
.st{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:32px;position:relative}
.st-top{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.st-n{width:40px;height:40px;border-radius:50%;background:var(--forest);color:#fff;display:grid;place-items:center;font-weight:600;font-size:.9375rem}
.st-k{font-size:.8125rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--taupe)}
.st h3{font-size:1.375rem;line-height:1.3;font-weight:700;margin-bottom:8px}
.st .sum{color:var(--ink-soft)}
.st li{display:flex;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:.96875rem;color:var(--ink-soft)}
.st li .ic{width:18px;height:18px;color:var(--forest);margin-top:4px}
.how-foot{margin-top:28px;display:flex;gap:12px;color:var(--ink-soft);font-size:.96875rem}
.how-foot .ic{color:var(--forest);width:20px;height:20px;margin-top:3px}
.svc-grid{display:grid;gap:24px}
@media(min-width:960px){.svc-grid{grid-template-columns:1.25fr 1fr 1fr;align-items:start}}
.svc{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:32px;display:flex;flex-direction:column}
.svc.featured{border-top:3px solid var(--forest);box-shadow:0 12px 32px -20px rgba(38,60,52,.35)}
.svc .badge{align-self:flex-start;background:var(--sage);color:var(--forest);font-size:.8125rem;font-weight:600;padding:4px 10px;border-radius:2px;margin-bottom:14px}
.svc h3{font-size:1.3125rem;line-height:1.3;font-weight:700}
.svc .amt{display:flex;align-items:baseline;gap:8px;margin:14px 0 6px}
.svc .amt strong{font-family:var(--serif);font-size:2.25rem;font-weight:400;letter-spacing:-.02em}
.svc .amt span{color:var(--taupe)}
.svc .for{color:var(--ink-soft);font-size:.96875rem}
.svc h4{font-size:.8125rem;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--taupe);margin:20px 0 8px}
.svc li{display:flex;gap:10px;padding:5px 0;font-size:.96875rem}
.svc li .ic{width:18px;height:18px;color:var(--forest);margin-top:4px}
.svc p.small{font-size:.9375rem;color:var(--ink-soft);margin:0}
.svc .btn{margin-top:26px}
.svc-note{margin-top:24px;color:var(--ink-soft);font-size:.96875rem}
.clin-card{display:grid;gap:40px;background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:24px}
@media(min-width:960px){.clin-card{grid-template-columns:380px 1fr;gap:56px;padding:40px}}
.ph{aspect-ratio:4/5;border-radius:var(--r);background:repeating-linear-gradient(135deg,#D3DDD0 0 1px,transparent 1px 14px),#E6ECE3;border:1px dashed #9DB09A;display:flex;align-items:flex-end;padding:22px;font-size:.875rem;color:#2F3B35}
.ph strong{display:block;font-size:.8125rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}
.clin-card h2{font-size:clamp(1.875rem,3.4vw,2.5rem);margin:12px 0 6px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 26px}
.chip{border:1px solid #C6D2C2;background:var(--sage-soft);color:var(--forest);font-size:.875rem;font-weight:600;padding:5px 12px;border-radius:2px}
.facts{display:grid;gap:0;border-top:1px solid var(--line);margin-bottom:24px}
.facts div{display:grid;grid-template-columns:150px 1fr;gap:16px;padding:12px 0;border-bottom:1px solid var(--line);font-size:.96875rem}
.facts dt{color:var(--taupe)}
.facts dd{margin:0}
.faq-wrap{max-width:820px;margin-inline:auto}
.faq-wrap .sec-head{text-align:center;margin-inline:auto}
.faq{background:#fff;border:1px solid var(--line);border-radius:var(--r);margin-bottom:10px;padding:0 24px}
.faq summary{padding:20px 0}
.faq-body{padding:0 24px 20px 0}
.faq-ic{color:var(--forest)}
.final{background:var(--forest);color:#F7F3EC}
.final .wrap{display:grid;gap:28px;align-items:center}
@media(min-width:960px){.final .wrap{grid-template-columns:1.4fr auto}}
.final h2{color:#fff;font-size:clamp(1.875rem,3.6vw,2.75rem);line-height:1.2}
.final p{color:#DDE5DA;margin:14px 0 0;font-size:1.125rem}
.final .btn{background:#F7F3EC;color:#263C34}
.final .btn:hover{background:#fff}
"""


def concept_b():
    P = C.PANEL
    U = C.UNDERSTAND
    K = C.CLINICIAN
    trust = "".join(
        f'<li><span class="ic-wrap">{icon(k)}</span><div><strong>{e(t)}</strong><span>{e(d)}</span></div></li>'
        for k, (t, d) in zip(("license", "online", "private"), C.TRUST)
    )
    steps = "".join(
        f'<li class="st"><div class="st-top"><span class="st-n" aria-hidden="true">{i}</span><span class="st-k">Step {i} of 3</span></div>'
        f'<h3>{e(s["title"])}</h3><p class="sum">{e(s["summary"])}</p><ul>{list_items(s["detail"])}</ul></li>'
        for i, s in enumerate(C.STEPS, 1)
    )
    svcs = "".join(
        f'''<article class="svc{" featured" if s["featured"] else ""}">
  {'<span class="badge">Start here</span>' if s["featured"] else ""}
  <h3>{e(s["name"])}</h3>
  <div class="amt"><strong>{s["price"]}</strong><span>{e(s["unit"])}</span></div>
  <p class="for">{e(s["for"])}</p>
  <h4>Included</h4><ul>{list_items(s["includes"])}</ul>
  <h4>Before you begin</h4><p class="small">{e(s["prereq"])}</p>
  <h4>Scope</h4><p class="small">{e(s["scope"])}</p>
  <a class="btn {"btn-primary" if s["featured"] else "btn-secondary"}" href="#begin">{e(s["cta"])}</a>
</article>'''
        for s in C.SERVICES
    )
    body = f"""
<section class="hero" aria-labelledby="hero-h">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow">{e(C.HERO['eyebrow'])}</p>
      <h1 id="hero-h">{e(C.HERO['headline'])}</h1>
      <p class="lede">{e(C.HERO['lede'])}</p>
      <div class="cta-row" id="begin">
        <a class="btn btn-primary" href="#begin">{e(C.HERO['cta'])}{icon('arrow')}</a>
        <a class="btn btn-secondary" href="#services">{e(C.HERO['cta2'])}</a>
      </div>
      <p class="cta-note">{icon('check')}<span>{e(C.HERO['note'])} {e(C.HERO['availability'])}</span></p>
    </div>
    <div class="hero-media">
      {img('b-hero', 'A woman in a cream cardigan smiles while typing on a laptop at a bright home desk.', '(min-width: 960px) 50vw, 100vw', 1600, 1067, loading='eager')}
      <aside class="panel" aria-labelledby="panel-h">
        <p class="panel-k">Assessment summary</p>
        <h2 id="panel-h">{e(P['title'])}</h2>
        <p class="kind">{e(P['kind'])}</p>
        <div class="amt"><strong>{P['price']}</strong><span>flat fee</span></div>
        <ol>{"".join(f"<li>{e(x)}</li>" for x in P['steps'])}</ol>
        <a class="btn btn-primary btn-block" href="#begin">Check if we can help</a>
        <p class="fine">Payment covers the assessment, not a particular outcome.</p>
      </aside>
    </div>
  </div>
</section>
<section class="trust" aria-label="Why LeaveBridge Health"><div class="wrap"><ul>{trust}</ul></div></section>
<section class="section" aria-labelledby="u-h">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow">{e(U['eyebrow'])}</p><h2 class="h2" id="u-h">{e(U['heading'])}</h2></div>
    <div class="u-grid">
      <div class="u-text">{"".join(f"<p>{e(p)}</p>" for p in U['paras'])}<p class="qualifier">{e(U['qualifier'])}</p></div>
      <div class="card"><h3>This may be right for you if</h3><ul>{list_items(U['for'])}</ul></div>
      <div class="card muted"><h3>This service is not</h3><ul>{list_items(U['not_for'], 'minus')}</ul></div>
    </div>
  </div>
</section>
<section class="section how" id="how" aria-labelledby="how-h">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow">How it works</p><h2 class="h2" id="how-h">Three clear stages, one secure portal.</h2>
    <p>Everything happens online, and you can save your intake and return to it at any time.</p></div>
    <ol class="stepper">{steps}</ol>
    <p class="how-foot">{icon('license')}<span>Only a licensed clinician makes clinical decisions. No software does, and payment never decides the outcome.</span></p>
  </div>
</section>
<section class="section" id="services" aria-labelledby="svc-h">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow">Services and pricing</p><h2 class="h2" id="svc-h">Transparent, self-pay pricing.</h2>
    <p>One flat fee for each service, shown before you pay. No subscription, and we do not bill insurance.</p></div>
    <div class="svc-grid">{svcs}</div>
    <p class="svc-note">Refunds depend on how far your case has progressed: a full refund if you cancel before your clinician begins reviewing your case. <a href="#faqs">Read the refund policy</a>.</p>
  </div>
</section>
<section class="section" id="clinician" aria-labelledby="clin-h" style="padding-top:0">
  <div class="wrap">
    <div class="clin-card">
      <div class="ph" role="img" aria-label="Placeholder for the clinician’s professional photograph"><div><strong>Photograph needed</strong>{e(K['photo_placeholder'])}</div></div>
      <div>
        <p class="eyebrow">{e(K['eyebrow'])}</p>
        <h2 id="clin-h">{e(K['name'])}, {e(K['credentials'])}</h2>
        <p style="color:var(--ink-soft)">{e(K['role'])}</p>
        <div class="chips"><span class="chip">Licensed Professional Counselor</span><span class="chip">National Certified Counselor</span><span class="chip">Mississippi</span><span class="chip">Tennessee</span></div>
        <dl class="facts">
          <div><dt>Licensure</dt><dd>{e(K['licensure'])}</dd></div>
          <div><dt>License numbers</dt><dd>{fmt(K['license_placeholder'])}</dd></div>
          <div><dt>Serves</dt><dd>Adults located in Mississippi and Tennessee</dd></div>
        </dl>
        <p style="color:var(--ink-soft)">{fmt(K['bio_placeholder'])}</p>
      </div>
    </div>
  </div>
</section>
<section class="section how" id="faqs" aria-labelledby="faq-h">
  <div class="wrap faq-wrap">
    <div class="sec-head"><p class="eyebrow">FAQs</p><h2 class="h2" id="faq-h">Questions, answered plainly.</h2></div>
    {faq_items()}
  </div>
</section>
<section class="section final" aria-labelledby="final-h" style="padding:88px 0">
  <div class="wrap"><div><h2 id="final-h">{e(C.FINAL['heading'])}</h2><p>{e(C.FINAL['line'])}</p></div>
  <a class="btn" href="#begin">{e(C.FINAL['cta'])}{icon('arrow')}</a></div>
</section>"""
    return page("b", B_CSS, body)


# ---------------------------------------------------------------- Concept C: Boutique Healthcare

C_CSS = """
:root{--bg:#F7F3EC;--surface:#FFFDFA;--ink:#302722;--ink-soft:#51463F;--taupe:#6B5E55;--eyebrow:#6B5A3A;--forest:#263C34;--forest-deep:#1B2C26;--sage:#DDE5DA;--gold:#B79A65;--sand:#E9E0D4;--line:#DDD1C1;--ink-line:#302722;--focus:#263C34;--r:2px;--maxw:1280px;
--serif:Newsreader,Georgia,serif;--sans:"Hanken Grotesk",system-ui,sans-serif;--header-bg:rgba(247,243,236,.96);--footer-bg:#E9E0D4;--footer-ink:#302722;--footer-soft:#51463F;--footer-line:#CDBFAC}
.wm-name{font-size:1.625rem;font-weight:400;font-style:italic;letter-spacing:-.005em}
.wm-sub{letter-spacing:.5em;color:#6B5A3A}
.eyebrow{font-weight:500;letter-spacing:.18em;font-size:.78125rem}
.hero{position:relative;padding:0 0 80px}
.hero-inner{display:grid}
.hero-photo{order:2;margin:0 16px}
.hero-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;object-position:62% 40%}
.hero-card{order:1;padding:48px 0 40px}
.hero h1{font-size:clamp(2.625rem,6.6vw,5.25rem);line-height:1.04;letter-spacing:-.02em;margin:20px 0 22px;font-weight:400}
.hero h1 em{font-style:italic}
.lede{font-size:1.1875rem;color:var(--ink-soft);max-width:36ch}
.cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.cta-note{margin-top:18px;color:var(--taupe);font-size:.9375rem;max-width:44ch}
.goldrule{display:block;width:56px;height:1px;background:var(--gold)}
@media(min-width:1024px){
 .hero{padding:0}
 .hero-inner{display:block;position:relative;min-height:780px}
 .hero-photo{position:absolute;top:0;right:0;bottom:0;width:58vw;margin:0}
 .hero-photo img{height:100%;aspect-ratio:auto;object-position:68% 40%}
 .hero-card{position:relative;z-index:1;width:min(680px,54vw);margin-left:max(32px, calc((100vw - 1280px)/2));background:var(--bg);padding:88px 64px 72px 0}
 .hero h1{font-size:clamp(3.25rem,5.2vw,4.75rem)}
}
.price-line{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-top:28px;padding-top:18px;border-top:1px solid var(--line)}
.price-line span{font-size:.9375rem;color:var(--ink-soft)}
.price-line strong{font-family:var(--serif);font-size:2rem;font-weight:400}
.trust{padding:56px 0 0}
@media(min-width:1024px){.trust{padding:0}}
.trust ul{display:grid;gap:28px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:36px 0}
@media(min-width:900px){.trust ul{grid-template-columns:repeat(3,1fr);gap:48px}}
.trust li{display:flex;gap:16px}
.trust .ic{color:var(--gold)}
.trust strong{display:block;font-family:var(--serif);font-size:1.3125rem;font-weight:400;line-height:1.3}
.trust span{color:var(--taupe);font-size:.9375rem}
.section{padding:104px 0}
@media(min-width:960px){.section{padding:144px 0}}
.h2{font-size:clamp(2.25rem,4.6vw,3.75rem);line-height:1.08;letter-spacing:-.015em;font-weight:400}
.h2 em{font-style:italic}
.story{display:grid;gap:48px}
@media(min-width:960px){.story{grid-template-columns:5fr 6fr;gap:112px;align-items:center}}
.story-fig{margin:0;position:relative}
.story-fig img{width:100%;aspect-ratio:3/4;object-fit:cover}
.story-fig .inset{position:absolute;right:-24px;bottom:-40px;width:44%;border:8px solid var(--bg);display:none}
@media(min-width:960px){.story-fig .inset{display:block}}
.story-fig .inset img{aspect-ratio:1;object-fit:cover}
.story .prose{font-family:var(--serif);font-size:1.3125rem;line-height:1.6;color:var(--ink-soft);max-width:34em}
.story .prose p:first-child::first-letter{font-size:3.6em;float:left;line-height:.85;margin:.08em .1em 0 0;color:var(--ink)}
.note{margin-top:28px;padding:22px 0;border-top:1px solid var(--gold);border-bottom:1px solid var(--line);font-size:.96875rem;color:var(--ink)}
.fit{display:grid;gap:28px;margin-top:36px}
@media(min-width:700px){.fit{grid-template-columns:1fr 1fr}}
.fit h3{font-family:var(--sans);font-size:.78125rem;letter-spacing:.18em;text-transform:uppercase;font-weight:500;color:var(--eyebrow);margin-bottom:12px}
.fit li{display:flex;gap:10px;padding:7px 0;font-size:1rem}
.fit .ic{width:18px;height:18px;color:var(--forest);margin-top:4px}
.fit .no .ic{color:var(--taupe)}
.how{background:var(--surface)}
.journey{display:grid;gap:0;margin-top:64px;max-width:980px}
.jr{display:grid;grid-template-columns:56px 1fr;gap:24px;padding-bottom:48px;position:relative}
.jr::before{content:"";position:absolute;left:27px;top:56px;bottom:0;width:1px;background:var(--line)}
.jr:last-child::before{display:none}
.jr-n{width:56px;height:56px;border-radius:50%;border:1px solid var(--gold);display:grid;place-items:center;font-family:var(--serif);font-style:italic;font-size:1.25rem;color:var(--ink);background:var(--surface)}
.jr h3{font-size:2rem;font-weight:400;line-height:1.15}
.jr .sum{margin:8px 0 14px;color:var(--ink-soft);font-size:1.0625rem}
.jr ul{display:grid;gap:8px}
@media(min-width:800px){.jr ul{grid-template-columns:1fr 1fr;gap:10px 32px}}
.jr li{font-size:.96875rem;color:var(--ink-soft);padding-left:18px;position:relative}
.jr li::before{content:"";position:absolute;left:0;top:.75em;width:8px;height:1px;background:var(--gold)}
.pricing{background:var(--sand)}
.p-grid{display:grid;gap:24px;margin-top:56px}
@media(min-width:960px){.p-grid{grid-template-columns:1.35fr 1fr;grid-template-rows:auto auto;align-items:start}.p-grid .featured{grid-row:span 2}}
.pc{background:var(--surface);padding:36px;border:1px solid #D9CCB9;position:relative}
.pc.featured{padding:48px;border-top:2px solid var(--gold)}
.pc h3{font-size:1.75rem;font-weight:400;line-height:1.2}
.pc.featured h3{font-size:2.25rem}
.pc .amt{display:flex;align-items:baseline;gap:10px;margin:14px 0 14px}
.pc .amt strong{font-family:var(--serif);font-size:2.5rem;font-weight:400;line-height:1}
.pc.featured .amt strong{font-size:3.5rem}
.pc .amt span{color:var(--taupe)}
.pc .for{color:var(--ink-soft)}
.pc h4{font-family:var(--sans);font-size:.78125rem;letter-spacing:.16em;text-transform:uppercase;font-weight:500;color:var(--eyebrow);margin:22px 0 8px}
.pc li{display:flex;gap:10px;padding:4px 0;font-size:.96875rem}
.pc li .ic{width:18px;height:18px;color:var(--forest);margin-top:4px}
.pc p.small{font-size:.9375rem;color:var(--ink-soft);margin:0}
.pc .btn{margin-top:28px}
.p-note{margin-top:28px;color:var(--ink-soft);font-size:.96875rem}
.clin{display:grid;gap:48px}
@media(min-width:960px){.clin{grid-template-columns:1fr 1fr;gap:112px;align-items:center}}
.ph{aspect-ratio:4/5;background:repeating-linear-gradient(135deg,#E3D8C8 0 1px,transparent 1px 16px),#EFE8DD;border:1px solid #D2C4B0;outline:1px solid var(--gold);outline-offset:-18px;display:flex;align-items:flex-end;padding:40px;font-size:.875rem;color:#4F443D}
.ph strong{display:block;font-size:.75rem;letter-spacing:.16em;text-transform:uppercase;margin-bottom:6px}
.clin h2{font-size:clamp(2.75rem,5.4vw,4.5rem);font-weight:400;line-height:1.05;margin:18px 0 8px}
.clin .cred{font-family:var(--serif);font-style:italic;font-size:1.375rem;color:var(--ink-soft)}
.clin dl{margin:32px 0;border-top:1px solid var(--line)}
.clin dl div{display:grid;grid-template-columns:150px 1fr;gap:16px;padding:14px 0;border-bottom:1px solid var(--line);font-size:.96875rem}
.clin dt{color:var(--taupe)}
.clin dd{margin:0}
.clin blockquote{margin:0;font-family:var(--serif);font-size:1.25rem;line-height:1.55;color:var(--ink-soft);padding-left:24px;border-left:1px solid var(--gold)}
.faq-grid{display:grid;gap:0 64px;margin-top:56px}
@media(min-width:960px){.faq-grid{grid-template-columns:1fr 1fr}}
.faq summary{font-family:var(--serif);font-size:1.25rem;font-weight:400}
.final{display:grid}
@media(min-width:960px){.final{grid-template-columns:1fr 1fr}}
.final-fig{margin:0}
.final-fig img{width:100%;height:100%;min-height:360px;object-fit:cover}
.final-text{background:var(--forest);color:#F7F3EC;padding:72px 32px;display:flex;flex-direction:column;justify-content:center}
@media(min-width:960px){.final-text{padding:96px}}
.final-text h2{color:#F7F3EC;font-size:clamp(2.25rem,4.4vw,3.5rem);font-weight:400;line-height:1.1}
.final-text p{color:#DDE5DA;margin:22px 0 32px;font-size:1.125rem;max-width:40ch}
.final-text .btn{align-self:flex-start;background:#F7F3EC;color:#263C34}
.final-text .btn:hover{background:#fff}
.final-text .goldrule{margin-bottom:28px}
"""


def concept_c():
    U = C.UNDERSTAND
    K = C.CLINICIAN
    trust = "".join(
        f'<li>{icon(k)}<div><strong>{e(t)}</strong><span>{e(d)}</span></div></li>'
        for k, (t, d) in zip(("license", "online", "private"), C.TRUST)
    )
    steps = "".join(
        f'<li class="jr"><span class="jr-n" aria-hidden="true">{i}</span><div><h3>{e(s["title"])}</h3>'
        f'<p class="sum">{e(s["summary"])}</p><ul>{"".join(f"<li>{e(d)}</li>" for d in s["detail"])}</ul></div></li>'
        for i, s in enumerate(C.STEPS, 1)
    )

    def pc(s):
        return f'''<article class="pc{" featured" if s["featured"] else ""}">
  {'<p class="eyebrow" style="margin-bottom:12px">Start here</p>' if s["featured"] else ""}
  <h3>{e(s["name"])}</h3>
  <div class="amt"><strong>{s["price"]}</strong><span>{e(s["unit"])}</span></div>
  <p class="for">{e(s["for"])}</p>
  <h4>Included</h4><ul>{list_items(s["includes"])}</ul>
  <h4>Before you begin</h4><p class="small">{e(s["prereq"])}</p>
  <h4>Scope</h4><p class="small">{e(s["scope"])}</p>
  <a class="btn {"btn-primary" if s["featured"] else "btn-secondary"}" href="#begin">{e(s["cta"])}</a>
</article>'''

    body = f"""
<section class="hero" aria-labelledby="hero-h">
  <div class="hero-inner">
    <figure class="hero-photo">{img('c-hero', 'A woman sits thoughtfully on a mustard sofa in a calm, light-filled room.', '100vw', 1600, 1068, loading='eager')}</figure>
    <div class="hero-card wrap">
      <span class="goldrule" aria-hidden="true"></span>
      <p class="eyebrow" style="margin-top:22px">{e(C.HERO['eyebrow'])}</p>
      <h1 id="hero-h">Your Wellbeing Deserves <em>Exceptional Care.</em></h1>
      <p class="lede">{e(C.HERO['lede'])}</p>
      <div class="cta-row" id="begin">
        <a class="btn btn-primary" href="#begin">{e(C.HERO['cta'])}{icon('arrow')}</a>
        <a class="btn btn-secondary" href="#services">{e(C.HERO['cta2'])}</a>
      </div>
      <p class="cta-note">{e(C.HERO['note'])}</p>
      <div class="price-line"><span>{e(C.PANEL['title'])} · {e(C.PANEL['kind'])}</span><strong>{C.PANEL['price']}</strong></div>
    </div>
  </div>
</section>
<section class="trust" aria-label="Why LeaveBridge Health"><div class="wrap"><ul>{trust}</ul></div></section>
<section class="section" aria-labelledby="u-h">
  <div class="wrap story">
    <figure class="story-fig">{img('c-window', 'A woman stands at a window in soft morning light.', '(min-width: 960px) 40vw, 100vw', 1600, 2396)}
      <div class="inset">{img('c-detail', 'A cup of tea beside a closed journal on a wooden table.', '20vw', 1600, 1067)}</div></figure>
    <div>
      <p class="eyebrow">{e(U['eyebrow'])}</p>
      <h2 class="h2" id="u-h" style="margin:18px 0 32px">Support when your mental health <em>affects your work.</em></h2>
      <div class="prose">{"".join(f"<p>{e(p)}</p>" for p in U['paras'])}</div>
      <p class="note">{e(U['qualifier'])}</p>
      <div class="fit">
        <div><h3>This may be right for you if</h3><ul>{list_items(U['for'])}</ul></div>
        <div class="no"><h3>This service is not</h3><ul>{list_items(U['not_for'], 'minus')}</ul></div>
      </div>
    </div>
  </div>
</section>
<section class="section how" id="how" aria-labelledby="how-h">
  <div class="wrap">
    <p class="eyebrow">How it works</p>
    <h2 class="h2" id="how-h" style="margin-top:18px;max-width:18ch">A calm, clear path <em>from first question to outcome.</em></h2>
    <ol class="journey">{steps}</ol>
    <p style="color:var(--taupe);max-width:60ch">Only a licensed clinician makes clinical decisions. No software does, and payment never decides the outcome.</p>
  </div>
</section>
<section class="section pricing" id="services" aria-labelledby="svc-h">
  <div class="wrap">
    <p class="eyebrow">Services and pricing</p>
    <h2 class="h2" id="svc-h" style="margin-top:18px">Transparent, <em>self-pay pricing.</em></h2>
    <p style="margin-top:20px;color:var(--ink-soft);max-width:56ch;font-size:1.125rem">One flat fee for each service, shown before you pay. No subscription, and we do not bill insurance.</p>
    <div class="p-grid">{pc(C.SERVICES[0])}{pc(C.SERVICES[1])}{pc(C.SERVICES[2])}</div>
    <p class="p-note">Refunds depend on how far your case has progressed: a full refund if you cancel before your clinician begins reviewing your case. <a href="#faqs">Read the refund policy</a>.</p>
  </div>
</section>
<section class="section" id="clinician" aria-labelledby="clin-h">
  <div class="wrap clin">
    <div class="ph" role="img" aria-label="Placeholder for the clinician’s professional photograph"><div><strong>Photograph needed</strong>{e(K['photo_placeholder'])}</div></div>
    <div>
      <p class="eyebrow">{e(K['eyebrow'])}</p>
      <h2 id="clin-h">{e(K['name'])}</h2>
      <p class="cred">{e(K['credentials'])} · {e(K['role'])}</p>
      <dl>
        <div><dt>Licensure</dt><dd>{e(K['licensure'])}</dd></div>
        <div><dt>License numbers</dt><dd>{fmt(K['license_placeholder'])}</dd></div>
        <div><dt>Serves</dt><dd>Adults located in Mississippi and Tennessee</dd></div>
      </dl>
      <blockquote>{fmt(K['bio_placeholder'])}</blockquote>
    </div>
  </div>
</section>
<section class="section how" id="faqs" aria-labelledby="faq-h">
  <div class="wrap">
    <p class="eyebrow">FAQs</p>
    <h2 class="h2" id="faq-h" style="margin-top:18px">Questions, <em>answered plainly.</em></h2>
    <div class="faq-grid"><div>{"".join(faq_items().split('</details>')[i] + '</details>' for i in range(5))}</div><div>{"".join(faq_items().split('</details>')[i] + '</details>' for i in range(5, 10))}</div></div>
  </div>
</section>
<section class="final" aria-labelledby="final-h">
  <figure class="final-fig">{img('c-laptop', 'A woman smiles while writing notes beside her laptop in a calm living room.', '(min-width: 960px) 50vw, 100vw', 1600, 1067)}</figure>
  <div class="final-text"><span class="goldrule" aria-hidden="true"></span><h2 id="final-h">{e(C.FINAL['heading'])}</h2><p>{e(C.FINAL['line'])}</p>
  <a class="btn" href="#begin">{e(C.FINAL['cta'])}{icon('arrow')}</a></div>
</section>"""
    return page("c", C_CSS, body)


if __name__ == "__main__":
    (OUT / "a.html").write_text(concept_a())
    (OUT / "b.html").write_text(concept_b())
    (OUT / "c.html").write_text(concept_c())
    print("built a.html b.html c.html")
