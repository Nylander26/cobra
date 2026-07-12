import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Central, SaaS-owned bucket. Objects are private; downloads go through
// short-lived presigned URLs. Keys are namespaced per user so one freelancer's
// PDFs are isolated: u/{userId}/invoices/{invoiceId}.pdf

let cached: { client: S3Client; bucket: string } | undefined;

function s3() {
  if (cached) return cached;

  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 no configurado: define S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY en .env.local",
    );
  }

  // Optional endpoint for S3-compatible providers (R2, MinIO). Empty = AWS S3.
  const endpoint = process.env.S3_ENDPOINT || undefined;

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });

  cached = { client, bucket };
  return cached;
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

export function invoicePdfKey(userId: string, invoiceId: string): string {
  return `u/${userId}/invoices/${invoiceId}.pdf`;
}

export async function uploadPdf(
  key: string,
  body: Uint8Array,
  contentType = "application/pdf",
): Promise<void> {
  const { client, bucket } = s3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { client, bucket } = s3();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

export async function deletePdf(key: string): Promise<void> {
  const { client, bucket } = s3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
