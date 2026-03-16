import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed admin user
  const hashedPassword = await bcrypt.hash("1234", 12);

  await prisma.adminUser.upsert({
    where: { email: "order@casezy.in" },
    update: { hashedPassword },
    create: {
      email: "order@casezy.in",
      name: "Casezy Admin",
      hashedPassword,
    },
  });

  console.log("Seeded admin user: order@casezy.in / 1234");

  // Seed a sample product
  await prisma.product.upsert({
    where: { slug: "sample-phone-case" },
    update: {},
    create: {
      name: "Sample Phone Case",
      slug: "sample-phone-case",
      description: "A premium phone case",
      price: 499.0,
      currency: "INR",
      active: true,
      sku: "CASE-001",
    },
  });

  console.log("Seeded sample product: sample-phone-case");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
