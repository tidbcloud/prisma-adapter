import { connect } from '@tidbcloud/serverless';
import { PrismaTiDBCloud } from '../dist/index.mjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// setup
dotenv.config();
const connectionString = `${process.env.DATABASE_URL}`;

// Initialize Prisma Client
const connection = connect({ url: connectionString });
const adapter = new PrismaTiDBCloud(connection);
const prisma = new PrismaClient({ adapter });

// Insert
// const user = await prisma.user.create({
//     data: {
//       email: 'test@pingcap.com',
//       name: 'test',
//     },
//   })
// console.log(user)
  
// Query
console.log(await prisma.user.findMany())