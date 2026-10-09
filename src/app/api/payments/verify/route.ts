import { assertSameOrigin, parseJson, runApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyContributionSchema } from "@/lib/validation";
import { verifyContributionPayment } from "@/services/payment-service";

export function POST(request: Request) {
  return runApi(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(request, "payment-verify", 10, 60 * 1000);
    const input = await parseJson(request, verifyContributionSchema);
    return verifyContributionPayment(input);
  });
}