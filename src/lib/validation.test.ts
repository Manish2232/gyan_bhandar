import { describe, expect, it } from "vitest";
import { resourceSchema, resourceUpdateSchema, signUpSchema } from "@/lib/validation";

describe("request validation", () => {
  it("normalizes account email and rejects short passwords", () => {
    const valid = signUpSchema.safeParse({ name: "A Curator", email: "  READER@example.com ", password: "a-long-enough-password" });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.email).toBe("reader@example.com");
    expect(signUpSchema.safeParse({ name: "A Curator", email: "reader@example.com", password: "short" }).success).toBe(false);
  });

  it("requires useful content and bounds the resource tags", () => {
    const resource = { title: "Field notes", summary: "A careful note about something worth remembering.", body: "This is a longer note with enough detail to be useful to another reader.", category: "Literature", tags: Array(9).fill("curiosity"), isPublished: false };
    expect(resourceSchema.safeParse(resource).success).toBe(false);
    expect(resourceSchema.safeParse({ ...resource, tags: ["curiosity"] }).success).toBe(true);
  });

  it("does not accept empty resource updates", () => {
    expect(resourceUpdateSchema.safeParse({}).success).toBe(false);
    expect(resourceUpdateSchema.safeParse({ isPublished: true }).success).toBe(true);
  });
});