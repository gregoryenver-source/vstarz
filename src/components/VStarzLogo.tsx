import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The VStarz™ emblem — a bold red "V" with gradient and glow,
 * rendered from the brand mark in the design reference.
 */
export function VStarzLogo({
  className,
  glow = true,
}: {
  className?: string;
  glow?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `vstarz-grad-${uid}`;
  const blurId = `vstarz-blur-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="VStarz"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF2A33" />
          <stop offset="50%" stopColor="#D50000" />
          <stop offset="100%" stopColor="#6B0000" />
        </linearGradient>
        {glow && (
          <filter id={blurId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M12 14 L36 14 L50 60 L64 14 L88 14 L62 86 L38 86 Z"
        fill={`url(#${gradId})`}
        filter={glow ? `url(#${blurId})` : undefined}
      />
    </svg>
  );
}
