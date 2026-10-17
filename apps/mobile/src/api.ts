const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.100.4:4000";
const TOKEN = process.env.EXPO_PUBLIC_JWT_TOKEN ?? "";

export interface ScanResponse {
  id: string;
  status: string;
  imageUrl: string;
  identification: {
    brand: string | null;
    garmentType: string | null;
    searchQueryString: string | null;
  };
  valuation: null | {
    estimatedLowPrice: number;
    estimatedHighPrice: number;
    medianPrice: number;
    currency: string;
    confidenceScore: number;
    suggestedEra: string;
    comparables: Array<{
      id: string;
      platform: string;
      itemUrl: string;
      price: number;
      title: string;
      thumbnail: string | null;
    }>;
  };
}

export async function analyzeBase64(
  imageBase64: string,
  mimeType: string
): Promise<ScanResponse> {
  const res = await fetch(`${API_URL}/api/v1/scans/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Request failed");
  return json.data;
}
