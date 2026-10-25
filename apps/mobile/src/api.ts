import AsyncStorage from "@react-native-async-storage/async-storage";

// Set EXPO_PUBLIC_API_URL (e.g. in apps/mobile/.env). The LAN fallback is for local dev builds only.
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? "http://192.168.100.4:4000" : undefined);

/** Thrown when there is no token or the server rejects it; the UI should send the user to log in. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Your session expired. Please log in again.");
    this.name = "SessionExpiredError";
  }
}

async function send(path: string, init: RequestInit) {
  if (!API_URL) {
    throw new Error(
      "API URL is not configured. Set EXPO_PUBLIC_API_URL to your deployed HTTPS API URL.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error("Cannot reach the server. Check your connection.");
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, json };
}

async function authedSend(path: string, init: RequestInit, fallbackMessage: string) {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new SessionExpiredError();

  const result = await send(path, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
  });

  if (result.status === 401) {
    await logout();
    throw new SessionExpiredError();
  }
  if (!result.ok) throw new Error(result.json?.error?.message ?? fallbackMessage);
  return result.json;
}

async function authenticate(action: "register" | "login", body: Record<string, unknown>) {
  const { ok, json } = await send(`/api/v1/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!ok) throw new Error(json?.error?.message ?? (action === "login" ? "Login failed" : "Register failed"));
  await AsyncStorage.multiSet([
    ["token", json.data.token],
    ["user", JSON.stringify(json.data.user)],
  ]);
  return json.data;
}

export function register(email: string, password: string, displayName?: string) {
  return authenticate("register", { email, password, displayName });
}

export function login(email: string, password: string) {
  return authenticate("login", { email, password });
}

export async function logout() {
  await AsyncStorage.multiRemove(["token", "user"]);
}

export async function isLoggedIn() {
  return !!(await AsyncStorage.getItem("token"));
}

export async function analyzeBase64(imageBase64: string, mimeType: string) {
  const json = await authedSend(
    "/api/v1/scans/analyze",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType }),
    },
    "Analysis failed",
  );
  return json.data;
}

export async function listScans() {
  const json = await authedSend("/api/v1/scans", { method: "GET" }, "Failed to load history");
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
      currency?: string;
      confidenceScore: number;
      suggestedEra: string;
    };
  }>;
}
