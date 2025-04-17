// This test is used to test the PrismaTiDBCloud adapter >= 6.6.0

import { PrismaTiDBCloud } from "../dist/index.mjs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// setup
dotenv.config();
const connectionString = `${process.env.DATABASE_URL}`;

// Initialize Prisma Client
const adapter = new PrismaTiDBCloud({url: connectionString});
const prisma = new PrismaClient({ adapter });

// Query
console.log(await prisma.user.findMany());

async function testInsert() {
  const user = await prisma.user.create({
    data: {
      email: "test@pingcap.com",
      name: "test",
    },
  });
}

async function testTx() {
  const createUser1 = prisma.user.create({
    data: {
      email: "test1@pingcap.com",
      name: "test1",
    },
  });
  const createUser2 = prisma.user.create({
    data: {
      email: "test1@pingcap.com",
      name: "test1",
    },
  });

  const createUser3 = prisma.user.create({
    data: {
      email: "test2@pingcap.com",
      name: "test2",
    },
  });

  try {
    await prisma.$transaction([createUser1, createUser2]); // Operations fail because the email address is duplicated
  } catch (e) {
    console.log(e);
  }

  try {
    await prisma.$transaction([createUser2, createUser3]); // Operations success because the email address is unique
  } catch (e) {
    console.log(e);
  }
}
