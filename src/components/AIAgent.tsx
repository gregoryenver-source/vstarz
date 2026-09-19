import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  Video,
  Clock,
  GraduationCap,
  Users,
  Shield,
  Disc3,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const icons: Record<string, typeof Sparkles> = {
  video: Video,
  clock: Clock,
  sparkles: Sparkles,
  graduation: GraduationCap,
  users: Users,
  shield: Shield,
  disc: Disc3,
};

/** The AI Talent Agent — signal-driven coaching on the Passport. */
export function AIAgent() {
  const coach = useSafeQuery(api.ai.careerCoach, {});

  return (
    <section>
      <div className="card-spot relative overflow-hidden rounded-3xl border-primary/30 p-6 sm:p-8">
        <div className="absolute inset-0 bg-stage-grid opacity-20" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="outline" className="mb-2 border-primary/40 text-primary">
                <Sparkles className="mr-1.5 size-3.5" />
                AI Talent Agent
              </Badge>
              <h2 className="font-display text-2xl font-bold">Your career coach</h2>
            </div>
            {coach && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Live · analyzing your signals
              </span>
            )}
          </div>

          {!coach ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/50" />
              ))}
            </div>
          ) : (
            <>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                {coach.summary}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {coach.actions.map((a, i) => {
                  const Icon = icons[a.icon] ?? Sparkles;
                  return (
                    <motion.div
                      key={a.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <Link
                        to={a.link}
                        className="group block rounded-2xl border border-border/60 bg-background/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-semibold">
                              {a.title}
                              <ArrowRight className="size-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                              {a.body}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
              {coach.actions.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  All signals green — keep shipping auditions and coaching the
                  next wave.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
