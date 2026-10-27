import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

function loadEnv(file = ".env") {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
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
const recordingsRoot = process.env.MEDIAMTX_RECORDINGS_DIR || "./recordings";

const rows = await db.event.findMany({
  where: { egressId: { not: null }, recordingUrl: null },
  orderBy: { updatedAt: "desc" },
  take: 5,
  select: { id: true, title: true, egressId: true, streamPath: true, status: true },
});

function listMp4(dir, acc = []) {
  try {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) listMp4(full, acc);
      else if (/\.(mp4|m4v|mkv)$/i.test(name)) acc.push({ full, mtime: st.mtimeMs, size: st.size });
    }
  } catch {
    /* ignore */
  }
  return acc;
}

for (const row of rows) {
  const streamPath = row.streamPath || (row.egressId?.startsWith("mtx:") ? row.egressId.slice(4) : null);
  const files = streamPath ? listMp4(path.join(recordingsRoot, streamPath)) : [];
  files.sort((a, b) => b.mtime - a.mtime);
  console.log({
    id: row.id,
    title: row.title,
    status: row.status,
    egressId: row.egressId,
    streamPath,
    latestFile: files[0] || null,
  });
}

await db.$disconnect();
