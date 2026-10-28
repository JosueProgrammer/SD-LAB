import { createHash, createHmac } from "crypto";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import https from "https";

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

async function hashFile(filePath: string) {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });
  return hash.digest("hex");
}

async function putMp4(objectPath: string, payloadHash: string, filePath: string, contentLength: number) {
  const cfg = supabaseConfig();
  if (!cfg) {
    throw new Error(
      "Configura Supabase Storage (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_S3_ACCESS_KEY, SUPABASE_S3_SECRET_KEY y SUPABASE_STORAGE_BUCKET)."
    );
  }

  const objectKey = objectPath.split("/").map(encodeURIComponent).join("/");
  const target = new URL(`${cfg.endpoint}/${cfg.bucket}/${objectKey}`);
  const host = target.host;
  const canonicalUri = target.pathname;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const contentType = "video/mp4";

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${cfg.secret}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const publicUrl = `${cfg.projectUrl}/storage/v1/object/public/${cfg.bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": contentLength ?? 0,
          "x-amz-content-sha256": payloadHash,
          "x-amz-date": amzDate,
          Authorization: authorization,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          const status = res.statusCode ?? 500;
          if (status >= 300) {
            const detail = Buffer.concat(chunks).toString("utf8");
            console.error("[recording] Supabase S3 PUT failed", status, detail);
            if (status === 413 || detail.includes("EntityTooLarge")) {
              reject(
                new Error(
                  "La grabación pesa más de lo que permite Supabase. En el proyecto abre Storage, sube el límite de tamaño del archivo y vuelve a guardarla."
                )
              );
              return;
            }
            reject(new Error("No se pudo guardar la grabación en Supabase Storage."));
            return;
          }
          resolve();
        });
      }
    );
    req.on("error", reject);
    if (!filePath) {
      req.end();
      return;
    }
    createReadStream(filePath).on("error", reject).pipe(req);
  });

  return publicUrl;
}

/** Sube el archivo completo. Una sola clave por evento, sin copias. */
export async function uploadMp4FileToSupabase(objectPath: string, filePath: string) {
  const info = await stat(filePath);
  if (info.size < 1024) {
    throw new Error("La grabación está vacía. Espera a que OBS termine de cerrar el archivo.");
  }
  const payloadHash = await hashFile(filePath);
  return putMp4(objectPath, payloadHash, filePath, info.size);
}
