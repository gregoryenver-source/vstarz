import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Flame, Play, Vote, Clock, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SocialShareButtons } from "@/components/SocialShareButtons";

type HotEntry = {
  _id: string;
  title: string;
  videoUrl: string;
  voteCount: number;
  createdAt: number;
  user: { _id: string; name?: string | null; username?: string | null; image?: string | null } | null;
  competition: { _id: string; title: string; status: string } | null;
};

const daysAgo = (ts: number) => {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

export function HottestAuditions() {
  const hottest = (useQuery(api.entries.hottest, { limit: 9 }) ?? []) as HotEntry[];
  const [playing, setPlaying] = useState<HotEntry | null>(null);

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 shadow-glow-roc">
            <Flame className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">
              Hottest auditions this week
            </h2>
            <p className="text-sm text-muted-foreground">
              Tap any audition to watch it — ranked by public votes.
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-primary">
          <Link to="/competitions">
            Browse contests <Vote className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {hottest.length === 0 ? (
        <div className="card-spot flex items-center gap-4 rounded-3xl p-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Flame className="size-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            The heat map is cold — no auditions collected votes in the last 7
            days.{" "}
            <Link to="/competitions" className="text-primary underline">
              Be the first on stage
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="group/carousel relative">
          <Carousel
            opts={{
              align: "start",
              loop: hottest.length > 3,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {hottest.map((entry, i) => (
                <CarouselItem
                  key={entry._id}
                  className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35 }}
                    className="h-full"
                  >
                    <button
                      type="button"
                      onClick={() => setPlaying(entry)}
                      aria-label={`Play audition: ${entry.title}`}
                      className="group/card block h-full w-full text-left"
                    >
                      <article className="card-spot flex h-full flex-col overflow-hidden rounded-2xl transition-transform group-hover/card:-translate-y-1">
                        {/* Video box */}
                        <div className="relative aspect-video overflow-hidden bg-black/60">
                          <video
                            src={entry.videoUrl}
                            preload="metadata"
                            muted
                            loop
                            playsInline
                            className="size-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                            onMouseEnter={(e) =>
                              void e.currentTarget.play().catch(() => {})
                            }
                            onMouseLeave={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                          />
                          {/* Gradient scrim + rank badge */}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                          <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-primary/90 font-display text-sm font-bold text-primary-foreground shadow-glow-roc">
                            {i + 1}
                          </span>
                          {/* Play hint */}
                          <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full border border-white/30 bg-black/50 opacity-0 transition-opacity group-hover/card:opacity-100">
                            <Play className="ml-0.5 size-5 fill-current text-white" />
                          </span>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <h3 className="truncate font-semibold">{entry.title}</h3>
                          <p className="truncate text-xs text-muted-foreground">
                            by {entry.user?.name ?? entry.user?.username ?? "Unknown"}
                            {entry.competition && <> · {entry.competition.title}</>}
                          </p>
                          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2">
                            <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                              <Vote className="size-3.5" />
                              {entry.voteCount.toLocaleString()} votes
                            </span>
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <Clock className="size-3" />
                              {daysAgo(entry.createdAt)}
                            </span>
                          </div>
                        </div>
                      </article>
                    </button>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-background/80 backdrop-blur" />
            <CarouselNext className="right-2 bg-background/80 backdrop-blur" />
          </Carousel>
        </div>
      )}

      {/* Video player modal */}
      <Dialog open={playing !== null} onOpenChange={(open) => !open && setPlaying(null)}>
        <DialogContent className="max-h-[92vh] gap-4 overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
          {playing && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{playing.title}</DialogTitle>
                <DialogDescription>
                  Audition by {playing.user?.name ?? playing.user?.username ?? "Unknown"}
                </DialogDescription>
              </DialogHeader>

              {/* Player */}
              <div className="overflow-hidden rounded-2xl bg-black shadow-glow-roc">
                <video
                  key={playing._id}
                  src={playing.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="aspect-video w-full"
                />
              </div>

              {/* Meta + actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold leading-tight">
                    {playing.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    by {playing.user?.name ?? playing.user?.username ?? "Unknown"}
                    {playing.competition && <> · {playing.competition.title}</>}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Vote className="size-3.5" />
                    {playing.voteCount.toLocaleString()} public votes
                    <span className="font-normal text-muted-foreground">
                      · posted {daysAgo(playing.createdAt)}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 space-y-2">
                  <Button asChild className="w-full gap-2 font-semibold">
                    <Link
                      to={
                        playing.competition
                          ? `/competitions/${playing.competition._id}`
                          : "/competitions"
                      }
                      onClick={() => setPlaying(null)}
                    >
                      Vote in this contest
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  {/* Share this audition to Facebook / Instagram */}
                  <div className="flex justify-center sm:justify-end">
                    <SocialShareButtons
                      compact
                      path={`/auditions/${playing._id}`}
                      title={playing.title}
                      subtitle={`by ${playing.user?.name ?? playing.user?.username ?? "Unknown"}`}
                      mediaUrl={playing.videoUrl}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          {/* Visible fallback close button for touch users */}
          <button
            type="button"
            aria-label="Close player"
            onClick={() => setPlaying(null)}
            className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-black"
          >
            <X className="size-5" />
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
