import { assertSameOrigin, parseJson, runApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createContributionSchema } from "@/lib/validation";
import { createContributionOrder } from "@/services/payment-service";

export function POST(request: Request) {
  return runApi(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(request, "payment-order", 5, 15 * 60 * 1000);
    const input = await parseJson(request, createContributionSchema);
    return createContributionOrder(input);
  }, 201);
}