import { PrismaTiDBCloud } from "../dist/index.mjs";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

let prisma: PrismaClient;

beforeAll(async () => {
  dotenv.config();
  const connectionString = `${process.env.DATABASE_URL}`;
  // Initialize Prisma Client
  const adapter = new PrismaTiDBCloud({ url: connectionString });
  prisma = new PrismaClient({ adapter });
  await prisma.user.deleteMany();
}, 20000);

describe("crud test", () => {
  test("create user and query", async () => {
    const user = await prisma.user.create({
      data: {
        email: "user1@pingcap.com",
        name: "user1",
      },
    });
    const queryUser = await prisma.user.findFirst({
      where: { id: user.id },
    });
    expect(queryUser).not.toBeNull();
  });

  test("update user and query", async () => {
    const user = await prisma.user.create({
      data: {
        email: "user2@pingcap.com",
        name: "user2",
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { name: "user2-update" },
    });
    const queryUser = await prisma.user.findFirst({
      where: { name: "user2-update" },
    });

    expect(queryUser).not.toBeNull();
  });
});

describe("tx test", () => {
  test("test tx success", async () => {
    const createUser1 = prisma.user.create({
      data: {
        email: "tx_user1@pingcap.com",
        name: "tx_user1",
      },
    });
    const createUser2 = prisma.user.create({
      data: {
        email: "tx_user2@pingcap.com",
        name: "tx_user2",
      },
    });

    await expect(
      prisma.$transaction([createUser1, createUser2])
    ).resolves.toHaveLength(2);
    const queryUser1 = await prisma.user.findFirst({
      where: { name: "tx_user1" },
    });
    console.log("queryUser1", queryUser1);
    const queryUser2 = await prisma.user.findFirst({
      where: { name: "tx_user2" },
    });
    expect(queryUser1).not.toBeNull();
    expect(queryUser2).not.toBeNull();
  });

  test("tx rollback", async () => {
    const createUser1 = prisma.user.create({
      data: {
        email: "tx_rollback1@pingcap.com",
        name: "tx_user1",
      },
    });
    const createUser2 = prisma.user.create({
      data: {
        email: "tx_rollback1@pingcap.com",
        name: "tx_user2",
      },
    });

    // excepet operations fail because the email address is duplicated
    await expect(
      prisma.$transaction([createUser1, createUser2])
    ).rejects.toThrow();
    // except the first operation fails because of transaction aborts
    const quertUser1 = await prisma.user.findFirst({
      where: { name: "tx_rollback1" },
    });
    expect(quertUser1).toBeNull();
  });
});
