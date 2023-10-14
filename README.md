# @tidbcloud/prisma-adapter

Prisma driver adapter for [TiDB Cloud Serverless Driver](https://github.com/tidbcloud/serverless-js).

## Before you start

Before you start, make sure you have:

- A TiDB Cloud account
- Node  >= 18
- [Prisma CLI](https://www.prisma.io/docs/concepts/components/prisma-cli) installed

## Install

You will need to install the `@tidbcloud/prisma-adapter` driver adapter, the `@tidbcloud/serverless` serverless driver and the prisma CLI.

```
npm install @tidbcloud/prisma-adapter
npm install @tidbcloud/serverless
```

## DATABASE URL

Set the environment to your .env file in the local environment. You can get connection information on the TiDB Cloud console.

```
// .env
DATABASE_URL="mysql://username:password@host:4000/database?sslaccept=strict"
```

> NOTE
> 
> The adapter only supports Prisma Client. Prisma migration and introspection still go through the traditional TCP way. If you only need Prisma Client, you can set the DATABASE_URL as the `mysql://username:password@host/database` format which port and ssl parameters are not needed).

## Define Prisma schema

First, you need to create a Prisma schema file called schema.prisma and define the model. Here we use the user as an example.

```
// schema.prisma
generator client {
provider        = "prisma-client-js"
previewFeatures = ["driverAdapters"]
}

datasource db {
provider     = "mysql"
url          = env("DATABASE_URL")

// define model according to your database table
model user {
id    Int     @id @default(autoincrement())
email String? @unique(map: "uniq_email") @db.VarChar(255)
name  String? @db.VarChar(255)
}
```

## Query

Here is an example of query:

```
// query.js
import { connect } from '@tidbcloud/serverless';
import { PrismaTiDBCloud } from '@tidbcloud/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// setup
dotenv.config();
const connectionString = `${process.env.DATABASE_URL}`;

// init prisma client
const connection = connect({ url: connectionString });
const adapter = new PrismaTiDBCloud(connection);
const prisma = new PrismaClient({ adapter });

// insert
const user = await prisma.user.create({
    data: {
        email: 'test@prisma.io',
        name: 'test',
    },
})
console.log(user)

// query after insert
console.log(await prisma.user.findMany())
```

## Transaction

Here is an example of transaction:

```
// query.js
import { connect } from '@tidbcloud/serverless';
import { PrismaTiDBCloud } from '@tidbcloud/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// setup
dotenv.config();
const connectionString = `${process.env.DATABASE_URL}`;

// init prisma client
const connection = connect({ url: connectionString });
const adapter = new PrismaTiDBCloud(connection);
const prisma = new PrismaClient({ adapter });

const createUser1 = prisma.user.create({
  data: {
    email: 'yuhang.shi@pingcap.com',
    name: 'Shi Yuhang',
  },
})

const createUser2 = prisma.user.create({
  data: {
    email: 'yuhang.shi@pingcap.com',
    name: 'Shi Yuhang2',
  },
})

const createUser3 = prisma.user.create({
  data: {
    email: 'yuhang2.shi@pingcap.com',
    name: 'Shi Yuhang2',
  },
})
try {
  await prisma.$transaction([createUser1, createUser2]) // Operations fail together
} catch (e) {
  console.log(e)
  await prisma.$transaction([createUser1, createUser3]) // Operations success together
}
```