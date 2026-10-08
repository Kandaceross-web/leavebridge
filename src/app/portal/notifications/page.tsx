import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, DateTime, Empty, PageHead } from "@/components/ui";
import { requirePatientSession, run } from "@/server/auth/guards";
import { myNotifications } from "@/server/services/messaging";
import { myPatientProfile } from "@/server/services/portal-queries";
import { markAllRead } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { actor } = await requirePatientSession();
  const { list, profile } = await run(actor, async (ctx) => ({ list: await myNotifications(ctx, 50), profile: await myPatientProfile(ctx) }));
  const unread = list.filter((n) => !n.readAt).length;

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <PageHead
        title="Notifications"
        lede="Updates about your requests. Email and text notices only tell you something changed; details stay here in your portal."
        actions={
          unread ? (
            <ActionForm action={markAllRead} className="">
              <SubmitButton variant="secondary" size="sm" pendingText="Marking…">
                Mark all as read
              </SubmitButton>
            </ActionForm>
          ) : undefined
        }
      />
      {list.length ? (
        <ul className="list-rows">
          {list.map((n) => (
            <li key={n.id}>
              <div className="grow">
                <p>
                  {n.readAt ? n.title : <b>{n.title}</b>} {!n.readAt ? <Badge tone="action">New</Badge> : null}
                </p>
                <p className="small muted">
                  {n.body} · <DateTime value={n.createdAt} timeZone={profile.timeZone} />
                </p>
              </div>
              {n.linkPath?.startsWith("/portal") ? <Link href={n.linkPath}>Open</Link> : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No notifications yet" />
      )}
    </div>
  );
}
