import { NextResponse } from "next/server";
import { ZodError } from "zod";

const MAX_REQUEST_BYTES = 128 * 1024;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseJson<T>(request: Request, schema: { parse: (value: unknown) => T }): Promise<T> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }

  let body: unknown;
  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  if (Buffer.byteLength(text, "utf8") > MAX_REQUEST_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  let allowedOrigin: string;
  try {
    allowedOrigin = process.env.NODE_ENV === "production"
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").origin
      : new URL(request.url).origin;
  } catch {
    throw new ApiError(503, "ORIGIN_NOT_CONFIGURED", "This service is not fully configured.");
  }
  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin ?? "").origin;
  } catch {
    throw new ApiError(403, "ORIGIN_REJECTED", "This request could not be verified.");
  }
  if (requestOrigin !== allowedOrigin) {
    throw new ApiError(403, "ORIGIN_REJECTED", "This request could not be verified.");
  }
}

export async function runApi<T>(operation: () => Promise<T>, status = 200): Promise<NextResponse> {
  try {
    return NextResponse.json(await operation(), { status });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields.", details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) } }, { status: 422 });
    }
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    console.error("Unhandled API error", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}