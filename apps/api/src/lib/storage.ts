import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import { AppError } from "./errors";

const s3 = new S3Client({ region: env.S3_REGION });
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
};

export async function uploadScanImage(userId: string, mimeType: string, base64: string): Promise<string> {
  if (!env.S3_BUCKET || !env.S3_PUBLIC_BASE_URL) {
    throw new AppError(500, "STORAGE_NOT_CONFIGURED", "Image storage is not configured.");
  }
  const key = `scans/${userId}/${randomUUID()}.${EXT[mimeType] ?? "bin"}`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: Buffer.from(base64, "base64"),
      ContentType: mimeType,
    }));
  } catch {
    throw new AppError(502, "STORAGE_UPLOAD_FAILED", "Failed to store the image.");
  }
  return `${env.S3_PUBLIC_BASE_URL}/${key}`;
}
