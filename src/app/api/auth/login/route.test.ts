import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  createSession: vi.fn(),
  authenticateUser: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/session", () => ({ createSession: mocks.createSession }));
vi.mock("@/services/auth-service", () => ({ authenticateUser: mocks.authenticateUser }));

import { POST } from "@/app/api/auth/login/route";

const user = { id: "user-1", name: "Curator", email: "reader@example.com" };

function request(origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "reader@example.com", password: "a-long-enough-password" }),
  });
}

describe("login endpoint", () => {
  beforeEach(() => {
    mocks.authenticateUser.mockResolvedValue(user);
  });

  it("creates a session after valid credentials", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.authenticateUser).toHaveBeenCalledWith({ email: "reader@example.com", password: "a-long-enough-password" });
    expect(mocks.createSession).toHaveBeenCalledWith(user.id);
    expect(await response.json()).toEqual({ user });
  });

  it("rejects a cross-origin sign-in before credential verification", async () => {
    const response = await POST(request("https://untrusted.example"));
    expect(response.status).toBe(403);
    expect(mocks.authenticateUser).not.toHaveBeenCalled();
  });
});