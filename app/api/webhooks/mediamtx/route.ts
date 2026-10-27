import { db } from "@/lib/db";
import { allowRecordingRetry, startEventRecording } from "@/lib/recording";

type MediamtxHook = {
  action?: string;
  path?: string;
};

export async function POST(req: Request) {
  let payload: MediamtxHook = {};
  try {
    payload = (await req.json()) as MediamtxHook;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const streamPath = payload.path?.trim();
  const action = payload.action?.trim();
  if (!streamPath || !action) {
    return new Response("Missing path/action", { status: 400 });
  }

  if (action === "ready") {
    await db.stream.updateMany({
      where: { streamPath },
      data: { isLive: true },
    });
    const events = await db.event.findMany({
      where: { streamPath },
      select: { id: true },
    });
    await db.event.updateMany({
      where: { streamPath },
      data: { obsConnected: true },
    });
    for (const item of events) {
      await startEventRecording(item.id);
    }
  }

  if (action === "notready") {
    await db.stream.updateMany({
      where: { streamPath },
      data: { isLive: false },
    });
    const events = await db.event.findMany({
      where: { streamPath },
      select: { id: true },
    });
    await db.event.updateMany({
      where: { streamPath },
      data: { obsConnected: false },
    });
    for (const item of events) {
      await allowRecordingRetry(item.id);
    }
  }

  return new Response(null, { status: 200 });
}
