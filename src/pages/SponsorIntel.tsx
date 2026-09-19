import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Users,
  Video,
  Vote,
  Eye,
  MousePointerClick,
  Wallet,
  Flame,
  Trophy,
  Target,
  Handshake,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
} from "recharts";
import { Link } from "react-router";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function money(cents: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function compact(n: number) {
  return new Intl.NumberFormat("en-ZA", { notation: "compact" }).format(n);
}

function timeAgoDays(days: number) {
  if (days === 0) return "active today";
  if (days === 1) return "active yesterday";
  if (days <= 14) return `active ${days}d ago`;
  return `dormant ${days}d`;
}

const momentumStyles: Record<string, string> = {
  hot: "border-primary/40 bg-primary/10 text-primary",
  warm: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  cooling: "border-border/60 bg-secondary text-muted-foreground",
};

type Creator = {
  rank: number;
  _id: string;
  name: string;
  username: string;
  image?: string;
  talents: string[];
  country?: string;
  plan: string;
  votes: number;
  auditions: number;
  completion: number;
  momentum: string;
  lastActiveDays: number;
};

type Campaign = {
  _id: string;
  advertiser: string;
  title: string;
  placement: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

export default function SponsorIntel() {
  const kpis = useSafeQuery(api.sponsor.platformKpis, {});
  const campaigns = (useSafeQuery(api.sponsor.campaignPerformance, {}) ?? []) as Campaign[];
  const creators = (useSafeQuery(api.sponsor.creatorLeaderboard, { limit: 8 }) ?? []) as Creator[];
  const trend =
    useSafeQuery(api.sponsor.audienceTrend, {}) ??
    [] as { label: string; auditions: number; interactions: number }[];
  const appeal = useSafeQuery(api.sponsor.mySponsorAppeal, {});

  const kpiCards = kpis
    ? [
        {
          icon: Users,
          label: "Creators on platform",
          value: compact(kpis.creators),
          sub: `+${kpis.newCreatorsThisWeek} this week`,
        },
        {
          icon: Video,
          label: "Auditions submitted",
          value: compact(kpis.totalAuditions),
          sub: `+${kpis.auditionsThisWeek} this week`,
        },
        {
          icon: Vote,
          label: "Fan votes cast",
          value: compact(kpis.totalVotes),
          sub: `${kpis.openCompetitions} open contests`,
        },
        {
          icon: Eye,
          label: "Live viewers right now",
          value: compact(kpis.viewersNow),
          sub: `${kpis.liveRooms} rooms live`,
        },
        {
          icon: MousePointerClick,
          label: "Campaign impressions",
          value: compact(kpis.adImpressions),
          sub: `${kpis.ctr}% click-through`,
        },
        {
          icon: Wallet,
          label: "Platform revenue",
          value: money(kpis.revenueCents),
          sub: "all-time, completed",
        },
      ]
    : [];

  return (
    <AppShell>
      {/* Header */}
      <div className="card-spot relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="absolute inset-0 bg-stage-grid opacity-30" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/40 text-primary">
              <BarChart3 className="mr-1.5 size-3.5" />
              Sponsor Intelligence
            </Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Measurable <span className="text-gradient-roc">creator performance.</span>
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Live reach, engagement and ROI for sponsors and brand partners —
              the dashboards brands increasingly demand.
            </p>
          </div>
          <Button asChild size="sm" className="gap-2 font-semibold">
            <Link to="/competitions/new">
              <Handshake className="size-4" />
              Launch a brand challenge
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      {kpis && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpiCards.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="card-spot h-full">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <k.icon className="size-4" />
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {k.sub}
                    </span>
                  </div>
                  <p className="mt-3 font-display text-3xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Audience trend */}
        <Card className="card-spot">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h2 className="font-display text-xl font-bold">Audience growth — 8 weeks</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Submissions and fan interactions per week across the platform.
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gAuditions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gInter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                  <ReTooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="auditions"
                    name="Auditions"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#gAuditions)"
                  />
                  <Area
                    type="monotone"
                    dataKey="interactions"
                    name="Votes"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#gInter)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Campaign performance */}
        <Card className="card-spot">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <MousePointerClick className="size-4 text-primary" />
              <h2 className="font-display text-xl font-bold">Campaign performance</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Digital real estate placements — impressions and click-through by advertiser.
            </p>
            {campaigns.length === 0 ? (
              <p className="rounded-xl border border-border/60 bg-background/50 p-6 text-center text-sm text-muted-foreground">
                No active campaigns yet. Brand takeovers appear here with live
                impressions and CTR.
              </p>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div
                    key={c._id}
                    className="rounded-xl border border-border/60 bg-background/50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{c.advertiser}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                        {c.placement.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{compact(c.impressions)} impressions</span>
                      <span>{c.clicks} clicks</span>
                      <span className="font-semibold text-primary">{c.ctr}% CTR</span>
                    </div>
                    <Progress
                      value={Math.min(100, c.ctr * 20)}
                      className="mt-2 h-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Creator leaderboard */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Flame className="size-4 text-primary" />
          <h2 className="font-display text-xl font-bold">Creator recruitment pool</h2>
          <span className="text-sm text-muted-foreground">
            — ranked by verified fan engagement
          </span>
        </div>
        {creators.length === 0 ? (
          <Card className="card-spot">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No creator activity yet. The recruitment pool fills as auditions roll in.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {creators.map((c, i) => (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="card-spot h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      {c.rank <= 3 ? (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-display text-sm font-bold text-primary shadow-glow-roc">
                          #{c.rank}
                        </span>
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-display text-sm font-bold text-muted-foreground">
                          #{c.rank}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.country ?? "Africa"} · @{c.username}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.talents.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] capitalize">
                          {t}
                        </Badge>
                      ))}
                      {c.plan !== "free" && (
                        <Badge className="badge-gold border-0 text-[10px]">Gold</Badge>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="font-display text-lg font-bold">{compact(c.votes)}</p>
                        <p className="text-[10px] text-muted-foreground">votes</p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-bold">{c.auditions}</p>
                        <p className="text-[10px] text-muted-foreground">auditions</p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-bold">{c.completion}%</p>
                        <p className="text-[10px] text-muted-foreground">completion</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] capitalize", momentumStyles[c.momentum])}
                      >
                        <Target className="mr-1 size-3" />
                        {c.momentum} · {timeAgoDays(c.lastActiveDays)}
                      </Badge>
                      <Link
                        to={`/profile/${c._id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View profile
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Creator-side: your own sponsor appeal */}
      {appeal && (
        <Card className="card-spot mt-8">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="size-4 text-primary" />
                  <h2 className="font-display text-xl font-bold">Your sponsor appeal</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  What brands see when they evaluate you for campaigns.
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-4xl font-bold text-gradient-roc">
                  {appeal.appeal}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  appeal score
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Fan votes", value: compact(appeal.votes) },
                { label: "Approved auditions", value: `${appeal.approved}/${appeal.auditions}` },
                { label: "Fan club members", value: compact(appeal.fanClubMembers) },
                { label: "Brand-safety flags", value: String(appeal.flags) },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/60 bg-background/50 px-3 py-3 text-center"
                >
                  <p className="font-display text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
