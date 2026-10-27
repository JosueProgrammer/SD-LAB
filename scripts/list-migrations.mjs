import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const rows = await db.$queryRawUnsafe(
    `SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
     FROM _prisma_migrations
     ORDER BY started_at ASC`
  );
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await db.$disconnect();
}
