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
  base64: string,
): Promise<string> {
  const ext = EXT[mimeType] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;

  // S3 is required in production (validated at startup). In dev/test, use local disk if S3 not configured.
  const useS3 = Boolean(env.S3_BUCKET && env.S3_PUBLIC_BASE_URL);

  if (useS3) {
    const key = `scans/${userId}/${filename}`;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET!,
          Key: key,
          Body: Buffer.from(base64, "base64"),
          ContentType: mimeType,
        }),
      );
    } catch (err) {
      console.error("[storage] S3 upload failed", {
        userId,
        key,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new AppError(502, "STORAGE_UPLOAD_FAILED", "Failed to store the image.");
    }
    return `${env.S3_PUBLIC_BASE_URL}/${key}`;
  }

  // Local disk fallback (development/test only)
  const dir = path.join(process.cwd(), "uploads", userId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await writeFile(filePath, Buffer.from(base64, "base64"));

  const base = (env.PUBLIC_BASE_URL || `http://localhost:${env.PORT}`).replace(/\/+$/, "");
  return `${base}/uploads/${userId}/${filename}`;
}
