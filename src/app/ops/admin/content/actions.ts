"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { contentSchema, saveContent } from "@/server/services/admin";
import { invalid } from "@/domain/errors";
import { int, reviewTag, str, uuid } from "../_lib/form";

const parse = (fd: FormData) =>
  contentSchema.parse({
    title: str(fd, "title"),
    bodyMd: str(fd, "bodyMd"),
    category: str(fd, "category"),
    status: str(fd, "status"),
    reviewTag: reviewTag(fd),
    sortOrder: int(fd, "sortOrder"),
  });

const revalidate = (id?: string) => {
  revalidatePath("/ops/admin/content");
  if (id) revalidatePath(`/ops/admin/content/${id}`);
  revalidatePath("/ops/admin/reviews");
  revalidatePath("/faq");
};

export async function saveContentAction(id: string, kind: "faq" | "legal", _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = parse(fd);
    await run(actor, (ctx) => saveContent(ctx, uuid(id), kind, null, input));
    revalidate(id);
    return { message: "Saved. The preview below shows the saved version." };
  }, fd);
}

export async function createContentAction(kind: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    if (kind !== "faq" && kind !== "legal") throw invalid("Only FAQ and legal entries can be created here.");
    const input = parse(fd);
    await run(actor, (ctx) => saveContent(ctx, null, kind, null, input));
    revalidate();
  }, fd);
  if (res.error) return res;
  redirect(`/ops/admin/content?kind=${kind}`);
}
