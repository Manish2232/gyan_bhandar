import { ApiError, runApi } from "@/lib/api";
import { handleRazorpayWebhook } from "@/services/payment-service";

const MAX_WEBHOOK_BYTES = 128 * 1024;

export async function POST(request: Request) {
  return runApi(async () => {
    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) throw new ApiError(400, "MISSING_WEBHOOK_SIGNATURE", "Webhook signature is required.");
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > MAX_WEBHOOK_BYTES) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Webhook payload is too large.");
    }
    return handleRazorpayWebhook(body, signature);
  });
}