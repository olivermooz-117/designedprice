import type { ScanResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN = process.env.NEXT_PUBLIC_JWT_TOKEN ?? "";

async function post(body: object): Promise<ScanResponse> {
  const res = await fetch(`${API_URL}/api/v1/scans/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as ScanResponse;
}

export function analyzeImage(imageUrl: string) {
  return post({ imageUrl });
}

export function analyzeBase64(imageBase64: string, mimeType: string) {
  return post({ imageBase64, mimeType });
}
