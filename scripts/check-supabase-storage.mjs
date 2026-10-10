import { readFileSync } from "fs";
import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";

function loadEnv(path = ".env") {
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
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

const endpoint = process.env.SUPABASE_S3_ENDPOINT;
const region = process.env.SUPABASE_S3_REGION;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "recordings";
const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");

if (!endpoint || !region || !process.env.SUPABASE_S3_ACCESS_KEY || !process.env.SUPABASE_S3_SECRET_KEY || !projectUrl) {
  console.error("missing_env");
  process.exit(1);
}

const client = new S3Client({
  forcePathStyle: true,
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY,
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log("bucket_ok", bucket);
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log("bucket_created", bucket);
}

const key = "recordings/_healthcheck.txt";
await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: "ok",
    ContentType: "text/plain",
  })
);

const pub = `${projectUrl}/storage/v1/object/public/${bucket}/${key}`;
const res = await fetch(pub);
console.log("public_status", res.status);
if (res.status !== 200) {
  console.log("hint", "Marca el bucket como público en Supabase Storage.");
  process.exit(2);
}
console.log("done");
