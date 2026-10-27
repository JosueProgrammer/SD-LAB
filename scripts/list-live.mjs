import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const rows = await db.event.findMany({
  where: { OR: [{ isLive: true }, { obsConnected: true }, { status: "LIVE" }] },
  select: {
    id: true,
    title: true,
    status: true,
    isLive: true,
    obsConnected: true,
    streamPath: true,
    playbackUrl: true,
  },
  take: 5,
});
console.log(JSON.stringify(rows, null, 2));
await db.$disconnect();
