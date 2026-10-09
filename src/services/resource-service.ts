import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { ResourceInput, ResourceUpdateInput } from "@/lib/validation";

const ownerSelection = { id: true, name: true } as const;

export async function listResources(options: {
  userId?: string;
  category?: string;
  query?: string;
  page: number;
  limit: number;
}) {
  const where = options.userId
    ? { userId: options.userId }
    : {
        isPublished: true,
        ...(options.category ? { category: options.category } : {}),
        ...(options.query ? {
          OR: [
            { title: { contains: options.query, mode: "insensitive" as const } },
            { summary: { contains: options.query, mode: "insensitive" as const } },
            { body: { contains: options.query, mode: "insensitive" as const } },
          ],
        } : {}),
      };
  const skip = (options.page - 1) * options.limit;
  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: options.limit,
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
        tags: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: ownerSelection },
      },
    }),
    prisma.resource.count({ where }),
  ]);
  return { resources, total, page: options.page, limit: options.limit, hasMore: skip + resources.length < total };
}

export async function createResource(userId: string, input: ResourceInput) {
  return prisma.resource.create({
    data: { ...input, userId },
    include: { owner: { select: ownerSelection } },
  });
}

export async function getResource(id: string, userId?: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { owner: { select: ownerSelection } },
  });
  if (!resource || (!resource.isPublished && resource.userId !== userId)) {
    throw new ApiError(404, "RESOURCE_NOT_FOUND", "This resource could not be found.");
  }
  return resource;
}

export async function updateResource(id: string, userId: string, input: ResourceUpdateInput) {
  const existing = await prisma.resource.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new ApiError(404, "RESOURCE_NOT_FOUND", "This resource could not be found.");
  return prisma.resource.update({
    where: { id },
    data: input,
    include: { owner: { select: ownerSelection } },
  });
}

export async function deleteResource(id: string, userId: string): Promise<void> {
  const result = await prisma.resource.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new ApiError(404, "RESOURCE_NOT_FOUND", "This resource could not be found.");
}