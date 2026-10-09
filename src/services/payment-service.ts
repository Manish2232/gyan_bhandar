import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma, type ContributionStatus } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { getRazorpayClient, getRazorpayCredentials } from "@/lib/razorpay";
import { prisma } from "@/lib/db";
import type { CreateContributionInput, VerifyContributionInput } from "@/lib/validation";

const CURRENCY = "INR";

function matchesHmac(message: string, signature: string, secret: string): boolean {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  return matchesHmac(`${orderId}|${paymentId}`, signature, secret);
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function createContributionOrder(input: CreateContributionInput) {
  const { keyId } = getRazorpayCredentials();
  const amountPaise = input.amountRupees * 100;
  const receipt = `gb_${randomBytes(16).toString("hex")}`;
  const contribution = await prisma.contribution.create({
    data: {
      receipt,
      amountPaise,
      currency: CURRENCY,
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      message: input.message,
    },
  });

  let orderId: string;
  try {
    const order = await getRazorpayClient().orders.create({
      amount: amountPaise,
      currency: CURRENCY,
      receipt,
      notes: { contribution_id: contribution.id },
    });
    orderId = order.id;
    await prisma.contribution.update({ where: { id: contribution.id }, data: { razorpayOrderId: orderId } });
  } catch {
    await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED" } }).catch(() => undefined);
    throw new ApiError(502, "ORDER_CREATION_FAILED", "Razorpay could not create the payment order. Please retry.");
  }

  return { contributionId: contribution.id, orderId, amount: amountPaise, currency: CURRENCY, keyId };
}

export async function verifyContributionPayment(input: VerifyContributionInput) {
  const contribution = await prisma.contribution.findUnique({ where: { razorpayOrderId: input.orderId } });
  if (!contribution || !contribution.razorpayOrderId) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "This payment order could not be found.");
  }
  if (contribution.status === "PAID") {
    if (contribution.razorpayPaymentId !== input.paymentId) {
      throw new ApiError(409, "ORDER_ALREADY_PAID", "This order has already been completed.");
    }
    return { status: "PAID" as ContributionStatus, contributionId: contribution.id };
  }

  const { keySecret } = getRazorpayCredentials();
  if (!verifyCheckoutSignature(contribution.razorpayOrderId, input.paymentId, input.signature, keySecret)) {
    throw new ApiError(400, "INVALID_PAYMENT_SIGNATURE", "Razorpay could not verify this payment.");
  }

  const client = getRazorpayClient();
  let payment;
  try {
    payment = await client.payments.fetch(input.paymentId);
  } catch {
    throw new ApiError(502, "PAYMENT_STATUS_UNAVAILABLE", "Payment status could not be checked. Please retry shortly.");
  }
  if (payment.order_id !== contribution.razorpayOrderId || payment.amount !== contribution.amountPaise || payment.currency !== CURRENCY) {
    throw new ApiError(400, "PAYMENT_DETAILS_MISMATCH", "Payment details do not match this order.");
  }

  if (payment.status === "authorized" && !payment.captured) {
    try {
      payment = await client.payments.capture(input.paymentId, contribution.amountPaise, CURRENCY);
    } catch {
      throw new ApiError(502, "PAYMENT_CAPTURE_PENDING", "Payment was authorized but capture is still pending. Please check again shortly.");
    }
  }

  if (payment.status === "captured" && payment.captured) {
    try {
      await prisma.contribution.update({
        where: { id: contribution.id },
        data: { status: "PAID", razorpayPaymentId: input.paymentId, paidAt: new Date() },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      const current = await prisma.contribution.findUnique({ where: { id: contribution.id } });
      if (current?.status !== "PAID" || current.razorpayPaymentId !== input.paymentId) throw error;
    }
    return { status: "PAID" as ContributionStatus, contributionId: contribution.id };
  }

  if (payment.status === "failed") {
    await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED", razorpayPaymentId: input.paymentId } });
    return { status: "FAILED" as ContributionStatus, contributionId: contribution.id };
  }

  return { status: "PENDING" as ContributionStatus, contributionId: contribution.id };
}

type RazorpayWebhook = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } } };
};

export async function handleRazorpayWebhook(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, "WEBHOOK_NOT_CONFIGURED", "The payment webhook is not configured.");
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    throw new ApiError(400, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature is invalid.");
  }

  let event: RazorpayWebhook;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhook;
  } catch {
    throw new ApiError(400, "INVALID_WEBHOOK_BODY", "Webhook payload must be valid JSON.");
  }
  if (event.event !== "payment.captured") return { received: true };

  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id || typeof payment.amount !== "number" || payment.currency !== CURRENCY) {
    throw new ApiError(400, "INVALID_CAPTURE_EVENT", "Captured payment details are incomplete.");
  }
  const contribution = await prisma.contribution.findUnique({ where: { razorpayOrderId: payment.order_id } });
  if (!contribution || contribution.amountPaise !== payment.amount) {
    throw new ApiError(404, "CONTRIBUTION_NOT_FOUND", "The captured payment does not match an order.");
  }
  if (contribution.status === "PAID") return { received: true };

  try {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: "PAID", razorpayPaymentId: payment.id, paidAt: new Date() },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    const current = await prisma.contribution.findUnique({ where: { id: contribution.id } });
    if (current?.status !== "PAID" || current.razorpayPaymentId !== payment.id) throw error;
  }
  return { received: true };
}