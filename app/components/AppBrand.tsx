import * as React from "react";
import { CalyxMark } from "./CalyxMark";

type AppBrandProps = {
  className?: string;
  badgeText?: string; // np. "Navy Mint"
};

export function AppBrand({
  className,
  badgeText = "Navy Mint",
}: AppBrandProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      {/* Icon container (subtle like your UI) */}
      <span
        className={[
          "inline-flex items-center justify-center",
          "h-9 w-9 rounded-lg",
          "bg-white/5 ring-1 ring-white/10",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_10px_30px_rgba(0,0,0,0.35)]",
        ].join(" ")}
      >
        <CalyxMark className="h-5 w-5 text-teal-300" />
      </span>

      {/* Text */}
      <div className="flex items-center gap-3">
        <div className="leading-none">
          <div className="text-[15px] font-semibold uppercase tracking-[0.28em] text-white">
            CALYX
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.34em] text-white/60">
            AI
          </div>
        </div>

        {/* Badge */}
        <span className="hidden sm:inline-flex items-center rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-[12px] font-extrabold text-[rgba(234,255,251,0.92)]">
          {badgeText}
        </span>
      </div>
    </div>
  );
}
