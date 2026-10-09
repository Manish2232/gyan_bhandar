import { connection } from "next/server";
import { runApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  await connection();
  return runApi(async () => {
    await enforceRateLimit(request, "session-read", 90, 60 * 1000);
    return { user: await getCurrentUser() };
  });
}