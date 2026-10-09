import { hash, compare } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { SignInInput, SignUpInput } from "@/lib/validation";

const PASSWORD_COST = 12;
const missingUserHash = hash(randomBytes(32).toString("base64url"), PASSWORD_COST);

export async function registerUser(input: SignUpInput) {
  try {
    const passwordHash = await hash(input.password, PASSWORD_COST);
    return await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "EMAIL_IN_USE", "An account with this email already exists.");
    }
    throw error;
  }
}

export async function authenticateUser(input: SignInInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordHash = user?.passwordHash ?? await missingUserHash;
  const passwordMatches = await compare(input.password, passwordHash);
  if (!user || !passwordMatches) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  return { id: user.id, name: user.name, email: user.email };
}