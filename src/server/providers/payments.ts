import "server-only";
import { createHmac } from "node:crypto";
import { env } from "../env";
import { randomToken, safeEqual } from "../crypto";

/**
 * Payment processors are commonly NOT business associates, so this integration is
 * PHI-minimal by construction: the processor receives an amount, a neutral line-item name
 * ("Professional assessment service"), the payer's email for the receipt, and an opaque
 * payment UUID. No case details, service names, diagnoses or screening data. (SEC-05, LEG-12)
 */
export const NEUTRAL_DESCRIPTION = "Professional assessment service";

export interface CheckoutRequest {
  paymentId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentWebhookEvent {
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "other";
  paymentId: string | null;
  providerPaymentRef: string | null;
}

export interface PaymentProvider {
  readonly name: "fake" | "stripe";
  createCheckout(req: CheckoutRequest): Promise<{ checkoutRef: string; redirectUrl: string }>;
  verifyWebhook(rawBody: string, signatureHeader: string | null): PaymentWebhookEvent | null;
  refund(providerPaymentRef: string, amountCents: number): Promise<{ refundRef: string }>;
}

/** Development provider: simulates a hosted checkout page inside the app. */
class FakeProvider implements PaymentProvider {
  readonly name = "fake" as const;
  async createCheckout(req: CheckoutRequest) {
    const checkoutRef = `fake_cs_${randomToken(12)}`;
    return { checkoutRef, redirectUrl: `/portal/checkout/simulated?ref=${encodeURIComponent(checkoutRef)}` };
  }
  verifyWebhook(): PaymentWebhookEvent | null {
    return null;
  }
  async refund() {
    return { refundRef: `fake_re_${randomToken(12)}` };
  }
}

class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
  ) {}

  private async call(path: string, form: Record<string, string>) {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": form["idempotency"] ?? randomToken(16) },
      body: new URLSearchParams(Object.fromEntries(Object.entries(form).filter(([k]) => k !== "idempotency"))),
    });
    if (!res.ok) throw new Error(`Stripe request failed (${res.status})`);
    return (await res.json()) as Record<string, unknown>;
  }

  async createCheckout(req: CheckoutRequest) {
    const session = await this.call("checkout/sessions", {
      idempotency: `checkout_${req.paymentId}`,
      mode: "payment",
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      customer_email: req.customerEmail,
      client_reference_id: req.paymentId,
      "metadata[payment_id]": req.paymentId,
      "payment_intent_data[metadata][payment_id]": req.paymentId,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": req.currency,
      "line_items[0][price_data][unit_amount]": String(req.amountCents),
      "line_items[0][price_data][product_data][name]": NEUTRAL_DESCRIPTION,
    });
    return { checkoutRef: String(session.id), redirectUrl: String(session.url) };
  }

  verifyWebhook(rawBody: string, header: string | null): PaymentWebhookEvent | null {
    if (!header) return null;
    const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
    const t = parts["t"];
    const v1 = parts["v1"];
    if (!t || !v1) return null;
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return null;
    const expected = createHmac("sha256", this.webhookSecret).update(`${t}.${rawBody}`).digest("hex");
    if (!safeEqual(expected, v1)) return null;
    const evt = JSON.parse(rawBody) as { id: string; type: string; data: { object: Record<string, unknown> } };
    const obj = evt.data.object;
    const metadata = (obj["metadata"] as Record<string, string> | undefined) ?? {};
    if (evt.type === "checkout.session.completed" && obj["payment_status"] === "paid") {
      return { eventId: evt.id, type: "payment.succeeded", paymentId: metadata["payment_id"] ?? null, providerPaymentRef: (obj["payment_intent"] as string) ?? null };
    }
    if (evt.type === "checkout.session.expired" || evt.type === "payment_intent.payment_failed") {
      return { eventId: evt.id, type: "payment.failed", paymentId: metadata["payment_id"] ?? null, providerPaymentRef: null };
    }
    return { eventId: evt.id, type: "other", paymentId: null, providerPaymentRef: null };
  }

  async refund(providerPaymentRef: string, amountCents: number) {
    const r = await this.call("refunds", { payment_intent: providerPaymentRef, amount: String(amountCents) });
    return { refundRef: String(r.id) };
  }
}

let instance: PaymentProvider | null = null;
export function payments(): PaymentProvider {
  if (instance) return instance;
  if (env.PAYMENTS_PROVIDER === "stripe") {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) throw new Error("Stripe is selected but not configured");
    instance = new StripeProvider(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET);
  } else {
    instance = new FakeProvider();
  }
  return instance;
}
