import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db";

const sampleResources = [
  {
    title: "The practice of paying attention",
    summary: "A few gentle prompts for noticing more of the world already around you.",
    body: "Attention is a kind of hospitality. Pick one ordinary thing on your next walk and stay with it for a full minute: a window, a tree, a sound from another room. Write down what changed when you stopped naming it and started looking.\n\nThis is a small exercise in making room for detail, not a test of observation.",
    category: "Literature",
    tags: ["field notes", "attention"],
  },
  {
    title: "A pocket guide to better questions",
    summary: "Questions that make research feel less like searching and more like opening doors.",
    body: "Start with what surprised you. Ask what would have to be true for the opposite to be true. Look for the smallest example that does not fit.\n\nWhen a topic gets too large, ask: what can I observe directly, what am I borrowing from someone else, and what would change my mind? Keep the questions that make the next step clearer.",
    category: "Science",
    tags: ["research", "learning"],
  },
  {
    title: "Maps are arguments",
    summary: "A short reminder that every map makes choices about what deserves to be seen.",
    body: "A map is never the place itself. Scale, labels, borders, and omissions all shape a reader's sense of what matters. When you use a map, ask who made it, when it was made, what it was made for, and what it leaves outside the frame.\n\nThat habit travels well beyond cartography: every summary has an edge.",
    category: "History",
    tags: ["maps", "visual culture"],
  },
];

async function main() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!email || !password || Buffer.byteLength(password, "utf8") < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Set SEED_OWNER_EMAIL and a 12-72 byte SEED_OWNER_PASSWORD before seeding.");
  }

  const passwordHash = await hash(password, 12);
  const owner = await prisma.user.upsert({
    where: { email },
    update: { name: "Library Curator" },
    create: { email, name: "Library Curator", passwordHash },
  });

  for (const resource of sampleResources) {
    const existing = await prisma.resource.findFirst({ where: { userId: owner.id, title: resource.title } });
    if (!existing) await prisma.resource.create({ data: { ...resource, userId: owner.id, isPublished: true } });
  }
}

main()
  .then(() => console.info("Seed data is ready."))
  .catch((error: unknown) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());