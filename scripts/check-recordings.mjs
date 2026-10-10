import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

function loadEnv(path = ".env") {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();
const db = new PrismaClient();
const rows = await db.event.findMany({
  orderBy: { updatedAt: "desc" },
  take: 10,
  select: {
    id: true,
    title: true,
    status: true,
    egressId: true,
    recordingUrl: true,
    recordingEnabled: true,
    isLive: true,
    obsConnected: true,
  },
});
console.log(
  rows.map((r) => ({
    title: r.title,
    status: r.status,
    hasEgress: Boolean(r.egressId),
    hasUrl: Boolean(r.recordingUrl),
    recordingEnabled: r.recordingEnabled,
    isLive: r.isLive,
    obsConnected: r.obsConnected,
  }))
);
await db.$disconnect();
