"use client";

import type { ScanResponse } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ExternalLink, Sparkles, TrendingUp, Info, AlertTriangle } from "lucide-react";

export function ResultsCard({ data }: { data: ScanResponse }) {
  const { identification, valuation } = data;
  const conf = valuation ? Math.round(valuation.confidenceScore * 100) : 0;
  const isNoComparables = data.status === "NO_COMPARABLES";

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Hero image + ID */}
      <div className="rounded-3xl glass overflow-hidden">
        <div className="aspect-[4/3] bg-white/20 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt="Scanned garment"
            className="w-full h-full object-contain"
          />
          {valuation && (
            <div className="absolute top-3 right-3">
              <ConfidenceBadge score={conf} />
            </div>
          )}
        </div>
        <div className="p-5">
          <p className="text-[11px] font-medium text-violet-500/80 uppercase tracking-widest mb-1">
            Identification
          </p>
          <h2 className="text-xl font-semibold text-slate-900 leading-snug">
            {identification.brand ?? "Unknown Brand"}
            <span className="text-slate-400 font-normal"> · </span>
            {identification.garmentType}
          </h2>
          {valuation && (
            <p className="mt-1.5 text-sm text-slate-500 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Estimated era:{" "}
              <span className="font-medium text-slate-700">{valuation.suggestedEra}</span>
            </p>
          )}
        </div>
      </div>

      {/* Price block */}
      {valuation ? (
        <div className="rounded-3xl glass p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-violet-500/80 uppercase tracking-widest mb-2">
                Market Valuation
              </p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {formatPrice(valuation.estimatedLowPrice)} – {formatPrice(valuation.estimatedHighPrice)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Median listed:{" "}
                <span className="font-semibold text-slate-700">
                  {formatPrice(valuation.medianPrice)}
                </span>
              </p>
              {/* Confidence explanation */}
              <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-violet-400" aria-hidden="true" />
                <p>
                  <span className="font-medium">Confidence: {conf}%</span> — Based on {valuation.comparables.length} comparable listing{valuation.comparables.length !== 1 ? "s" : ""} and AI identification certainty. Estimates are indicative, not guaranteed sale prices.
                </p>
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-400/20 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-amber-200/60 bg-amber-50/50 px-5 py-4 text-amber-800 text-sm backdrop-blur-sm flex items-start gap-3" role="status">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium">No comparable listings found</p>
            <p className="mt-1">
              {isNoComparables
                ? "The garment was identified, but there aren't enough recent listings to estimate a price range."
                : "Analysis couldn't identify the garment well enough to search for comparables."}
            </p>
            <p className="mt-2 text-xs">
              Try a clearer photo of the brand tag, care label, or distinctive graphic. Ensure good lighting and the tag is readable.
            </p>
          </div>
        </div>
      )}

      {/* Comparables */}
      {valuation && valuation.comparables.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium text-violet-500/80 uppercase tracking-widest mb-3">
            Recent Comparables ({valuation.comparables.length})
          </h3>
          <div className="grid gap-2.5">
            {valuation.comparables.map((c) => (
              <a
                key={c.id}
                href={c.itemUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3.5 p-3 rounded-2xl glass hover:bg-white/60 transition group"
              >
                {c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail}
                    alt=""
                    className="w-14 h-14 object-cover rounded-xl bg-white/40 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/40 shrink-0" />
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:underline leading-snug">
                    {c.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      {formatPrice(c.price)}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 uppercase tracking-wide">
                      {c.platform}
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-500/90 text-white"
      : score >= 40
      ? "bg-amber-400/90 text-slate-900"
      : "bg-slate-400/90 text-white";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm ${color}`}>
      {score}% confidence
    </span>
  );
}
