import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  getRazorpayClient: vi.fn(),
  getRazorpayCredentials: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { contribution: { findUnique: mocks.findUnique, update: mocks.update, create: mocks.create } } }));
vi.mock("@/lib/razorpay", () => ({ getRazorpayClient: mocks.getRazorpayClient, getRazorpayCredentials: mocks.getRazorpayCredentials }));

import { verifyCheckoutSignature, verifyContributionPayment, verifyWebhookSignature } from "@/services/payment-service";

const secret = "test-only-payment-secret";
const orderId = "order_test_123456";
const paymentId = "pay_test_123456";
const contribution = {
  id: "contribution-1",
  razorpayOrderId: orderId,
  razorpayPaymentId: null,
  amountPaise: 25_000,
  currency: "INR",
  status: "PENDING",
};

describe("payment verification", () => {
  beforeEach(() => {
    mocks.findUnique.mockResolvedValue(contribution);
    mocks.update.mockResolvedValue({ ...contribution, status: "PAID", razorpayPaymentId: paymentId });
    mocks.getRazorpayCredentials.mockReturnValue({ keyId: "rzp_test_placeholder", keySecret: secret });
  });

  it("validates checkout signatures against the stored order ID", () => {
    const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyCheckoutSignature(orderId, paymentId, signature, secret)).toBe(true);
    expect(verifyCheckoutSignature("order_other_12345", paymentId, signature, secret)).toBe(false);
  });

  it("validates webhook signatures against the raw body", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(`${body} `, signature, secret)).toBe(false);
  });

  it("rejects a tampered checkout signature before contacting Razorpay", async () => {
    await expect(verifyContributionPayment({ orderId, paymentId, signature: "0".repeat(64) })).rejects.toMatchObject({ code: "INVALID_PAYMENT_SIGNATURE" });
    expect(mocks.getRazorpayClient).not.toHaveBeenCalled();
  });

  it("records only provider-confirmed captured payments", async () => {
    mocks.getRazorpayClient.mockReturnValue({
      payments: { fetch: vi.fn().mockResolvedValue({
        id: paymentId,
        order_id: orderId,
        amount: 25_000,
        currency: "INR",
        status: "captured",
        captured: true,
      }) },
    });
    const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    const result = await verifyContributionPayment({ orderId, paymentId, signature });
    expect(result).toEqual({ status: "PAID", contributionId: contribution.id });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: contribution.id },
      data: expect.objectContaining({ status: "PAID", razorpayPaymentId: paymentId }),
    }));
  });
});