import { PrismaTiDBCloud } from '../dist/index.mjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// setup
dotenv.config();
const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaTiDBCloud({
    url: connectionString,
  })
  
const prisma = new PrismaClient({ adapter })

// // Insert
// const user = await prisma.user.create({
//     data: {
//       email: 'test@pingcap.com',
//       name: 'test',
//     },
//   })
  
// Query
console.log(await prisma.user.findMany())

// // Tx
// const createUser1 = prisma.user.create({
//     data: {
//       email: 'test1@pingcap.com',
//       name: 'test1',
//     },
//   })
// const createUser2 = prisma.user.create({
//     data: {
//       email: 'test1@pingcap.com',
//       name: 'test1',
//     },
//   })

// const createUser3 = prisma.user.create({
//     data: {
//       email: 'test2@pingcap.com',
//       name: 'test2',
//     },
//   })
  
// try {
//     await prisma.$transaction([createUser1, createUser2]) // Operations fail because the email address is duplicated
//   } catch (e) {
//     console.log(e)
// }
  
// try {
//     await prisma.$transaction([createUser2, createUser3]) // Operations success because the email address is unique
//   } catch (e) {
//     console.log(e)
// }