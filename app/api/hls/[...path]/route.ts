import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hlsUpstreamBase() {
  return (
    process.env.HLS_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_HLS_BASE_URL ||
    "http://127.0.0.1:8888"
  ).replace(/\/$/, "");
}

function rewritePlaylist(body: string, dirProxyPath: string) {
  const rewriteUri = (uri: string) => {
    const clean = uri.trim().replace(/^"|"$/g, "");
    if (!clean || /^https?:\/\//i.test(clean) || clean.startsWith("/api/hls/")) {
      return uri;
    }
    return `${dirProxyPath}/${clean}`;
  };

  return body
    .split("\n")
    .map((line) => {
      if (line.includes("URI=\"")) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => `URI="${rewriteUri(uri)}"`);
      }
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      return rewriteUri(trimmed);
    })
    .join("\n");
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const joined = pathParts.map(encodeURIComponent).join("/");
  const target = `${hlsUpstreamBase()}/${joined}${req.nextUrl.search}`;
  const upstream = await fetch(target, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: req.headers.get("accept") || "*/*" },
  });

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type") || "";
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  const isPlaylist =
    contentType.includes("mpegurl") ||
    contentType.includes("m3u8") ||
    target.endsWith(".m3u8");

  if (isPlaylist) {
    const body = await upstream.text();
    const dirProxyPath = `/api/hls/${pathParts
      .slice(0, -1)
      .map(encodeURIComponent)
      .join("/")}`;
    return new Response(rewritePlaylist(body, dirProxyPath), {
      status: upstream.status,
      headers,
    });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, { status: upstream.status, headers });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  if (!path?.length) return new Response("Missing path", { status: 400 });
  try {
    return await proxy(req, path);
  } catch (error) {
    console.error("[hls-proxy]", error);
    return new Response("HLS upstream unavailable", { status: 502 });
  }
}
