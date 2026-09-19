import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/AppShell";
import { HottestAuditions } from "@/components/HottestAuditions";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";
import {
  Trophy,
  Radio,
  Video,
  Sparkles,
  ArrowRight,
  Coins,
  Users,
  Flame,
  Star,
  Radar,
} from "lucide-react";
import { Link } from "react-router";
import { useEffect } from "react";

const statusMeta: Record<string, { label: string; className: string }> = {
  submissions_open: { label: "Auditions open", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  voting_open: { label: "Voting open", className: "bg-primary/15 text-primary border-primary/30" },
  closed: { label: "Ended", className: "bg-secondary text-muted-foreground" },
  draft: { label: "Draft", className: "bg-secondary text-muted-foreground" },
};

export default function Dashboard() {
  const { user } = useAuth();

  const seed = useMutation(api.bootstrap.seedAll);
  const demo = useMutation(api.bootstrap.createDemoData);
  const comps = useSafeQuery(api.competitions.list, {}) ?? [];
  const live = useSafeQuery(api.live.listLive, {}) ?? { live: [], scheduled: [] };

  useEffect(() => {
    // Seeding is best-effort: never let a backend error break page render.
    seed({}).catch(() => {});
    demo({}).catch(() => {});
  }, [seed, demo]);

  const openComps = comps.filter((c) => c.status === "submissions_open");
  const votingComps = comps.filter((c) => c.status === "voting_open");
  const spotlight = [...votingComps, ...openComps].slice(0, 3);

  // AI Talent Radar — composite discovery scores across the platform
  const radar = useSafeQuery(api.ai.talentRadar, { limit: 4 }) ?? [];

  const quick = [
    { to: "/competitions", label: "Browse the catalog", icon: Trophy },
    { to: "/competitions?submit=1", label: "Post an audition", icon: Video },
    { to: "/live", label: "Watch live shows", icon: Radio },
    { to: "/boost", label: "Get voting credits", icon: Coins },
  ];

  return (
    <AppShell>
      {/* Hottest auditions this week — video carousel at the top of the page */}
      <QueryErrorBoundary fallback={null}>
        <HottestAuditions />
      </QueryErrorBoundary>

      {/* Hero */}
      <div className="card-spot relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="absolute inset-0 bg-stage-grid opacity-30" />
        <div className="relative">
          <Badge className="mb-4 border border-primary/30 bg-primary/10 text-primary" variant="outline">
            <Flame className="mr-1.5 size-3.5" />
            Season 1 is underway
          </Badge>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Welcome back,{" "}
            <span className="text-gradient-roc">
              {user?.name?.split(" ")[0] ?? user?.username ?? "Star"}
            </span>
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Post auditions, grow your following, and follow every contest
            from your personal dashboard. Discover, compete, create, and earn —
            all from your mobile device.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="font-semibold">
              <Link to="/competitions">
                <Video className="size-4" />
                Post an audition
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/live">
                <Radio className="size-4" />
                Watch live shows
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* AI Talent Radar */}
      <Card className="card-spot mb-8 border-primary/25 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Radar className="size-5 text-primary" />
              AI Talent Radar
            </CardTitle>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="mr-1 size-3" />
              Composite: 40% public · 60% judges
            </Badge>
          </div>
          <CardDescription>
            The AI scans votes, judge scores and momentum across the platform to surface
            rising talent — the same signals scouts and the label's A&amp;R team watch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {radar.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              The radar is calibrating — it activates once auditions start collecting votes.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {radar.map((t, i) => (
                <Link
                  key={t.userId}
                  to={`/profile/${t.userId}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-3 transition-colors hover:border-primary/40"
                >
                  <span className="font-display text-2xl font-bold text-gradient-roc">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {t.artist?.name ?? t.artist?.username ?? "Rising artist"}
                      {t.artist?.badges?.includes("verified") && (
                        <span className="ml-1 inline-block size-2 rounded-full bg-primary align-middle" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.votes.toLocaleString()} votes · {t.momentum}% weekly momentum
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold">{t.composite}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">score</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quick.map((q) => (
          <Link
            key={q.label}
            to={q.to}
            className="card-spot group flex items-center gap-3 rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <q.icon className="size-5" />
            </div>
            <span className="text-sm font-medium">{q.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Competitions */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Featured contests</h2>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/competitions">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {comps.length === 0 ? (
            <Card className="card-spot">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No contests yet — check back soon.
              </CardContent>
            </Card>
          ) : (
            spotlight.map((c) => (
              <Link key={c._id} to={`/competitions/${c._id}`} className="block">
                <Card className="card-spot border-border/60 transition-transform hover:-translate-y-0.5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusMeta[c.status]?.className}>
                        {statusMeta[c.status]?.label ?? c.status}
                      </Badge>
                      {c.prize && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Trophy className="size-3.5 text-primary" />
                          {c.prize}
                        </span>
                      )}
                    </div>
                    <CardTitle className="font-display text-xl">{c.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {c.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Side rail */}
        <div className="space-y-4">
          <Card className="card-spot">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="size-4 text-primary" /> Live now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {live.live.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No shows are live right now. Follow performers to be notified
                  the moment they go on air.
                </p>
              ) : (
                live.live.slice(0, 3).map((r) => (
                  <Link
                    key={r._id}
                    to={`/live/${r._id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/40 p-3 transition-colors hover:border-primary/40"
                  >
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.viewerCount} watching
                      </p>
                    </div>
                  </Link>
                ))
              )}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/live">All live rooms</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-spot">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" /> Get discovered
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Complete your performer profile so the audience can find you —{" "}
                <Link to="/profile" className="text-primary underline">update it here</Link>.
              </p>
              {!user?.isTalent && (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/profile">
                    <Sparkles className="size-4" />
                    Become a talent
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="card-spot border-primary/25">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Star className="size-5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Voting credits</p>
                <p className="text-xs text-muted-foreground">
                  {user?.votingCredits ?? 0} available
                </p>
              </div>
              <Button asChild size="sm" className="font-semibold">
                <Link to="/boost">Top up</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
