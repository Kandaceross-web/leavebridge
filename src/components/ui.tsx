import Link from "next/link";
import type { ReactNode } from "react";

/* Server-safe presentational components shared by the site, portal and ops console. */

export function LogoMark({ size = 28, reverse = false }: { size?: number; reverse?: boolean }) {
  const bg = reverse ? "#FFF9F2" : "#0F4C4A";
  const arch = reverse ? "#B84227" : "#F6C453";
  const deck = reverse ? "#0F4C4A" : "#FFF9F2";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="48" height="48" rx="12" fill={bg} />
      <path
        d="M11 31.5 C 16 19.5, 32 19.5, 37 31.5"
        fill="none"
        stroke={arch}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M9 31.5 H 39" fill="none" stroke={deck} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M16 31.5 V 37 M32 31.5 V 37"
        fill="none"
        stroke={deck}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Lockup({
  href = "/",
  reverse = false,
  label = "LeaveBridge",
}: {
  href?: string;
  reverse?: boolean;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className={`lockup${reverse ? " lockup-reverse" : ""}`}
      aria-label={`${label} home`}
    >
      <LogoMark reverse={reverse} />
      <span>{label}</span>
    </Link>
  );
}

type IconName =
  | "check"
  | "x"
  | "lock"
  | "shield"
  | "video"
  | "badge"
  | "info"
  | "alert"
  | "file"
  | "clock"
  | "arrow"
  | "heart"
  | "calendar"
  | "phone"
  | "users";
export function Icon({
  name,
  size = 16,
  label,
}: {
  name: IconName;
  size?: number;
  label?: string;
}) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<IconName, ReactNode> = {
    check: <path d="M3 8.5l3 3 7-7" {...p} stroke="#2E7D5B" strokeWidth={2.1} />,
    x: <path d="M4 4l8 8M12 4l-8 8" {...p} stroke="#B84227" strokeWidth={1.9} />,
    lock: (
      <>
        <rect x="3" y="7" width="10" height="7" rx="1.5" {...p} />
        <path d="M5.5 7V5a2.5 2.5 0 015 0v2" {...p} />
      </>
    ),
    shield: <path d="M8 1.8l5 2v4c0 3.2-2.2 5.4-5 6.4-2.8-1-5-3.2-5-6.4v-4z" {...p} />,
    video: (
      <>
        <rect x="1.5" y="4" width="9" height="8" rx="1.5" {...p} />
        <path d="M10.5 7l4-2.2v6.4l-4-2.2" {...p} />
      </>
    ),
    badge: (
      <>
        <circle cx="8" cy="6.5" r="4" {...p} />
        <path d="M5.5 10l-1 4.5L8 13l3.5 1.5-1-4.5" {...p} />
      </>
    ),
    info: (
      <>
        <circle cx="8" cy="8" r="6.3" {...p} />
        <path d="M8 7.2v4M8 4.8v.1" {...p} />
      </>
    ),
    alert: (
      <>
        <path d="M8 1.8l6.5 11.4H1.5z" {...p} />
        <path d="M8 6.3v3.2M8 11.4v.1" {...p} />
      </>
    ),
    file: (
      <>
        <path d="M4 1.8h5l3 3v9.4H4z" {...p} />
        <path d="M9 1.8v3h3" {...p} />
      </>
    ),
    clock: (
      <>
        <circle cx="8" cy="8" r="6.3" {...p} />
        <path d="M8 4.5V8l2.4 1.6" {...p} />
      </>
    ),
    arrow: <path d="M3 8h10M9 4l4 4-4 4" {...p} />,
    heart: <path d="M8 13.5C3.6 10.8 2 8.6 2 6.4 2 4.6 3.4 3.2 5.1 3.2c1.2 0 2.2.6 2.9 1.6.7-1 1.7-1.6 2.9-1.6 1.7 0 3.1 1.4 3.1 3.2 0 2.2-1.6 4.4-6 7.1z" {...p} />,
    calendar: (
      <>
        <rect x="2" y="3.2" width="12" height="11" rx="1.8" {...p} />
        <path d="M2 6.6h12M5.2 1.8v2.6M10.8 1.8v2.6" {...p} />
      </>
    ),
    phone: (
      <path d="M5.6 2.2l1.5 3-1.3 1.2a8 8 0 003.8 3.8l1.2-1.3 3 1.5-.5 2.5c-.1.5-.6.9-1.1.8C7 13.3 2.7 9 2.3 3.8c-.1-.5.3-1 .8-1.1z" {...p} />
    ),
    users: (
      <>
        <circle cx="6" cy="5.5" r="2.4" {...p} />
        <path d="M1.8 13.5c.4-2.5 2.1-3.8 4.2-3.8s3.8 1.3 4.2 3.8M10.6 3.3a2.3 2.3 0 010 4.4M12 9.9c1.2.4 2 1.6 2.2 3.6" {...p} />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

export type Tone = "neutral" | "info" | "progress" | "action" | "done" | "alert";
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge b-${tone}`}>{children}</span>;
}

/** Marks content that is not final: AI drafts and unsigned documents. */
export function DraftBadge({
  children = "DRAFT · CLINICIAN REVIEW REQUIRED",
}: {
  children?: ReactNode;
}) {
  return <span className="badge b-draft">{children}</span>;
}

/** Shows an open review tag on configuration that still needs legal/clinical/owner sign-off. */
export function ReviewTag({ tag }: { tag: string | null | undefined }) {
  if (!tag) return null;
  return <span className="badge b-review">{tag}</span>;
}

export function Banner({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "warn" | "alert" | "safety" | "sage";
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <div
      className={`banner banner-${tone}`}
      role={tone === "alert" || tone === "safety" ? "alert" : undefined}
    >
      {icon ? <Icon name={icon} /> : null}
      <div>{children}</div>
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="row row-between" style={{ alignItems: "flex-end" }}>
        <h1>{title}</h1>
        {actions ? <div className="btn-row">{actions}</div> : null}
      </div>
      {lede ? <p className="lede">{lede}</p> : null}
    </header>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size,
  children,
  ...rest
}: {
  href: string;
  variant?: "primary" | "secondary" | "quiet" | "sage";
  size?: "sm";
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Link href={href} className={`btn btn-${variant}${size ? " btn-sm" : ""}`} {...rest}>
      {children}
    </Link>
  );
}

export function KeyValue({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([k, v], i) => (
        <div key={i} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card-quiet stack stack-sm text-center">
      <p>
        <b>{title}</b>
      </p>
      {children ? <div className="muted small">{children}</div> : null}
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: { label: string; detail?: string; state: "done" | "now" | "todo" }[];
}) {
  return (
    <ol className="timeline" aria-label="Case progress">
      {items.map((it) => (
        <li
          key={it.label}
          className={it.state === "todo" ? undefined : it.state}
          aria-current={it.state === "now" ? "step" : undefined}
        >
          <div>
            <b>{it.label}</b>
            {it.state === "done" ? <span className="visually-hidden"> (complete)</span> : null}
            {it.detail ? <span>{it.detail}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Money({ cents, currency = "usd" }: { cents: number; currency?: string }) {
  return (
    <>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: cents % 100 ? 2 : 0,
      }).format(cents / 100)}
    </>
  );
}

export function DateTime({
  value,
  timeZone,
  dateOnly,
}: {
  value: Date | string | null | undefined;
  timeZone?: string;
  dateOnly?: boolean;
}) {
  if (!value) return <>—</>;
  const d = typeof value === "string" ? new Date(value) : value;
  const text = new Intl.DateTimeFormat(
    "en-US",
    dateOnly
      ? { dateStyle: "medium", timeZone: timeZone ?? "UTC" }
      : { dateStyle: "medium", timeStyle: "short", timeZone: timeZone ?? "America/Chicago" },
  ).format(d);
  return <time dateTime={d.toISOString()}>{text}</time>;
}

/** Minimal Markdown rendering for admin-managed content: paragraphs, headings, lists, blockquotes, bold, links. */
export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r/g, "").split(/\n{2,}/);
  const inline = (text: string, key: string): ReactNode[] => {
    const out: ReactNode[] = [];
    const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:|tel:)[^)\s]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (m[1]) out.push(<strong key={`${key}-b${i++}`}>{m[1]}</strong>);
      else
        out.push(
          <a key={`${key}-a${i++}`} href={m[3]}>
            {m[2]}
          </a>,
        );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };
  return (
    <div className="prose">
      {blocks.map((b, idx) => {
        const key = `md${idx}`;
        const t = b.trim();
        if (!t) return null;
        if (t.startsWith("### ")) return <h3 key={key}>{inline(t.slice(4), key)}</h3>;
        if (t.startsWith("## ")) return <h2 key={key}>{inline(t.slice(3), key)}</h2>;
        if (t.startsWith("> "))
          return <blockquote key={key}>{inline(t.replace(/^>\s?/gm, ""), key)}</blockquote>;
        const lines = t.split("\n");
        if (lines.every((l) => /^\s*[-*]\s+/.test(l)))
          return (
            <ul key={key}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ""), `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+\.\s+/.test(l)))
          return (
            <ol key={key}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+\.\s+/, ""), `${key}-${j}`)}</li>
              ))}
            </ol>
          );
        return <p key={key}>{inline(t.replace(/\n/g, " "), key)}</p>;
      })}
    </div>
  );
}
