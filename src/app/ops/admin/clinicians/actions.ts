"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import {
  addAuthorization,
  addLicense,
  addPrivilege,
  authorizationSchema,
  clinicianSchema,
  createClinician,
  endAuthorization,
  licenseSchema,
  privilegeSchema,
  setCredentialStatus,
  updateClinician,
} from "@/server/services/admin";
import { invalid } from "@/domain/errors";
import { bool, echoAlso, str, uuid } from "../_lib/form";

const profileFields = (fd: FormData) => ({
  legalName: str(fd, "legalName"),
  displayName: str(fd, "displayName"),
  credentials: str(fd, "credentials"),
  degree: str(fd, "degree"),
  npi: str(fd, "npi"),
  bio: str(fd, "bio"),
  malpracticeCarrier: str(fd, "malpracticeCarrier"),
  malpracticeExpiresOn: str(fd, "malpracticeExpiresOn"),
  publicProfile: bool(fd, "publicProfile"),
});

const revalidate = (id?: string) => {
  revalidatePath("/ops/admin/clinicians");
  if (id) revalidatePath(`/ops/admin/clinicians/${id}`);
  revalidatePath("/ops/admin/jurisdictions");
};

export async function createClinicianAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = clinicianSchema.parse({ ...profileFields(fd), email: str(fd, "email"), initialPassword: str(fd, "initialPassword"), director: bool(fd, "director") });
    id = await run(actor, (ctx) => createClinician(ctx, input));
    revalidate();
  }, fd);
  if (res.error) return res;
  redirect(`/ops/admin/clinicians/${id}`);
}

const statusSchema = z.enum(["onboarding", "active", "inactive"]);

export async function updateClinicianAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = clinicianSchema
      .omit({ email: true, initialPassword: true, director: true })
      .extend({ status: statusSchema })
      .parse({ ...profileFields(fd), status: str(fd, "status") });
    await run(actor, (ctx) => updateClinician(ctx, uuid(id), input));
    revalidate(id);
    return { message: "Profile saved." };
  }, fd);
}

export async function addLicenseAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = licenseSchema.parse({
      jurisdictionCode: str(fd, "jurisdictionCode"),
      licenseType: str(fd, "licenseType"),
      licenseNumber: str(fd, "licenseNumber"),
      issuedOn: str(fd, "issuedOn"),
      expiresOn: str(fd, "expiresOn"),
      verificationSource: str(fd, "verificationSource"),
    });
    await run(actor, (ctx) => addLicense(ctx, uuid(id), input));
    revalidate(id);
    return { message: "License recorded." };
  }, fd);
  return echoAlso(res, fd, ["jurisdictionCode"]);
}

export async function addPrivilegeAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = privilegeSchema.parse({
      compact: str(fd, "compact"),
      remoteJurisdictionCode: str(fd, "remoteJurisdictionCode"),
      homeLicenseId: str(fd, "homeLicenseId"),
      privilegeIdentifier: str(fd, "privilegeIdentifier"),
      effectiveOn: str(fd, "effectiveOn"),
      expiresOn: str(fd, "expiresOn"),
    });
    await run(actor, (ctx) => addPrivilege(ctx, uuid(id), input));
    revalidate(id);
    return { message: "Compact privilege recorded." };
  }, fd);
  return echoAlso(res, fd, ["remoteJurisdictionCode"]);
}

const credStatus = z.enum(["active", "expired", "suspended", "inactive"]);

export async function setCredentialStatusAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const kind = str(fd, "kind");
    if (kind !== "license" && kind !== "privilege") throw invalid("Unknown credential type.");
    const status = credStatus.parse(str(fd, "status"));
    await run(actor, (ctx) => setCredentialStatus(ctx, kind, uuid(str(fd, "credentialId")), status));
    revalidate(id);
    return { message: "Credential status updated." };
  }, fd);
}

export async function addAuthorizationAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = authorizationSchema.parse({
      serviceId: str(fd, "serviceId"),
      jurisdictionCode: str(fd, "jurisdictionCode"),
      basis: str(fd, "basis"),
      credentialId: str(fd, "credentialId"),
      effectiveOn: str(fd, "effectiveOn"),
      endsOn: str(fd, "endsOn"),
    });
    await run(actor, (ctx) => addAuthorization(ctx, uuid(id), input));
    revalidate(id);
    return { message: "Service authorization added." };
  }, fd);
  return echoAlso(res, fd, ["jurisdictionCode"]);
}

export async function endAuthorizationAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    await run(actor, (ctx) => endAuthorization(ctx, uuid(str(fd, "authorizationId"))));
    revalidate(id);
    return { message: "Authorization ended." };
  }, fd);
}
