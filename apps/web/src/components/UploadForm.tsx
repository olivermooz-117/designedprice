"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Loader2, Link as LinkIcon, ImagePlus, X, Camera, AlertCircle } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setUrl("");
    setResult(null);
    setError(null);
    // Clear file inputs so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, [preview]);

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
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCameraInputClick = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Mode toggle */}
      <div className="flex rounded-2xl glass p-1.5 w-fit mx-auto" role="tablist" aria-label="Input method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "file"}
          onClick={() => { setMode("file"); reset(); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            mode === "file" ? "bg-white/90 text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Upload photo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "url"}
          onClick={() => { setMode("url"); reset(); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            mode === "url" ? "bg-white/90 text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Paste URL
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "url" ? (
          <div className="relative">
            <label htmlFor="image-url" className="sr-only">Image URL</label>
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
            <input
              id="image-url"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass-input"
              disabled={loading}
              aria-describedby="url-hint"
            />
            <p id="url-hint" className="sr-only">Enter a direct HTTPS link to an image hosted on an approved domain.</p>
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
            onClick={handleFileInputClick}
            className={`relative rounded-3xl border-2 border-dashed transition glass cursor-pointer ${
              dragOver
                ? "border-violet-400 bg-white/60"
                : "border-white/50 hover:border-violet-300/70"
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleFileInputClick(); }} }
            aria-label="Drop zone for garment image. Click or press Enter to select a file."
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Choose garment image file"
            />
            {preview ? (
              <div className="relative p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview of selected garment image"
                  className="mx-auto max-h-64 rounded-2xl object-contain"
                />
                <button
                  type="button"
                  onClick={reset}
                  className="absolute top-7 right-7 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  aria-label="Remove selected image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 py-16 cursor-pointer w-full">
                <div className="p-3.5 rounded-full bg-white/50" aria-hidden="true">
                  <ImagePlus className="h-7 w-7 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-800">
                    Drop a photo here or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP · max 8 MB</p>
                </div>
              </label>
            )}
          </div>
        )}

        {mode === "file" && !preview && (
          <label
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl glass py-3 text-sm font-medium text-slate-800 hover:bg-white/55 md:hidden"
            onClick={handleCameraInputClick}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Take a photo
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Take a photo with camera"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={loading || (mode === "url" ? !url.trim() : !file)}
          className="glass-btn w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-medium"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>Analyzing with Gemini…</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" aria-hidden="true" />
              <span>Analyze Garment</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div
          className="rounded-2xl border border-red-200/50 bg-red-50/60 text-red-700 px-4 py-3 text-sm backdrop-blur-sm flex items-center gap-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div aria-live="polite" aria-atomic="true">
          <ResultsCard data={result} />
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
