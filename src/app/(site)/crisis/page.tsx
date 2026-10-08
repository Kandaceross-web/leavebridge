import type { Metadata } from "next";
import { siteSettings } from "@/server/web/public";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Crisis resources",
  description: "LeaveBridge Health is not an emergency service. If you are in danger or thinking about harming yourself, get help now.",
};

export default async function CrisisPage() {
  const { crisis } = await siteSettings();
  return (
    <div className="container-narrow page stack stack-lg">
      <header className="stack">
        <p className="eyebrow">Crisis resources</p>
        <h1>{crisis.headline}</h1>
        <p className="lede">{crisis.body}</p>
      </header>
      <ul className={styles.crisisList}>
        {crisis.resources.map((r) => (
          <li key={r.label} className={styles.crisisItem}>
            {r.href ? <a href={r.href}>{r.label}</a> : <b>{r.label}</b>}
            <span className="muted">{r.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
