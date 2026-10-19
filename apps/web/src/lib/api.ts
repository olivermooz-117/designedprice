import type { AuthResponse, ScanResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "designedprice_session_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem(TOKEN_KEY) ??
    window.sessionStorage.getItem(TOKEN_KEY)
  );
}

function saveToken(token: string): void {
  if (typeof window === "undefined") {
    throw new Error("Authentication is only available in the browser.");
  }
  window.localStorage.setItem(TOKEN_KEY, token);
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export function logout(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function hasSession(): boolean {
  return getToken() !== null;
}

function isSessionDeadError(status: number, code?: string, message?: string): boolean {
  if (status !== 401) return false;
  const c = (code ?? "").toUpperCase();
  const m = (message ?? "").toLowerCase();
  if (c === "UNAUTHORIZED" || c === "INVALID_CREDENTIALS" || c === "TOKEN_EXPIRED") {
    return (
      !message ||
      m.includes("token") ||
      m.includes("expired") ||
      m.includes("malformed") ||
      m.includes("missing") ||
      m.includes("unauthorized") ||
      m.includes("invalid")
    );
  }
  return false;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = getToken();
    if (!token) {
      logout();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("designedprice:session-expired"));
      }
      throw new Error("Please log in to continue.");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the API. Is it running on http://localhost:4000?");
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const code = json?.error?.code as string | undefined;
    const message =
      (json?.error?.message as string | undefined) ??
      `Request failed (${response.status})`;

    if (authenticated && response.status === 401) {
      console.error("[designedprice] 401 on authenticated request", {
        path,
        status: response.status,
        code,
        message,
        hasToken: !!getToken(),
      });

      if (isSessionDeadError(response.status, code, message)) {
        console.error("[designedprice] Treating 401 as dead session — logging out", {
          code,
          message,
        });
        logout();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("designedprice:session-expired"));
        }
      }
    }

    throw new Error(message);
  }

  return json as T;
}

async function authenticate(
  action: "register" | "login",
  input: { email: string; password: string; displayName?: string },
): Promise<AuthResponse> {
  const result = await request<{ data: AuthResponse }>(`/api/v1/auth/${action}`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!result?.data?.token) {
    throw new Error("Login succeeded but no token was returned.");
  }
  saveToken(result.data.token);
  return result.data;
}

export function register(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  return authenticate("register", input);
}

export function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return authenticate("login", input);
}

export async function analyzeImage(imageUrl: string): Promise<ScanResponse> {
  const result = await request<{ data: ScanResponse }>(
    "/api/v1/scans/analyze",
    { method: "POST", body: JSON.stringify({ imageUrl }) },
    true,
  );
  return result.data;
}

export async function analyzeBase64(
  imageBase64: string,
  mimeType: string,
): Promise<ScanResponse> {
  const result = await request<{ data: ScanResponse }>(
    "/api/v1/scans/analyze",
    { method: "POST", body: JSON.stringify({ imageBase64, mimeType }) },
    true,
  );
  return result.data;
}

export async function getScanHistory(): Promise<ScanResponse[]> {
  const result = await request<{ data: ScanResponse[] }>(
    "/api/v1/scans/history",
    { method: "GET" },
    true,
  );
  return result.data;
}
