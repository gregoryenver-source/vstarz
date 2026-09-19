import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Vote, Clock, ArrowRight, Flame, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SocialShareButtons } from "@/components/SocialShareButtons";

function daysAgo(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function AuditionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const entry = useQuery(
    api.entries.getById,
    id ? { id: id as never } : "skip",
  );

  if (entry === undefined) {
    return (
      <AppShell>
        <div className="animate-pulse text-sm text-muted-foreground">
          Loading audition…
        </div>
      </AppShell>
    );
  }

  if (entry === null) {
    return (
      <AppShell>
        <div className="card-spot mx-auto max-w-lg rounded-3xl p-10 text-center">
          <Flame className="mx-auto size-10 text-muted-foreground/50" />
          <h1 className="mt-3 font-display text-2xl font-bold">
            Audition not available
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link may be private, unapproved, or expired. Browse the stage to
            find live auditions.
          </p>
          <Button asChild className="mt-5 font-semibold">
            <Link to="/competitions">
              Browse competitions
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl space-y-5"
      >
        {/* Player */}
        <div className="overflow-hidden rounded-3xl bg-black shadow-glow-roc">
          <video
            src={entry.videoUrl}
            controls
            autoPlay
            playsInline
            className="aspect-video w-full"
          />
        </div>

        {/* Meta */}
        <div className="card-spot rounded-3xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold leading-tight">
                {entry.title}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <User className="size-3.5" />
                {entry.user ? (
                  <button
                    className="font-medium text-foreground hover:text-primary hover:underline"
                    onClick={() => navigate(`/profile/${entry.user!._id}`)}
                  >
                    {entry.user.name ?? entry.user.username ?? "Unknown"}
                  </button>
                ) : (
                  "Unknown"
                )}
                {entry.competition && (
                  <>
                    <span>·</span>
                    <Link
                      to={`/competitions/${entry.competition._id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {entry.competition.title}
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Vote className="size-3.5" />
                {entry.voteCount.toLocaleString()} public votes
                <span className="font-normal text-muted-foreground">
                  · posted {daysAgo(entry.createdAt)}
                  {entry.status !== "approved" && ` · ${entry.status}`}
                </span>
              </p>
              {entry.status !== "approved" && (
                <Badge variant="outline" className="mt-2 border-amber-500/40 text-amber-400">
                  Preview — {entry.status}
                </Badge>
              )}
            </div>
          </div>

          {entry.description && (
            <p className="mt-4 border-t border-border/50 pt-4 text-sm leading-6 text-muted-foreground">
              {entry.description}
            </p>
          )}

          {/* Share row — Facebook / Instagram / copy link */}
          <div className="mt-5 flex flex-col gap-4 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <SocialShareButtons
              path={`/auditions/${entry._id}`}
              title={entry.title}
              subtitle={
                entry.user
                  ? `by ${entry.user.name ?? entry.user.username ?? "Unknown"}`
                  : undefined
              }
              mediaUrl={entry.videoUrl}
            />
            {entry.competition && (
              <Button asChild size="sm" className="gap-1.5 font-semibold">
                <Link to={`/competitions/${entry.competition._id}`}>
                  Vote in this contest
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          Shared from VStarz — The World's First Digital Mobile Talent Contest
          & Creator Economy Platform
        </p>
      </motion.div>
    </AppShell>
  );
}
