import { assertSameOrigin, parseJson, runApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { signInSchema } from "@/lib/validation";
import { authenticateUser } from "@/services/auth-service";

export function POST(request: Request) {
  return runApi(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(request, "login", 8, 15 * 60 * 1000);
    const input = await parseJson(request, signInSchema);
    const user = await authenticateUser(input);
    await createSession(user.id);
    return { user };
  });
}