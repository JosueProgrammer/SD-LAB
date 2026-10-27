import { randomBytes } from "crypto";

export function rtmpPublicUrl() {
  return (process.env.RTMP_PUBLIC_URL || "rtmp://127.0.0.1:1935").replace(/\/$/, "");
}

export function hlsPublicUrl() {
  return (
    process.env.HLS_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_HLS_BASE_URL ||
    "http://127.0.0.1:8888"
  ).replace(/\/$/, "");
}

export function mediamtxApiUrl() {
  return (process.env.MEDIAMTX_API_URL || "http://127.0.0.1:9997").replace(/\/$/, "");
}

export function recordingsDir() {
  return process.env.MEDIAMTX_RECORDINGS_DIR || "./recordings";
}

/** URL HLS vía proxy same-origin (evita negro por CORS / Private Network Access). */
export function playbackUrlForPath(streamPath: string) {
  return `/api/hls/${streamPath}/index.m3u8`;
}

export function createStreamCredentials(prefix: "evt" | "usr") {
  const streamPath = `${prefix}_${randomBytes(12).toString("hex")}`;
  return {
    streamPath,
    streamKey: streamPath,
    serverUrl: rtmpPublicUrl(),
    playbackUrl: playbackUrlForPath(streamPath),
  };
}

export type PathListItem = {
  name: string;
  ready: boolean;
  readyTime?: string;
  tracks?: string[];
};

export async function listPaths(): Promise<PathListItem[]> {
  try {
    const res = await fetch(`${mediamtxApiUrl()}/v3/paths/list`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: PathListItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function getPath(pathName: string): Promise<PathListItem | null> {
  try {
    const res = await fetch(`${mediamtxApiUrl()}/v3/paths/get/${encodeURIComponent(pathName)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as PathListItem;
  } catch {
    return null;
  }
}

export async function isPathPublishing(pathName: string): Promise<boolean> {
  const path = await getPath(pathName);
  if (path) return Boolean(path.ready);
  const items = await listPaths();
  return items.some((item) => item.name === pathName && item.ready);
}
