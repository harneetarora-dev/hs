import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL_DIRECT ||
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=10";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  // Create Owner
  await prisma.user.upsert({
    where: { email: "owner@furniture-oms.com" },
    update: {},
    create: {
      name: "Harneet Arora",
      email: "owner@furniture-oms.com",
      passwordHash,
      role: "owner",
      phone: "+91 98765 00001",
    },
  });

  // Create Merchants
  const merchant1 = await prisma.user.upsert({
    where: { email: "merchant1@furniture-oms.com" },
    update: {},
    create: {
      name: "Rajesh Kumar",
      email: "merchant1@furniture-oms.com",
      passwordHash,
      role: "merchant",
      phone: "+91 98765 00002",
    },
  });

  await prisma.user.upsert({
    where: { email: "merchant2@furniture-oms.com" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "merchant2@furniture-oms.com",
      passwordHash,
      role: "merchant",
      phone: "+91 98765 00003",
    },
  });

  // Create Supervisors
  await prisma.user.upsert({
    where: { email: "supervisor1@furniture-oms.com" },
    update: {},
    create: {
      name: "Amit Patel",
      email: "supervisor1@furniture-oms.com",
      passwordHash,
      role: "supervisor",
      phone: "+91 98765 00004",
    },
  });

  // Create Designer
  await prisma.user.upsert({
    where: { email: "designer1@furniture-oms.com" },
    update: {},
    create: {
      name: "Neha Gupta",
      email: "designer1@furniture-oms.com",
      passwordHash,
      role: "designer",
      phone: "+91 98765 00005",
    },
  });

  // Create Contractors
  await prisma.user.upsert({
    where: { email: "contractor1@furniture-oms.com" },
    update: {},
    create: {
      name: "Ravi Carpenter",
      email: "contractor1@furniture-oms.com",
      passwordHash,
      role: "contractor",
      phone: "+91 98765 00006",
      skills: ["carpentry", "polishing"],
      maxConcurrentOrders: 3,
    },
  });

  await prisma.user.upsert({
    where: { email: "contractor2@furniture-oms.com" },
    update: {},
    create: {
      name: "Suresh Metalwork",
      email: "contractor2@furniture-oms.com",
      passwordHash,
      role: "contractor",
      phone: "+91 98765 00007",
      skills: ["metalwork", "glass"],
      maxConcurrentOrders: 2,
    },
  });

  // Create Locations
  await prisma.location.upsert({
    where: { id: "loc-1" },
    update: {},
    create: {
      id: "loc-1",
      name: "Workshop A — Sector 5",
      address: "Sector 5, Industrial Area, Chandigarh",
    },
  });

  await prisma.location.upsert({
    where: { id: "loc-2" },
    update: {},
    create: {
      id: "loc-2",
      name: "Workshop B — Phase 7",
      address: "Phase 7, Industrial Area, Mohali",
    },
  });

  await prisma.location.upsert({
    where: { id: "loc-3" },
    update: {},
    create: {
      id: "loc-3",
      name: "Workshop C — Panchkula",
      address: "Industrial Area, Panchkula",
    },
  });

  // Create sample Architect
  await prisma.architect.upsert({
    where: { id: "arch-1" },
    update: {},
    create: {
      id: "arch-1",
      name: "Ar. Vikram Mehta",
      firmName: "Mehta Design Studio",
      phone: "+91 99876 54321",
      email: "vikram@mehtadesign.com",
    },
  });

  // Create a sample lead
  await prisma.lead.upsert({
    where: { leadNumber: "LD-2026-0001" },
    update: {},
    create: {
      leadNumber: "LD-2026-0001",
      merchantId: merchant1.id,
      clientName: "Anita Verma",
      clientPhone: "+91 98123 45678",
      clientEmail: "anita.verma@email.com",
      source: "phone",
      productInterest: "Custom dining table set with 6 chairs, teak wood, modern design",
      status: "qualified",
    },
  });

  console.log("Seed data created successfully!");
  console.log("\nLogin credentials (all accounts use the same password):");
  console.log("  Email: owner@furniture-oms.com");
  console.log("  Password: admin123");
  console.log("\nOther accounts: merchant1@, merchant2@, supervisor1@, designer1@, contractor1@, contractor2@ (all @furniture-oms.com)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
