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
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
      </main>
    );
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="min-h-screen text-slate-800">
      {/* Glass header */}
      <header className="glass-nav sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-800">
            DesignedPrice<span className="text-violet-400">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">
                {user?.displayName || user?.email || "Your account"}
              </p>
              {user?.displayName && (
                <p className="text-xs text-slate-500">{user.email}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-2 text-sm font-medium hover:bg-white/60 transition"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mb-8 animate-fade-up">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-500/80">
            Your clothing intelligence workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-900">
            Identify it. Value it. Wear it.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Discover brands, garment details, estimated market values, and
            comparable listings for vintage, streetwear, and designer pieces.
          </p>
        </section>

        {/* Glass tabs */}
        <nav className="mb-8 flex gap-2 glass rounded-2xl p-1.5 w-fit animate-fade-up-delay-1">
          <button
            type="button"
            onClick={() => setTab("scan")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "scan"
                ? "bg-white/80 text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ScanLine className="h-4 w-4" />
            Scan garment
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === "history"
                ? "bg-white/80 text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock3 className="h-4 w-4" />
            Scan history
          </button>
        </nav>

        <div className="animate-fade-up-delay-2">
          {tab === "scan" ? <UploadForm /> : <HistoryPanel />}
        </div>

        <footer className="mt-16 border-t border-white/40 pt-6 text-center text-xs text-slate-500">
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
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      {/* Floating glass card */}
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 glass-panel rounded-[2rem] overflow-hidden shadow-2xl animate-fade-up">
        {/* Left marketing panel */}
        <section className="relative flex flex-col justify-between px-8 py-10 sm:px-12 lg:py-14 text-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400/20 via-fuchsia-300/10 to-sky-300/20 pointer-events-none" />
          <Link href="/" className="relative text-xl font-bold tracking-tight">
            DesignedPrice<span className="text-violet-500">.</span>
          </Link>

          <div className="relative my-10 lg:my-0 max-w-md">
            <div className="mb-6 inline-flex rounded-2xl glass p-4">
              <ScanLine className="h-8 w-8 text-violet-500" />
            </div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-violet-500/80">
              Know what you own
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              Every piece has a story.
              <br />
              Find its value.
            </h1>
            <p className="mt-5 leading-7 text-slate-600">
              Identify vintage clothing, explore streetwear brands, estimate
              market prices, and keep your discoveries in one place.
            </p>

            <div className="mt-8 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-violet-400" />
                Personal scan history
              </div>
              <div className="flex items-center gap-3">
                <ScanLine className="h-5 w-5 text-violet-400" />
                AI-assisted garment analysis
              </div>
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-violet-400" />
                Revisit your previous valuations
              </div>
            </div>
          </div>

          <p className="relative text-xs text-slate-500">
            Estimates are indicative, not guaranteed sale prices.
          </p>
        </section>

        {/* Right auth form */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 bg-white/30 backdrop-blur-sm">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-medium text-slate-500">
                Welcome to DesignedPrice
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {mode === "login"
                  ? "Sign in to analyze garments and access your scan history."
                  : "Create an account to save and revisit your garment scans."}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl glass p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-white/90 text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "register"
                    ? "bg-white/90 text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium">
                    Display name <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-2xl glass-input px-4 py-3"
                    placeholder="Your name"
                    disabled={busy}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl glass-input px-4 py-3"
                  placeholder="you@example.com"
                  disabled={busy}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={mode === "register" ? 10 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl glass-input px-4 py-3"
                  placeholder={
                    mode === "register" ? "At least 10 characters" : "Your password"
                  }
                  disabled={busy}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200/60 bg-red-50/70 px-4 py-3 text-sm text-red-700 backdrop-blur-sm"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="glass-btn flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold"
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

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
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
    // Intentional: load history once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:underline"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your scan history</h2>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-sm font-medium hover:bg-white/60 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {scans.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <ScanLine className="mx-auto h-10 w-10 text-violet-300" />
          <h3 className="mt-4 font-semibold">No scans yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Your completed analyses will appear here after your first scan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <article
              key={scan.id}
              className="flex gap-4 rounded-2xl glass p-4 sm:p-5 hover:bg-white/55 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scan.imageUrl}
                alt="Scanned garment"
                className="h-24 w-24 shrink-0 rounded-xl bg-white/40 object-cover sm:h-28 sm:w-28"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">
                    {scan.identification.brand || "Unknown brand"}
                  </h3>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs text-slate-600">
                    {scan.status.replaceAll("_", " ").toLowerCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {scan.identification.garmentType || "Garment type unavailable"}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(scan.createdAt).toLocaleString()}
                </p>
                {scan.valuation && (
                  <p className="mt-2 text-sm font-semibold text-slate-900">
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

      <p className="mt-5 text-xs text-slate-500">
        The API currently returns up to 50 of your most recent scans.
      </p>
    </section>
  );
}
