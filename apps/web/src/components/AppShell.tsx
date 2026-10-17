"use client";

import Link from "next/link";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  getScanHistory,
  hasSession,
  login,
  logout,
  register,
} from "@/lib/api";
import type { AuthUser, ScanResponse } from "@/lib/types";
import { UploadForm } from "@/components/UploadForm";

type Tab = "scan" | "history";
type AuthMode = "login" | "register";

export function AppShell() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<Tab>("scan");

  useEffect(() => {
    // Intentional: read browser-only session state after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthenticated(hasSession());
    setReady(true);

    const onExpired = () => {
      setAuthenticated(false);
      setUser(null);
      setTab("scan");
    };

    window.addEventListener("designedprice:session-expired", onExpired);
    return () => {
      window.removeEventListener("designedprice:session-expired", onExpired);
    };
  }, []);

  function handleAuthenticated(nextUser: AuthUser) {
    setUser(nextUser);
    setAuthenticated(true);
    setTab("scan");
  }

  function handleLogout() {
    logout();
    setUser(null);
    setAuthenticated(false);
    setTab("scan");
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </main>
    );
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            DesignedPrice<span className="text-zinc-400">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">
                {user?.displayName || user?.email || "Your account"}
              </p>
              {user?.displayName && (
                <p className="text-xs text-zinc-500">{user.email}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Your clothing intelligence workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Identify it. Value it. Wear it.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Discover brands, garment details, estimated market values, and
            comparable listings for vintage, streetwear, and designer pieces.
          </p>
        </section>

        <nav className="mb-8 flex gap-2 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setTab("scan")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
              tab === "scan"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <ScanLine className="h-4 w-4" />
            Scan garment
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${
              tab === "history"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Clock3 className="h-4 w-4" />
            Scan history
          </button>
        </nav>

        {tab === "scan" ? (
          <UploadForm />
        ) : (
          <HistoryPanel />
        )}

        <footer className="mt-16 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500">
          DesignedPrice · AI-assisted garment identification and market estimates
        </footer>
      </div>
    </main>
  );
}

function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const result =
        mode === "register"
          ? await register({
              displayName: displayName.trim() || undefined,
              email: email.trim(),
              password,
            })
          : await login({
              email: email.trim(),
              password,
            });

      onAuthenticated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex flex-col justify-between bg-zinc-950 px-6 py-8 text-white sm:px-12 lg:px-16 lg:py-12">
          <Link href="/" className="text-xl font-bold tracking-tight">
            DesignedPrice<span className="text-zinc-500">.</span>
          </Link>

          <div className="mx-auto my-12 max-w-lg lg:my-0">
            <div className="mb-6 inline-flex rounded-2xl border border-white/15 bg-white/5 p-4">
              <ScanLine className="h-8 w-8" />
            </div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Know what you own
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Every piece has a story. Find its value.
            </h1>
            <p className="mt-5 max-w-md leading-7 text-zinc-400">
              Identify vintage clothing, explore streetwear brands, estimate
              market prices, and keep your discoveries in one place.
            </p>

            <div className="mt-8 space-y-4 text-sm text-zinc-300">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-zinc-400" />
                Personal scan history
              </div>
              <div className="flex items-center gap-3">
                <ScanLine className="h-5 w-5 text-zinc-400" />
                AI-assisted garment analysis
              </div>
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-zinc-400" />
                Revisit your previous valuations
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Estimates are indicative, not guaranteed sale prices.
          </p>
        </section>

        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-medium text-zinc-500">
                Welcome to DesignedPrice
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {mode === "login"
                  ? "Sign in to analyze garments and access your scan history."
                  : "Create an account to save and revisit your garment scans."}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${
                  mode === "login"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${
                  mode === "register"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label
                    htmlFor="displayName"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Display name <span className="text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={80}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    placeholder="Your name"
                    disabled={busy}
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  placeholder="you@example.com"
                  disabled={busy}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  minLength={mode === "register" ? 10 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  placeholder={
                    mode === "register"
                      ? "At least 10 characters"
                      : "Your password"
                  }
                  disabled={busy}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "login" ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
                {!busy && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
              By continuing, you agree to use market valuations as estimates.
              Keep your password private.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function HistoryPanel() {
  const [scans, setScans] = useState<ScanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setScans(await getScanHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Intentional: load the user-specific history when this panel mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Your scan history</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your latest saved garment analyses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-12 text-sm text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your scans…
        </div>
      ) : !error && scans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <ScanLine className="mx-auto h-8 w-8 text-zinc-400" />
          <h3 className="mt-4 font-semibold">No scans yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Your completed analyses will appear here after your first scan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <article
              key={scan.id}
              className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scan.imageUrl}
                alt="Scanned garment"
                className="h-24 w-24 shrink-0 rounded-xl bg-zinc-100 object-cover sm:h-28 sm:w-28"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">
                    {scan.identification.brand || "Unknown brand"}
                  </h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {scan.status.replaceAll("_", " ").toLowerCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {scan.identification.garmentType || "Garment type unavailable"}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {new Date(scan.createdAt).toLocaleString()}
                </p>
                {scan.valuation && (
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: scan.valuation.currency,
                      maximumFractionDigits: 0,
                    }).format(scan.valuation.estimatedLowPrice)}
                    {" – "}
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: scan.valuation.currency,
                      maximumFractionDigits: 0,
                    }).format(scan.valuation.estimatedHighPrice)}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-5 text-xs text-zinc-500">
        The API currently returns up to 50 of your most recent scans.
      </p>
    </section>
  );
}
