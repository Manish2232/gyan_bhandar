import { connection } from "next/server";
import { ApiError, assertSameOrigin, parseJson, runApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { resourceSchema } from "@/lib/validation";
import { createResource, listResources } from "@/services/resource-service";

export async function GET(request: Request) {
  await connection();
  return runApi(async () => {
    await enforceRateLimit(request, "resource-read", 90, 60 * 1000);
    const url = new URL(request.url);
    const mineValue = url.searchParams.get("mine");
    if (mineValue && mineValue !== "true" && mineValue !== "false") {
      throw new ApiError(400, "INVALID_QUERY", "The mine filter must be true or false.");
    }
    const mine = mineValue === "true";
    const category = url.searchParams.get("category")?.trim();
    const query = url.searchParams.get("q")?.trim();
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 12);
    if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 24) {
      throw new ApiError(400, "INVALID_QUERY", "Page or limit is outside the allowed range.");
    }
    if ((category?.length ?? 0) > 50 || (query?.length ?? 0) > 100) {
      throw new ApiError(400, "INVALID_QUERY", "Search parameters are too long.");
    }
    const userId = mine ? (await requireUser()).id : undefined;
    const result = await listResources({
      userId,
      category: mine ? undefined : category || undefined,
      query: mine ? undefined : query || undefined,
      page,
      limit,
    });
    return result;
  });
}

export function POST(request: Request) {
  return runApi(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(request, "resource-write", 30, 60 * 1000);
    const user = await requireUser();
    const input = await parseJson(request, resourceSchema);
    return { resource: await createResource(user.id, input) };
  }, 201);
}