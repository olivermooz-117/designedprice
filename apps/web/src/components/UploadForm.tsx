"use client";

import { useCallback, useState } from "react";
import { Upload, Loader2, Link as LinkIcon, ImagePlus, X, Camera } from "lucide-react";
import { analyzeImage, analyzeBase64 } from "@/lib/api";
import type { ScanResponse } from "@/lib/types";
import { ResultsCard } from "./ResultsCard";

export function UploadForm() {
  const [mode, setMode] = useState<"url" | "file">("file");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setUrl("");
    setResult(null);
    setError(null);
  };

  const onFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, WebP).");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setError("Image must be under 8 MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setResult(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let data: ScanResponse;
      if (mode === "url") {
        if (!url.trim()) throw new Error("Paste an image URL first.");
        data = await analyzeImage(url.trim());
      } else {
        if (!file) throw new Error("Choose an image first.");
        const base64 = await fileToBase64(file);
        data = await analyzeBase64(base64, file.type);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-zinc-200 bg-white p-1 w-fit mx-auto">
        <button
          type="button"
          onClick={() => { setMode("file"); reset(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === "file" ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Upload photo
        </button>
        <button
          type="button"
          onClick={() => { setMode("url"); reset(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === "url" ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Paste URL
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "url" ? (
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black"
              disabled={loading}
            />
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            className={`relative rounded-2xl border-2 border-dashed transition ${
              dragOver
                ? "border-black bg-zinc-50"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            {preview ? (
              <div className="relative p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className="mx-auto max-h-64 rounded-xl object-contain"
                />
                <button
                  type="button"
                  onClick={reset}
                  className="absolute top-6 right-6 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 py-14 cursor-pointer">
                <div className="p-3 rounded-full bg-zinc-100">
                  <ImagePlus className="h-7 w-7 text-zinc-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-800">
                    Drop a photo here or click to browse
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">JPEG, PNG, WebP · max 8 MB</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                  }}
                />
              </label>
            )}
          </div>
        )}

        {mode === "file" && !preview && (
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 md:hidden">
            <Camera className="h-4 w-4" />
            Take a photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={loading || (mode === "url" ? !url.trim() : !file)}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-black text-white font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing with Gemini…
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Analyze Garment
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {result && <ResultsCard data={result} />}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip data:image/...;base64, prefix
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
