import { env } from "../config/env";
import { AppError } from "./errors";
import type { ImagePayload } from "../services/GeminiVisionService";
import { sniffImageMime } from "./sniffImage";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const allowedHosts = new Set(env.ALLOWED_IMAGE_HOSTS.split(",").map((h) => h.trim().toLowerCase()));

export async function loadImageFromUrl(rawUrl: string): Promise<ImagePayload> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError(400, "INVALID_IMAGE_URL", "imageUrl is not a valid URL.");
  }

  // SSRF guard: HTTPS + explicit host allowlist
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new AppError(400, "IMAGE_HOST_NOT_ALLOWED", "Image must be hosted on an approved storage domain.");
  }

  let res: Response;
  try {
    res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new AppError(422, "IMAGE_FETCH_FAILED", "Could not download the image.");
  }
  if (!res.ok || !res.body) {
    throw new AppError(422, "IMAGE_FETCH_FAILED", `Image host returned ${res.status}.`);
  }

  const mimeType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new AppError(415, "UNSUPPORTED_IMAGE_TYPE", `Unsupported type: ${mimeType}`);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > env.MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new AppError(413, "IMAGE_TOO_LARGE", "Image exceeds the maximum allowed size.");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  const sniffed = sniffImageMime(bytes);
  if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
    throw new AppError(415, "UNSUPPORTED_IMAGE_TYPE", "The downloaded file is not a supported image.");
  }
  return { mimeType: sniffed, base64: bytes.toString("base64") };
}

export function parseBase64Image(base64: string, claimedMimeType: string): ImagePayload {
  if (!ALLOWED_MIME.has(claimedMimeType)) {
    throw new AppError(415, "UNSUPPORTED_IMAGE_TYPE", `Unsupported type: ${claimedMimeType}`);
  }
  const clean = base64.replace(/^data:[^;]+;base64,/, "");
  if (Buffer.byteLength(clean, "base64") > env.MAX_IMAGE_BYTES) {
    throw new AppError(413, "IMAGE_TOO_LARGE", "Image exceeds the maximum allowed size.");
  }
  // Trust the bytes, not the client: Expo can label a camera photo image/heic while sending JPEG data.
  const mimeType = sniffImageMime(Buffer.from(clean, "base64"));
  if (!mimeType || !ALLOWED_MIME.has(mimeType)) {
    throw new AppError(415, "UNSUPPORTED_IMAGE_TYPE", "The data is not a supported image.");
  }
  return { mimeType, base64: clean };
}
