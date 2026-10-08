import type { ReactNode } from "react";
import { Lockup } from "@/components/ui";
import { NavLink } from "@/components/nav";
import { DevBanner } from "@/components/dev-banner";
import { requirePatientSession, run } from "@/server/auth/guards";
import { unreadNotifications } from "@/server/services/messaging";

export const metadata = { title: { default: "Your portal", template: "%s · LeaveBridge portal" }, robots: { index: false } };

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { session, actor } = await requirePatientSession();
  const unread = await run(actor, (ctx) => unreadNotifications(ctx));
  return (
    <>
      <DevBanner />
      <header className="app-header">
        <div className="container bar">
          <Lockup href="/portal" />
          <nav className="app-nav" aria-label="Portal">
            <NavLink href="/portal" exact>
              Home
            </NavLink>
            <NavLink href="/portal/messages">Messages</NavLink>
            <NavLink href="/portal/documents">Documents</NavLink>
            <NavLink href="/portal/notifications">
              Notifications{unread ? <span className="count" aria-label={`${unread} unread`}>{unread}</span> : null}
            </NavLink>
            <NavLink href="/portal/account">Account</NavLink>
          </nav>
          <div className="end">
            <span className="muted hide-mobile">{session.firstName}</span>
            <form action="/sign-out" method="post">
              <button type="submit" className="btn btn-quiet btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="container page">
        {children}
      </main>
      <footer className="container fine" style={{ paddingBottom: 32 }}>
        Not for emergencies. If you are in crisis, call or text <a href="tel:988">988</a> or call <a href="tel:911">911</a>. Messages are not monitored in real time.
      </footer>
    </>
  );
}
