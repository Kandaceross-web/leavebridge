import type { Metadata } from "next";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/forms";
import { Badge, DateTime, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listStaff } from "@/server/services/admin";
import { STAFF_ROLES } from "@/domain/constants";
import s from "../_lib/admin.module.css";
import { InlineAction, label } from "../_lib/ui";
import { createStaffAction, setRoleAction, setUserStatusAction } from "./actions";

export const metadata: Metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  const { actor } = await requireStaffSession(["admin"]);
  const staff = (await run(actor, (ctx) => listStaff(ctx))).sort((a, b) => a.email.localeCompare(b.email));
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Staff & roles"
        lede="Role changes take effect on the person's next request. Clinical roles require a clinician profile; admins can't grant themselves a clinical role or remove their own admin role."
      />
      <div className={`tbl-wrap ${s.rel}`}>
        <table className="t">
          <caption className="visually-hidden">Staff accounts</caption>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Status</th>
              <th scope="col">Roles</th>
              <th scope="col">Grant a role</th>
              <th scope="col">Two-step</th>
              <th scope="col">Last sign-in</th>
              <th scope="col">Account</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u) => {
              const self = u.id === actor.userId;
              const grantable = STAFF_ROLES.filter((r) => !u.roles.includes(r));
              return (
                <tr key={u.id}>
                  <th scope="row" className="break">
                    {u.email}
                    {self ? <div className="fine">You</div> : null}
                  </th>
                  <td>{u.status === "active" ? <Badge tone="done">Active</Badge> : <Badge tone="alert">{u.status}</Badge>}</td>
                  <td>
                    <ul className="list-plain stack stack-sm">
                      {u.roles.map((r) => (
                        <li key={r} className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
                          <span className="tag">{label(r)}</span>
                          {self && r === "admin" ? (
                            <span className="fine">Can&rsquo;t remove your own</span>
                          ) : (
                            <InlineAction action={setRoleAction.bind(null, u.id)} fields={{ role: r, grant: "0" }} variant="quiet" pendingText="Revoking…">
                              Revoke<span className="visually-hidden"> {label(r)} from {u.email}</span>
                            </InlineAction>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    {grantable.length ? (
                      <ActionForm action={setRoleAction.bind(null, u.id)} className="row">
                        <input type="hidden" name="grant" value="1" />
                        <label className="visually-hidden" htmlFor={`role-${u.id}`}>
                          Role to grant to {u.email}
                        </label>
                        <select id={`role-${u.id}`} name="role" className="select" style={{ width: "auto" }} defaultValue="">
                          <option value="">Choose…</option>
                          {grantable.map((r) => (
                            <option key={r} value={r}>
                              {label(r)}
                            </option>
                          ))}
                        </select>
                        <SubmitButton size="sm" variant="secondary">
                          Grant
                        </SubmitButton>
                      </ActionForm>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{u.mfa ? "Enrolled" : <Badge tone="action">Not enrolled</Badge>}</td>
                  <td className="nowrap">
                    <DateTime value={u.lastLogin} />
                  </td>
                  <td>
                    {self ? (
                      <span className="muted">—</span>
                    ) : u.status !== "active" ? (
                      <InlineAction action={setUserStatusAction.bind(null, u.id)} fields={{ status: "active" }} variant="secondary">
                        Enable<span className="visually-hidden"> {u.email}</span>
                      </InlineAction>
                    ) : (
                      <InlineAction action={setUserStatusAction.bind(null, u.id)} fields={{ status: "disabled" }} variant="danger">
                        Disable<span className="visually-hidden"> {u.email}</span>
                      </InlineAction>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="card stack" aria-labelledby="new-h">
        <h2 id="new-h">Create a staff account</h2>
        <p className="small muted">For clinicians, use Clinicians &amp; licenses so a clinician profile is created with the account.</p>
        <ActionForm action={createStaffAction}>
          <TextField name="email" label="Email" type="email" autoComplete="off" required />
          <TextField name="initialPassword" label="Initial password" type="password" autoComplete="new-password" required hint="Share it through a secure channel." />
          <SelectField
            name="role"
            label="Role"
            required
            placeholder="Choose a role"
            options={(["admin", "support", "billing", "compliance"] as const).map((r) => ({ value: r, label: label(r) }))}
          />
          <div>
            <SubmitButton pendingText="Creating…">Create account</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
