import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.100.4:4000";

async function getToken() {
  return (await AsyncStorage.getItem("token")) ?? "";
}

export async function register(email: string, password: string, displayName?: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Register failed");
  await AsyncStorage.setItem("token", json.data.token);
  await AsyncStorage.setItem("user", JSON.stringify(json.data.user));
  return json.data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Login failed");
  await AsyncStorage.setItem("token", json.data.token);
  await AsyncStorage.setItem("user", JSON.stringify(json.data.user));
  return json.data;
}

export async function logout() {
  await AsyncStorage.multiRemove(["token", "user"]);
}

export async function analyzeBase64(imageBase64: string, mimeType: string) {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/scans/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Analysis failed");
  return json.data;
}

export async function listScans() {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/v1/scans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load history");
  return json.data as Array<{
    id: string;
    imageUrl: string;
    brand: string | null;
    garmentType: string | null;
    createdAt: string;
    valuation: null | {
      estimatedLowPrice: number;
      estimatedHighPrice: number;
      medianPrice: number;
      confidenceScore: number;
      suggestedEra: string;
    };
  }>;
}

export async function isLoggedIn() {
  return !!(await getToken());
}
