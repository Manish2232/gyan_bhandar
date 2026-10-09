import { assertSameOrigin, parseJson, runApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { signUpSchema } from "@/lib/validation";
import { registerUser } from "@/services/auth-service";

export function POST(request: Request) {
  return runApi(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(request, "signup", 5, 15 * 60 * 1000);
    const input = await parseJson(request, signUpSchema);
    const user = await registerUser(input);
    await createSession(user.id);
    return { user };
  }, 201);
}