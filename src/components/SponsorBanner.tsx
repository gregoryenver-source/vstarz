import { motion } from "framer-motion";
import { Flame, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Brand Takeover — Ignition Group
 * Sits directly below the sticky header on every AppShell page.
 */
export function SponsorBanner() {
  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      aria-label="Sponsored by Ignition Group"
      className="relative mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-[oklch(42%_0.19_27.5)] via-[oklch(50%_0.22_27.5)] to-[oklch(18%_0.05_27.5)] shadow-glow-roc"
    >
      {/* Stage grid + haze decoration, matching the app's hero */}
      <div className="absolute inset-0 bg-stage-grid opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/40" />

      <div className="relative flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        {/* Official Ignition Group logo (self-hosted, white version) */}
        <a
          href="https://www.ignitiongroup.co.za/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center rounded-xl bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur transition-transform hover:scale-[1.03]"
          aria-label="Ignition Group — visit ignitiongroup.co.za"
        >
          <img
            src={`${import.meta.env.BASE_URL}ignition-logo-possibility.png`}
            alt="Ignition Group — Powered by possibility"
            className="h-10 w-auto sm:h-12"
            loading="lazy"
          />
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="badge-gold border-0 font-semibold uppercase tracking-wider">
              <Flame className="mr-1 size-3" />
              Brand Takeover
            </Badge>
            <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground/90">
              Proudly sponsored by
            </span>
          </div>

          <h2 className="mt-1.5 font-display text-xl font-bold leading-tight sm:text-2xl">
            <span className="text-gradient-roc">Ignite the Stage</span>
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Ignition Group is proud to power the next generation of African
            Starz.{" "}
            <span className="font-semibold text-foreground/80">
              Official sponsor of VStarz Season 1.
            </span>
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="shrink-0 gap-1.5 bg-foreground font-semibold text-background hover:bg-foreground/90"
        >
          <a
            href="https://www.ignitiongroup.co.za/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Ignition Group
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </div>
    </motion.section>
  );
}
