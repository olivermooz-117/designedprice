import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { AppError } from "./errors";

const s3 = new S3Client({ region: env.S3_REGION });
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function uploadScanImage(
  userId: string,
  mimeType: string,
  base64: string
): Promise<string> {
  const ext = EXT[mimeType] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;

  // Prefer S3 when configured
  if (env.S3_BUCKET && env.S3_PUBLIC_BASE_URL) {
    const key = `scans/${userId}/${filename}`;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: Buffer.from(base64, "base64"),
          ContentType: mimeType,
        })
      );
    } catch {
      throw new AppError(502, "STORAGE_UPLOAD_FAILED", "Failed to store the image.");
    }
    return `${env.S3_PUBLIC_BASE_URL}/${key}`;
  }

  // Local disk fallback (development). Most hosts wipe local disk on every deploy.
  if (env.NODE_ENV === "production") {
    console.warn("[storage] S3 is not configured: images are kept on local disk and will be lost on redeploy.");
  }
  const dir = path.join(process.cwd(), "uploads", userId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await writeFile(filePath, Buffer.from(base64, "base64"));

  // Served by Express static middleware
  const base = (env.PUBLIC_BASE_URL || `http://localhost:${env.PORT}`).replace(/\/+$/, "");
  return `${base}/uploads/${userId}/${filename}`;
}
