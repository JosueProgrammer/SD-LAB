import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { EgressClient } from "livekit-server-sdk";

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
const host = (process.env.LIVEKIT_API_URL || "")
  .replace(/^wss:/i, "https:")
  .replace(/^ws:/i, "http:");
const egress = new EgressClient(host, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);

const rows = await db.event.findMany({
  where: { egressId: { not: null }, recordingUrl: null },
  orderBy: { updatedAt: "desc" },
  take: 5,
  select: { id: true, title: true, egressId: true, status: true },
});

for (const row of rows) {
  try {
    const listed = await egress.listEgress({ egressId: row.egressId });
    const info = listed[0];
    console.log({
      title: row.title,
      status: row.status,
      egressStatus: info?.status,
      error: info?.error || null,
      fileResults: (info?.fileResults || []).map((f) => ({
        filename: f.filename,
        location: f.location,
        size: f.size?.toString?.() || f.size,
      })),
    });
  } catch (error) {
    console.log({
      title: row.title,
      inspectError: error instanceof Error ? error.message : String(error),
    });
  }
}

await db.$disconnect();
