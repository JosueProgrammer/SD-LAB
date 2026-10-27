import { readFileSync } from "fs";
import {
  S3Client,
  ListBucketsCommand,
  HeadBucketCommand,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";

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

const bucket = process.env.SUPABASE_STORAGE_BUCKET;
const client = new S3Client({
  forcePathStyle: true,
  region: process.env.SUPABASE_S3_REGION,
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY,
  },
});

const listed = await client.send(new ListBucketsCommand({}));
console.log(
  "buckets",
  (listed.Buckets || []).map((b) => b.Name)
);
console.log("configured_bucket", bucket);

await client.send(new HeadBucketCommand({ Bucket: bucket }));
console.log("head_ok");

const key = `recordings/obs-probe-${Date.now()}.mp4`;
const created = await client.send(
  new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "video/mp4",
  })
);
await client.send(
  new AbortMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: created.UploadId,
  })
);
console.log("multipart_ok");

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: `recordings/_probe-${Date.now()}.txt`,
    Body: "probe",
    ContentType: "text/plain",
  })
);
console.log("put_ok");
