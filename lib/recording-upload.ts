import { createHash, createHmac } from "crypto";

function supabaseConfig() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
  const secret = process.env.SUPABASE_S3_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const region = process.env.SUPABASE_S3_REGION?.trim() || "us-east-1";
  if (!projectUrl || !accessKey || !secret || !bucket) return null;

  const projectRef = projectUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i)?.[1];
  const endpoint =
    process.env.SUPABASE_S3_ENDPOINT?.replace(/\/$/, "") ||
    (projectRef
      ? `https://${projectRef}.storage.supabase.co/storage/v1/s3`
      : `${projectUrl}/storage/v1/s3`);

  return { projectUrl, accessKey, secret, bucket, region, endpoint };
}

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string) {
  return createHash("sha256").update(data).digest("hex");
}

/** Sube un MP4 a Supabase Storage vía API S3-compatible firmada (SigV4). */
export async function uploadMp4ToSupabase(objectPath: string, bytes: Uint8Array) {
  const cfg = supabaseConfig();
  if (!cfg) return null;

  const host = new URL(cfg.endpoint).host;
  const canonicalUri = `/${cfg.bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(Buffer.from(bytes));
  const contentType = "video/mp4";

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${cfg.secret}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`${cfg.endpoint}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
    body: Buffer.from(bytes),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[recording] Supabase S3 PUT failed", res.status, text);
    return null;
  }

  return `${cfg.projectUrl}/storage/v1/object/public/${cfg.bucket}/${objectPath}`;
}
