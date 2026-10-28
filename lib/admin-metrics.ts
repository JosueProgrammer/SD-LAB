import os from "os";
import { db } from "@/lib/db";
import { listPaths, parseResolutionHeight, type PathListItem } from "@/lib/mediamtx";

const PRESENCE_TTL_MS = 30_000;
const HISTORY_MAX = 60;

export type ThresholdLevel = "ok" | "warn" | "crit";

export type MetricSample = {
  at: string;
  cpuPercent: number;
  ramPercent: number;
};

export type StreamQuality = "Alta" | "Media" | "Baja";

export type LiveTransmissionRow = {
  eventId: string;
  title: string;
  creatorUsername: string;
  obsConnected: boolean;
  mtxReady: boolean;
  streamPath: string | null;
  viewers: number;
  avgLatencySec: number | null;
  latencyLevel: ThresholdLevel | null;
  quality: StreamQuality;
  resolutionLabel: string;
  bitrateKbps: number | null;
  tracks: string[];
};

export type AdminLiveMetrics = {
  collectedAt: string;
  cpu: {
    percent: number;
    level: ThresholdLevel;
  };
  ram: {
    machinePercent: number;
    machineUsedBytes: number;
    machineTotalBytes: number;
    level: ThresholdLevel;
    processRssBytes: number;
    processHeapUsedBytes: number;
  };
  history: MetricSample[];
  avgLatencySec: number | null;
  latencyLevel: ThresholdLevel | null;
  latencyHistory: { at: string; avgLatencySec: number | null }[];
  transmissions: LiveTransmissionRow[];
};

type CpuSnapshot = { cpu: NodeJS.CpuUsage; at: number };
type BitrateSnapshot = { bytes: number; at: number };

let lastCpu: CpuSnapshot | null = null;
const metricHistory: MetricSample[] = [];
const latencyHistory: { at: string; avgLatencySec: number | null }[] = [];
const bitrateSamples = new Map<string, BitrateSnapshot>();

export function thresholdCpu(percent: number): ThresholdLevel {
  if (percent >= 85) return "crit";
  if (percent >= 70) return "warn";
  return "ok";
}

export function thresholdRam(percent: number): ThresholdLevel {
  if (percent >= 85) return "crit";
  if (percent >= 70) return "warn";
  return "ok";
}

export function thresholdLatency(sec: number | null): ThresholdLevel | null {
  if (sec == null || !Number.isFinite(sec)) return null;
  if (sec > 15) return "crit";
  if (sec >= 8) return "warn";
  return "ok";
}

function pushHistory<T>(arr: T[], item: T, max = HISTORY_MAX) {
  arr.push(item);
  while (arr.length > max) arr.shift();
}

function sampleCpuPercent(): number {
  const now = process.hrtime.bigint();
  const usage = process.cpuUsage();
  const nowMs = Date.now();

  if (!lastCpu) {
    lastCpu = { cpu: usage, at: nowMs };
    // Segunda muestra inmediata para no devolver 0 en el primer poll.
    const later = process.cpuUsage(usage);
    const elapsedUs = Number(process.hrtime.bigint() - now) / 1000;
    const totalUs = later.user + later.system;
    if (elapsedUs <= 0) return 0;
    return Math.min(100, Math.max(0, (totalUs / elapsedUs) * 100));
  }

  const elapsedMs = Math.max(1, nowMs - lastCpu.at);
  const diff = process.cpuUsage(lastCpu.cpu);
  lastCpu = { cpu: usage, at: nowMs };
  const elapsedUs = elapsedMs * 1000;
  const totalUs = diff.user + diff.system;
  return Math.min(100, Math.max(0, (totalUs / elapsedUs) * 100));
}

function sampleBitrateKbps(pathName: string, bytesReceived: number | undefined): number | null {
  if (typeof bytesReceived !== "number" || !Number.isFinite(bytesReceived)) return null;
  const now = Date.now();
  const prev = bitrateSamples.get(pathName);
  bitrateSamples.set(pathName, { bytes: bytesReceived, at: now });
  if (!prev || now <= prev.at) return null;
  const deltaBytes = bytesReceived - prev.bytes;
  if (deltaBytes < 0) return null;
  const elapsedSec = (now - prev.at) / 1000;
  if (elapsedSec <= 0) return null;
  return (deltaBytes * 8) / 1000 / elapsedSec;
}

