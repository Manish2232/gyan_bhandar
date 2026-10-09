import { z } from "zod";

const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(128).refine(
  (password) => Buffer.byteLength(password, "utf8") <= 72,
  "Password must be no more than 72 UTF-8 bytes.",
);

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(60),
  email: z.string().trim().email("Enter a valid email address.").max(254).transform((email) => email.toLowerCase()),
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Enter your password.").max(128),
});

export const resourceSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(120),
  summary: z.string().trim().min(20, "Add a little more context (at least 20 characters).").max(280),
  body: z.string().trim().min(30, "The note must be at least 30 characters.").max(20000),
  category: z.string().trim().min(2).max(50),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  isPublished: z.boolean().default(false),
});

export const resourceUpdateSchema = resourceSchema.partial().extend({
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
  isPublished: z.boolean().optional(),
}).refine(
  (resource) => Object.keys(resource).length > 0,
  "Provide at least one field to update.",
);

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().or(z.literal("")).transform((value) => value || undefined);

export const createContributionSchema = z.object({
  amountRupees: z.number().int().min(1, "The minimum contribution is ₹1.").max(100_000, "The maximum contribution is ₹100,000."),
  donorName: optionalText(80),
  donorEmail: z.string().trim().email("Enter a valid email address.").max(254).optional().or(z.literal("")).transform((value) => value || undefined),
  message: optionalText(500),
});

export const verifyContributionSchema = z.object({
  orderId: z.string().trim().min(8).max(50),
  paymentId: z.string().trim().min(8).max(50),
  signature: z.string().regex(/^[a-fA-F0-9]{64}$/, "Invalid payment signature."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ResourceInput = z.infer<typeof resourceSchema>;
export type ResourceUpdateInput = z.infer<typeof resourceUpdateSchema>;
export type CreateContributionInput = z.infer<typeof createContributionSchema>;
export type VerifyContributionInput = z.infer<typeof verifyContributionSchema>;