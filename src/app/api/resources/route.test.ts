import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
  createResource: vi.fn(),
  listResources: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/session", () => ({ requireUser: mocks.requireUser, getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/services/resource-service", () => ({ createResource: mocks.createResource, listResources: mocks.listResources }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, connection: vi.fn().mockResolvedValue(undefined) };
});

import { GET, POST } from "@/app/api/resources/route";
import { ApiError } from "@/lib/api";

const user = { id: "user-1", name: "Curator", email: "curator@example.com" };
const validResource = {
  title: "Field notes on attention",
  summary: "A short collection of observations about the places we pass every day.",
  body: "Take one ordinary walk slowly and write down details you normally leave unnamed.",
  category: "Literature",
  tags: ["field notes"],
  isPublished: true,
};

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { Origin: "http://localhost:3000", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("resource collection endpoints", () => {
  beforeEach(() => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.createResource.mockResolvedValue({ id: "resource-1", ...validResource, userId: user.id });
  });

  it("creates a resource for the authenticated owner", async () => {
    const response = await POST(request("/api/resources", "POST", validResource));
    expect(response.status).toBe(201);
    expect(mocks.createResource).toHaveBeenCalledWith(user.id, validResource);
    expect(await response.json()).toMatchObject({ resource: { id: "resource-1" } });
  });

  it("returns field validation errors before creating invalid resources", async () => {
    const response = await POST(request("/api/resources", "POST", { ...validResource, title: "x" }));
    expect(response.status).toBe(422);
    expect(mocks.createResource).not.toHaveBeenCalled();
  });

  it("rejects oversized request bodies before resource validation", async () => {
    const oversized = new Request("http://localhost:3000/api/resources", {
      method: "POST",
      headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
      body: JSON.stringify({ ...validResource, body: "x".repeat(140_000) }),
    });
    const response = await POST(oversized);
    expect(response.status).toBe(413);
    expect(mocks.createResource).not.toHaveBeenCalled();
  });

  it("rejects cross-origin writes", async () => {
    const crossOrigin = new Request("http://localhost:3000/api/resources", {
      method: "POST",
      headers: { Origin: "https://elsewhere.example", "Content-Type": "application/json" },
      body: JSON.stringify(validResource),
    });
    const response = await POST(crossOrigin);
    expect(response.status).toBe(403);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it("requires an owner for private library results", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "Sign in to continue."));
    const response = await GET(request("/api/resources?mine=true"));
    expect(response.status).toBe(401);
    expect(mocks.listResources).not.toHaveBeenCalled();
  });
});