function classifyQuality(opts: {
  ready: boolean;
  height: number | null;
  bitrateKbps: number | null;
  tracks: string[];
}): StreamQuality {
  if (!opts.ready || opts.tracks.length === 0) return "Baja";
  const br = opts.bitrateKbps;
  if (br != null && br < 400) return "Baja";
  const highRes = opts.height != null ? opts.height >= 720 : /H264|AVC|H265|HEVC/i.test(opts.tracks.join(" "));
  if (highRes && (br == null || br >= 800)) return "Alta";
  if (br != null && br < 800) return "Media";
  return "Media";
}

function resolutionLabel(height: number | null, tracks: string[]): string {
  if (height) return `${height}p`;
  if (tracks.length) return tracks.join(", ");
  return "Desconocida";
}

export async function collectAdminLiveMetrics(): Promise<AdminLiveMetrics> {
  const cpuPercent = sampleCpuPercent();
  const total = os.totalmem();
  const free = os.freemem();
  const used = Math.max(0, total - free);
  const ramPercent = total > 0 ? (used / total) * 100 : 0;
  const mem = process.memoryUsage();
  const at = new Date().toISOString();

  pushHistory(metricHistory, {
    at,
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    ramPercent: Math.round(ramPercent * 10) / 10,
  });

  const paths = await listPaths();
  const pathByName = new Map<string, PathListItem>(paths.map((p) => [p.name, p]));

  const liveEvents = await db.event.findMany({
    where: { status: "LIVE" },
    select: {
      id: true,
      title: true,
      obsConnected: true,
      streamPath: true,
      creator: { select: { username: true } },
    },
    orderBy: { actualStartTime: "desc" },
  });

  const cutoff = new Date(Date.now() - PRESENCE_TTL_MS);
  const roomKeys = liveEvents.map((e) => `event:${e.id}`);

  const presenceRows =
    roomKeys.length === 0
      ? []
      : await db.streamPresence.findMany({
          where: {
            roomKey: { in: roomKeys },
            lastSeenAt: { gte: cutoff },
          },
          select: { roomKey: true, latencySec: true },
        });

  const byRoom = new Map<string, { count: number; latencies: number[] }>();
  for (const row of presenceRows) {
    const bucket = byRoom.get(row.roomKey) ?? { count: 0, latencies: [] };
    bucket.count += 1;
    if (typeof row.latencySec === "number" && Number.isFinite(row.latencySec)) {
      bucket.latencies.push(row.latencySec);
    }
    byRoom.set(row.roomKey, bucket);
  }

  const transmissions: LiveTransmissionRow[] = liveEvents.map((event) => {
    const roomKey = `event:${event.id}`;
    const presence = byRoom.get(roomKey) ?? { count: 0, latencies: [] };
    const avgLatency =
      presence.latencies.length > 0
        ? presence.latencies.reduce((a, b) => a + b, 0) / presence.latencies.length
        : null;
    const path = event.streamPath ? pathByName.get(event.streamPath) : undefined;
    const tracks = path?.tracks ?? [];
    const height = parseResolutionHeight(tracks);
    const bitrateKbps = event.streamPath
      ? sampleBitrateKbps(event.streamPath, path?.bytesReceived)
      : null;
    const mtxReady = Boolean(path?.ready);
    const quality = classifyQuality({
      ready: mtxReady,
      height,
      bitrateKbps,
      tracks,
    });

    return {
      eventId: event.id,
      title: event.title,
      creatorUsername: event.creator.username,
      obsConnected: event.obsConnected,
      mtxReady,
      streamPath: event.streamPath,
      viewers: presence.count,
      avgLatencySec: avgLatency != null ? Math.round(avgLatency * 10) / 10 : null,
      latencyLevel: thresholdLatency(avgLatency),
      quality,
      resolutionLabel: resolutionLabel(height, tracks),
      bitrateKbps: bitrateKbps != null ? Math.round(bitrateKbps) : null,
      tracks,
    };
  });

  const allLatencies = transmissions
    .map((t) => t.avgLatencySec)
    .filter((v): v is number => typeof v === "number");
  const avgLatencySec =
    allLatencies.length > 0
      ? Math.round((allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length) * 10) / 10
      : null;

  pushHistory(latencyHistory, { at, avgLatencySec });

  return {
    collectedAt: at,
    cpu: {
      percent: Math.round(cpuPercent * 10) / 10,
      level: thresholdCpu(cpuPercent),
    },
    ram: {
      machinePercent: Math.round(ramPercent * 10) / 10,
      machineUsedBytes: used,
      machineTotalBytes: total,
      level: thresholdRam(ramPercent),
      processRssBytes: mem.rss,
      processHeapUsedBytes: mem.heapUsed,
    },
    history: [...metricHistory],
    avgLatencySec,
    latencyLevel: thresholdLatency(avgLatencySec),
    latencyHistory: [...latencyHistory],
    transmissions,
  };
}
