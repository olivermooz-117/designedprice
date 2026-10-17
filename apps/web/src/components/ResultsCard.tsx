"use client";

import type { ScanResponse } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ExternalLink, Sparkles, TrendingUp } from "lucide-react";

export function ResultsCard({ data }: { data: ScanResponse }) {
  const { identification, valuation } = data;
  const conf = valuation ? Math.round(valuation.confidenceScore * 100) : 0;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Hero image + ID */}
      <div className="rounded-2xl border border-zinc-200 overflow-hidden bg-white shadow-sm">
        <div className="aspect-[4/3] bg-zinc-50 relative">
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
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-1">
            Identification
          </p>
          <h2 className="text-xl font-semibold text-zinc-900 leading-snug">
            {identification.brand ?? "Unknown Brand"}
            <span className="text-zinc-400 font-normal"> · </span>
            {identification.garmentType}
          </h2>
          {valuation && (
            <p className="mt-1.5 text-sm text-zinc-500 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Estimated era: <span className="font-medium text-zinc-700">{valuation.suggestedEra}</span>
            </p>
          )}
        </div>
      </div>

      {/* Price block */}
      {valuation ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-2">
                Market Valuation
              </p>
              <p className="text-3xl font-bold tracking-tight text-zinc-900">
                {formatPrice(valuation.estimatedLowPrice)} – {formatPrice(valuation.estimatedHighPrice)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Median sold: <span className="font-semibold text-zinc-700">{formatPrice(valuation.medianPrice)}</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-5 py-4 text-amber-800 text-sm">
          No recent sold comparables found. Try a clearer photo of the brand tag or a more distinctive piece.
        </div>
      )}

      {/* Comparables */}
      {valuation && valuation.comparables.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-3">
            Recent Sold Comparables ({valuation.comparables.length})
          </h3>
          <div className="grid gap-2.5">
            {valuation.comparables.map((c) => (
              <a
                key={c.id}
                href={c.itemUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3.5 p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition group"
              >
                {c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail}
                    alt=""
                    className="w-14 h-14 object-cover rounded-lg bg-zinc-100 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-zinc-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm font-medium text-zinc-900 line-clamp-2 group-hover:underline leading-snug">
                    {c.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-900">
                      {formatPrice(c.price)}
                    </span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1 uppercase tracking-wide">
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
      ? "bg-emerald-500 text-white"
      : score >= 40
      ? "bg-amber-400 text-zinc-900"
      : "bg-zinc-400 text-white";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow ${color}`}>
      {score}% confidence
    </span>
  );
}
