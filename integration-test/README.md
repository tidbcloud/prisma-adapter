# How to run the integration test

### prepare the environment

1. full in the `DATABASE_URL` in the `.env` file: `DATABASE_URL='mysql://[username]:[password]@[host]:4000/[database]?sslaccept=strict'`
2. Alter the prisma version, @tidbcloud/serverless and @prisma/driver-adapter-utils as you need in the `package.json` file
3. Run `pnpm install` to install the dependencies
4. Run `npm run build` to build the prisma-adapter

### Run the integration test

1. cd to the `integration-test` directory
2. Run `npx prisma db push` to push the schema to the database
3. Run `npx prisma generate` to generate the Prisma client
4. Run `npx jtest integration-test` to run the integration test

### Manual test

1. cd to the `integration-test` directory
2. Run `npx prisma db push` to push the schema to the database
3. Run `npx prisma generate` to generate the Prisma client
4. Run `node manually-test.js` to run the integration test

### Clean the environment

the @prisma/client dependency will be added during the integration test, so you need to remove it after the test is done.
