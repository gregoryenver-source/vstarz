import { cn } from "@/lib/utils";

/**
 * The VStarz™ brand mark (official artwork).
 *
 * The artwork is a wide lockup (≈2.35:1), so unlike the old square "V"
 * it needs an aspect-ratio wrapper: give it a width via `className`
 * (e.g. `w-24`, `w-full`) or set a height — the image keeps its shape.
 * `glow` adds the signature red drop-shadow used on hero moments.
 */
export function VStarzLogo({
  className,
  glow = true,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}vstarz-mark.webp`}
      alt="VStarz"
      role="img"
      draggable={false}
      className={cn(
        "shrink-0 select-none object-contain",
        glow && "drop-shadow-[0_0_12px_rgba(255,42,51,0.45)]",
        className,
      )}
    />
  );
}
