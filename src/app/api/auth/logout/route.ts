import { assertSameOrigin, runApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revokeCurrentSession } from "@/lib/session";

export function POST(request: Request) {
  return runApi(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(request, "logout", 30, 60 * 1000);
    await revokeCurrentSession();
    return { ok: true };
  });
}