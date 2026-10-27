import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const events = await db.event.findMany({
  where: { streamPath: { not: null } },
  select: { id: true, streamPath: true, playbackUrl: true },
});

for (const event of events) {
  if (!event.streamPath) continue;
  const playbackUrl = `/api/hls/${event.streamPath}/index.m3u8`;
  if (event.playbackUrl === playbackUrl) continue;
  await db.event.update({ where: { id: event.id }, data: { playbackUrl } });
  console.log("updated event", event.id, playbackUrl);
}

const streams = await db.stream.findMany({
  where: { streamPath: { not: null } },
  select: { id: true, streamPath: true, playbackUrl: true },
});

for (const stream of streams) {
  if (!stream.streamPath) continue;
  const playbackUrl = `/api/hls/${stream.streamPath}/index.m3u8`;
  if (stream.playbackUrl === playbackUrl) continue;
  await db.stream.update({ where: { id: stream.id }, data: { playbackUrl } });
  console.log("updated stream", stream.id, playbackUrl);
}

await db.$disconnect();
console.log("done");
