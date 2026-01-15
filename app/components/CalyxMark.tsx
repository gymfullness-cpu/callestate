import * as React from "react";

type CalyxMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Calyx mini mark:
 * - readable at 20—24px
 * - references logo (leaf calyx + AI nodes)
 * - currentColor so Tailwind text-* works
 */
export function CalyxMark({ className, title = "Calyx" }: CalyxMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* Leaves / calyx */}
      <path
        d="M12 19.6c-1.55-1.45-3.35-4.05-3.35-7.05 0-2.2 1.05-4.05 3.35-5.9 2.3 1.85 3.35 3.7 3.35 5.9 0 3-1.8 5.6-3.35 7.05Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.95"
      />

      <path
        d="M11.35 18.9c-2.75-.2-6.05-2.15-7.1-5.55 2.35-.95 5.05-.75 6.95.35"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      <path
        d="M12.65 18.9c2.75-.2 6.05-2.15 7.1-5.55-2.35-.95-5.05-.75-6.95.35"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* glow dot */}
      <circle cx="12" cy="12.7" r="1.35" fill="currentColor" opacity="0.95" />

      {/* AI nodes */}
      <path
        d="M12 10.8V4.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M8.3 10.9V7.3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M15.7 10.9V7.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />

      <circle cx="12" cy="4.6" r="1.1" fill="currentColor" opacity="0.9" />
      <circle cx="8.3" cy="7.0" r="0.9" fill="currentColor" opacity="0.75" />
      <circle cx="15.7" cy="7.3" r="0.9" fill="currentColor" opacity="0.75" />
    </svg>
  );
}
