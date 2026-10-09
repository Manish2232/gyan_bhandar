import { connection } from "next/server";
import { ApiError, assertSameOrigin, parseJson, runApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getCurrentUser, requireUser } from "@/lib/session";
import { resourceUpdateSchema } from "@/lib/validation";
import { deleteResource, getResource, updateResource } from "@/services/resource-service";

type RouteContext = { params: Promise<{ id: string }> };

function checkId(id: string): string {
  if (!id || id.length > 64) throw new ApiError(404, "RESOURCE_NOT_FOUND", "This resource could not be found.");
  return id;
}

export async function GET(request: Request, context: RouteContext) {
  await connection();
  return runApi(async () => {
    await enforceRateLimit(request, "resource-read", 90, 60 * 1000);
    const { id } = await context.params;
    const user = await getCurrentUser();
    return { resource: await getResource(checkId(id), user?.id) };
  });
}

export function PATCH(request: Request, context: RouteContext) {
  return runApi(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(request, "resource-write", 30, 60 * 1000);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await parseJson(request, resourceUpdateSchema);
    return { resource: await updateResource(checkId(id), user.id, input) };
  });
}

export function DELETE(request: Request, context: RouteContext) {
  return runApi(async () => {
    assertSameOrigin(request);
    await enforceRateLimit(request, "resource-write", 30, 60 * 1000);
    const user = await requireUser();
    const { id } = await context.params;
    await deleteResource(checkId(id), user.id);
    return { ok: true };
  });
}