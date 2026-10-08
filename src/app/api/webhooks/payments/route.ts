import { withActor, systemActor } from "@/server/db/actor";
import { handlePaymentWebhook } from "@/server/services/payments";
import { log } from "@/server/logger";

/**
 * Payment processor webhook. The body is read raw so the provider signature can be verified
 * before anything is parsed. Events are idempotent by provider event id.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");
  try {
    const outcome = await withActor(systemActor("payment-webhook"), (ctx) => handlePaymentWebhook(ctx, raw, signature));
    if (outcome === "invalid") {
      log.warn("payment webhook rejected", { event: "payment.webhook", outcome });
      return new Response("invalid", { status: 400 });
    }
    log.info("payment webhook", { event: "payment.webhook", outcome });
    return new Response("ok");
  } catch (err) {
    log.error("payment webhook failed", err, { event: "payment.webhook" });
    return new Response("error", { status: 500 });
  }
}
