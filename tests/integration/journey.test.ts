import { describe, expect, it } from "vitest";
import { advanceClinical, advancePatient, as, caseRow, system } from "@/server/fixtures/journey";
import { closeCase, caseDeterminations } from "@/server/services/clinical";
import { authorizeFileDownload } from "@/server/services/files";
import { caseDocuments } from "@/server/services/documents";
import { verifyAuditChain } from "@/server/audit";
import { staffActor } from "@/server/fixtures/journey";
import { newPatient, staff } from "./helpers";

describe("end-to-end journey through the service layer", () => {
  it("goes from screening to a closed case with a delivered, signed document", async () => {
    const s = await staff();
    const p = await newPatient("Journey", "Tester");
    expect((await caseRow(p.caseId)).status).toBe("started");
    await advancePatient(p, "payment");
    expect((await caseRow(p.caseId)).status).toBe("intake_incomplete");
    await advancePatient(p, "submit", { from: "consents_intake" });
    expect((await caseRow(p.caseId)).status).toBe("submitted");

    await advanceClinical(s, p, "deliver");
    expect((await caseRow(p.caseId)).status).toBe("delivered");

    const docs = await as(p.actor, (ctx) => caseDocuments(ctx, p.caseId, "patient"));
    expect(docs).toHaveLength(1);
    const file = await as(p.actor, (ctx) => authorizeFileDownload(ctx, docs[0]!.signedFileId!));
    expect(file.mime).toBe("application/pdf");
    expect(file.data.subarray(0, 4).toString()).toBe("%PDF");

    const dets = await as(p.actor, (ctx) => caseDeterminations(ctx, p.caseId, "patient"));
    expect(dets.length).toBe(1);

    await as(staffActor(s, "clinician"), (ctx) => closeCase(ctx, p.caseId));
    expect((await caseRow(p.caseId)).status).toBe("closed");

    const chain = await as(system, (ctx) => verifyAuditChain(ctx));
    expect(chain).toBeNull(); // null = no broken link in the hash chain
  });
});
