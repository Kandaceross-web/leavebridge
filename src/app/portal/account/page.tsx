import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Checkbox, SelectField, SubmitButton, TextField } from "@/components/forms";
import { Badge, Banner, KeyValue, PageHead } from "@/components/ui";
import { requirePatientSession, run } from "@/server/auth/guards";
import { myPatientProfile } from "@/server/services/portal-queries";
import { getSetting } from "@/server/settings";
import { saveProfile } from "./actions";
import { TIME_ZONES } from "./zones";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { actor, session } = await requirePatientSession();
  const { profile, features, brand } = await run(actor, async (ctx) => ({
    profile: await myPatientProfile(ctx),
    features: await getSetting(ctx.tx, "features"),
    brand: await getSetting(ctx.tx, "brand"),
  }));
  const zones = TIME_ZONES.some((z) => z.value === profile.timeZone) ? TIME_ZONES : [{ value: profile.timeZone, label: profile.timeZone }, ...TIME_ZONES];

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <PageHead title="Account" lede="Your contact preferences and sign-in security." />

      <section className="card stack" aria-labelledby="who-heading">
        <h2 id="who-heading">Your account</h2>
        <KeyValue
          items={[
            ["Legal name", profile.legalName],
            ["Email", session.email],
          ]}
        />
        <p className="small muted">
          To change your legal name or email, message the care team at {brand.supportEmail}. Your legal name must match your photo ID.
        </p>
      </section>

      <section className="card stack" aria-labelledby="prefs-heading">
        <h2 id="prefs-heading">Profile and notifications</h2>
        <ActionForm action={saveProfile}>
          <TextField name="preferredName" label="Preferred name (optional)" maxLength={80} autoComplete="nickname" defaultValue={profile.preferredName} />
          <TextField name="phone" label="Mobile phone (optional)" type="tel" inputMode="tel" autoComplete="tel" maxLength={32} defaultValue={profile.phone} />
          <SelectField name="timeZone" label="Time zone" hint="Appointment times are shown in this time zone." required options={zones} defaultValue={profile.timeZone} />
          <fieldset>
            <legend>Notifications</legend>
            <p className="hint">Notices only say that something is waiting in your portal. They never include health details.</p>
            <Checkbox name="emailNotifications" value="yes" defaultChecked={profile.emailNotifications}>
              Email me when something changes in my portal
            </Checkbox>
            {features.smsNotifications ? (
              <Checkbox name="smsNotifications" value="yes" defaultChecked={profile.smsNotifications}>
                Text me when something changes in my portal. I agree to receive automated text notifications at the mobile number above. Message and data rates may apply. I can turn this off at any time.
              </Checkbox>
            ) : (
              <>
                <input type="hidden" name="smsNotifications" value={profile.smsNotifications ? "yes" : ""} />
                <p className="small muted">Text notifications are not available yet.</p>
              </>
            )}
          </fieldset>
          <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        </ActionForm>
      </section>

      <section className="card stack" aria-labelledby="mfa-heading">
        <div className="card-head">
          <h2 id="mfa-heading">Two-step verification</h2>
          <Badge tone={session.mfaEnrolled ? "done" : "neutral"}>{session.mfaEnrolled ? "On" : "Off"}</Badge>
        </div>
        {session.mfaEnrolled ? (
          <p className="muted">Each time you sign in, you will enter a code from your authenticator app as well as your password.</p>
        ) : (
          <>
            <p className="muted">Optional. Adds a code from an authenticator app when you sign in, so someone with your password alone can&rsquo;t get in.</p>
            <p>
              <Link className="btn btn-secondary" href="/mfa?next=/portal/account">
                Set up two-step verification
              </Link>
            </p>
          </>
        )}
      </section>

      <Banner tone="info" icon="info">
        To sign out, use the Sign out button at the top of the page. For privacy, sessions end automatically after a period of inactivity.
      </Banner>
    </div>
  );
}
