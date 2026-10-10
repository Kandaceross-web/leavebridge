/**
 * Exports the public marketing pages as a static site for Cloudflare Pages, before the patient app launches.
 *
 *   npm run build && npm run public:export
 *
 * Starts the built app with PUBLIC_PREVIEW=1 (links into the app go to /opening-soon, forms show a notice), crawls every
 * page in the sitemap, strips all framework JavaScript (the pages are server-rendered HTML and work without it), and
 * writes public-site/ with Cloudflare's _headers file. Nothing in the export can collect or receive patient data: it has
 * no forms, no cookies and no scripts except the FMLA basics check, which runs in the browser and sends nothing.
 *
 * Search engines may index the export only when LEG-05 (public copy) and LEG-17 (FAQ and guides) are closed in
 * docs/OPEN-DECISIONS.md; otherwise every page is noindex and robots.txt disallows everything.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BASICS_RESULTS, basicsResult } from "../src/config/basics-check";

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public-site");
const PORT = Number(process.env.EXPORT_PORT ?? 3199);
const BASE = `http://127.0.0.1:${PORT}`;
const SITE_ORIGIN = process.env.EXPORT_SITE_ORIGIN ?? "https://www.leavebridgehealth.com";

/** LEG-05 and LEG-17 closed in OPEN-DECISIONS means the owner signed off the public copy, so it may be indexed. */
export function publicCopySignedOff(decisions: string): boolean {
  return ["LEG-05", "LEG-17"].every((id) => {
    const row = decisions.split("\n").find((l) => l.startsWith(`| ${id} `));
    return !!row && (row.split("|").at(-2) ?? "").trim().startsWith("Closed (");
  });
}

/** Removes every script, script preload, nonce and internal review code from server-rendered HTML. */
export function staticHtml(html: string): string {
  return (
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<link\b[^>]*rel="(?:modulepreload|preload)"[^>]*as="script"[^>]*\/?>/gi, "")
      .replace(/<link\b[^>]*as="script"[^>]*rel="preload"[^>]*\/?>/gi, "")
      .replace(/\snonce="[^"]*"/g, "")
      // Internal review codes (e.g. LEGAL_REVIEW_REQUIRED) are for the team; the plain-language "pending review" notes stay.
      .replace(/<p><span class="badge b-review">[^<]*<\/span><\/p>/g, "")
      .replace(/<span class="badge b-review">[^<]*<\/span>/g, "")
  );
}

const BASICS_SCRIPT = `// FMLA basics check for the static site. Answers stay in this page: nothing is sent, stored or tracked.
(() => {
  const RESULTS = ${JSON.stringify(BASICS_RESULTS)};
  const result = ${basicsResult.toString()};
  const root = document.querySelector("[data-basics-check]");
  if (!root) return;
  const out = root.querySelector("[data-basics-result]");
  const names = [...new Set([...root.querySelectorAll("input[type=radio]")].map((i) => i.name))];
  root.addEventListener("change", () => {
    const values = names.map((n) => root.querySelector("input[name='" + n + "']:checked")?.value);
    out.replaceChildren();
    if (values.some((v) => !v)) return;
    const r = RESULTS[result(values)];
    const card = document.createElement("div");
    card.className = "card " + r.card + " stack stack-sm";
    const h = document.createElement("h2");
    h.textContent = r.title;
    const p = document.createElement("p");
    p.textContent = r.body;
    card.append(h, p);
    out.append(card);
  });
})();
`;

function headersFile(styleHashes: string[]): string {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    `style-src 'self'${styleHashes.map((h) => ` '${h}'`).join("")}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
  return `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
`;
}

function write(path: string, body: string | Buffer) {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

const filePath = (pathname: string) =>
  pathname === "/" ? "index.html" : `${pathname.replace(/^\//, "")}.html`;

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${BASE}/robots.txt`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start");
}

async function get(path: string): Promise<Response> {
  const res = await fetch(BASE + path, { redirect: "manual" });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res;
}

async function main() {
  const indexable = publicCopySignedOff(readFileSync(join(ROOT, "docs/OPEN-DECISIONS.md"), "utf8"));
  const { SITE_ANALYTICS_SRC: _analytics, ...baseEnv } = process.env; // never load analytics on the export
  const server = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "start", "-p", String(PORT)],
    {
      cwd: ROOT,
      detached: true,
      stdio: ["ignore", "ignore", "inherit"],
      env: {
        ...baseEnv,
        NODE_ENV: "production",
        APP_ENV: "development",
        HOST_MODE: "single",
        SITE_ORIGIN,
        APP_ORIGIN: SITE_ORIGIN,
        PUBLIC_PREVIEW: "1",
        PUBLIC_PREVIEW_INDEXABLE: indexable ? "1" : "0",
      },
    },
  );
  try {
    await waitForServer();
    rmSync(OUT, { recursive: true, force: true });

    const sitemap = await (await get("/sitemap.xml")).text();
    const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
    pages.push("/opening-soon");

    const assets = new Set<string>(["/icon.svg"]);
    const styleHashes = new Set<string>();
    for (const page of pages) {
      let html = staticHtml(await (await get(page)).text());
      // Framework assets, and the self-hosted illustrations in public/illustrations/.
      for (const m of html.matchAll(/(?:href|src)="(\/(?:_next\/static|illustrations)\/[^"]+)"/g))
        assets.add(m[1]!);
      for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
        styleHashes.add(`sha256-${createHash("sha256").update(m[1]!).digest("base64")}`);
      }
      if (html.includes("data-basics-check"))
        html = html.replace("</body>", `<script src="/basics-check.js" defer></script></body>`);
      write(filePath(page), html);
    }

    const notFound = await fetch(`${BASE}/this-page-does-not-exist`);
    write("404.html", staticHtml(await notFound.text()));

    // Fetch assets, and fonts or images that stylesheets reference.
    const queue = [...assets];
    while (queue.length) {
      const path = queue.shift()!;
      const body = Buffer.from(await (await get(path)).arrayBuffer());
      write(path, body);
      if (path.endsWith(".css")) {
        for (const m of body.toString("utf8").matchAll(/url\((?:"|')?([^)"']+)/g)) {
          if (m[1]!.startsWith("data:")) continue;
          const ref = new URL(m[1]!, BASE + path).pathname;
          if (!assets.has(ref)) {
            assets.add(ref);
            queue.push(ref);
          }
        }
      }
    }

    write("robots.txt", await (await get("/robots.txt")).text());
    write("sitemap.xml", sitemap);
    write("basics-check.js", BASICS_SCRIPT);
    write("_headers", headersFile([...styleHashes]));
    write("_redirects", "/services/same-day-mental-health-assessment /work-school-excuses 301\n");
    console.log(
      `Exported ${pages.length} pages and ${assets.size} assets to public-site/ (${indexable ? "indexable" : "noindex"}).`,
    );
  } finally {
    // next start forks a server process, so stop the whole process group.
    if (server.pid) process.kill(-server.pid);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
