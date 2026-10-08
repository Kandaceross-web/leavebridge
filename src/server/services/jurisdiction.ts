import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "../db/client";
import { clinicians, compactPrivileges, jurisdictions, licenses, serviceAuthorizations } from "../db/schema";
import { canServe, type AuthorizationRecord, type CanServeResult } from "@/domain/jurisdiction/can-serve";

/** Loads every authorization (with its basis credential) for a jurisdiction and service. */
export async function loadAuthorizations(tx: DbOrTx, filter: { jurisdictionCode?: string; serviceId?: string; clinicianId?: string }): Promise<AuthorizationRecord[]> {
  const conds = [];
  if (filter.jurisdictionCode) conds.push(eq(serviceAuthorizations.jurisdictionCode, filter.jurisdictionCode));
  if (filter.serviceId) conds.push(eq(serviceAuthorizations.serviceId, filter.serviceId));
  if (filter.clinicianId) conds.push(eq(serviceAuthorizations.clinicianId, filter.clinicianId));
  const auths = await tx.select().from(serviceAuthorizations).where(conds.length ? and(...conds) : undefined);
  const licIds = auths.map((a) => a.licenseId).filter((x): x is string => !!x);
  const cpIds = auths.map((a) => a.compactPrivilegeId).filter((x): x is string => !!x);
  const lics = licIds.length ? await tx.select().from(licenses).where(inArray(licenses.id, licIds)) : [];
  const cps = cpIds.length ? await tx.select().from(compactPrivileges).where(inArray(compactPrivileges.id, cpIds)) : [];
  return auths.map((a) => {
    const lic = a.basis === "license" ? lics.find((l) => l.id === a.licenseId) : undefined;
    const cp = a.basis === "compact_privilege" ? cps.find((c) => c.id === a.compactPrivilegeId) : undefined;
    const credential = lic
      ? { id: lic.id, status: lic.status, expiresOn: lic.expiresOn, effectiveOn: lic.issuedOn }
      : cp
        ? { id: cp.id, status: cp.status, expiresOn: cp.expiresOn, effectiveOn: cp.effectiveOn }
        : null;
    return {
      id: a.id,
      clinicianId: a.clinicianId,
      serviceId: a.serviceId,
      jurisdictionCode: a.jurisdictionCode,
      status: a.status,
      effectiveOn: a.effectiveOn,
      endsOn: a.endsOn,
      basis: a.basis,
      credential,
    };
  });
}

export async function checkCanServe(tx: DbOrTx, clinicianId: string, serviceId: string, jurisdictionCode: string, on: Date): Promise<CanServeResult> {
  const [j] = await tx.select().from(jurisdictions).where(eq(jurisdictions.code, jurisdictionCode)).limit(1);
  const [c] = await tx.select().from(clinicians).where(eq(clinicians.id, clinicianId)).limit(1);
  if (!c) return { ok: false, reasons: ["clinician_inactive"] };
  const auths = await loadAuthorizations(tx, { jurisdictionCode, serviceId, clinicianId });
  return canServe({ jurisdiction: j ?? null, clinician: c, serviceId, authorizations: auths, on });
}

/** Clinicians who can serve this jurisdiction + service on the date. */
export async function servingClinicians(tx: DbOrTx, serviceId: string, jurisdictionCode: string, on: Date) {
  const [j] = await tx.select().from(jurisdictions).where(eq(jurisdictions.code, jurisdictionCode)).limit(1);
  const auths = await loadAuthorizations(tx, { jurisdictionCode, serviceId });
  const ids = [...new Set(auths.map((a) => a.clinicianId))];
  if (!ids.length) return [];
  const rows = await tx.select().from(clinicians).where(inArray(clinicians.id, ids));
  return rows
    .map((c) => ({ clinician: c, result: canServe({ jurisdiction: j ?? null, clinician: c, serviceId, authorizations: auths, on }) }))
    .filter((x) => x.result.ok);
}

export async function activeJurisdictionCodes(tx: DbOrTx): Promise<Set<string>> {
  const rows = await tx.select({ code: jurisdictions.code }).from(jurisdictions).where(and(eq(jurisdictions.isActive, true), eq(jurisdictions.telehealthAuthorized, true)));
  return new Set(rows.map((r) => r.code));
}

/** Jurisdictions where this clinician currently holds an active authorization (for triage visibility). */
export async function clinicianJurisdictions(tx: DbOrTx, clinicianId: string): Promise<string[]> {
  const rows = await tx
    .selectDistinct({ code: serviceAuthorizations.jurisdictionCode })
    .from(serviceAuthorizations)
    .where(and(eq(serviceAuthorizations.clinicianId, clinicianId), eq(serviceAuthorizations.status, "active")));
  return rows.map((r) => r.code);
}
