import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Award,
  Trophy,
  GraduationCap,
  CheckCircle2,
  Lock,
  Sparkles,
  BadgeCheck,
  Vote,
  Video,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AIAgent } from "@/components/AIAgent";
import { cn } from "@/lib/utils";

const gradeColor: Record<string, string> = {
  Bronze: "text-amber-600",
  Silver: "text-slate-300",
  Gold: "text-primary",
  Platinum: "text-sky-300",
};

const stageIcons: Record<string, typeof Sparkles> = {
  unknown: Lock,
  discovery: Sparkles,
  competition: Trophy,
  mentorship: GraduationCap,
  distribution: Vote,
  professional: BadgeCheck,
};

export default function Passport() {
  const passport = useQuery(api.passport.myPassport, {});

  return (
    <AppShell>
      {!passport ? (
        <div className="animate-pulse text-sm text-muted-foreground">
          Loading your Talent Passport…
        </div>
      ) : (
        <div className="space-y-8">
          {/* Passport header card */}
          <div className="card-spot relative overflow-hidden rounded-3xl p-6 sm:p-10">
            <div className="absolute inset-0 bg-stage-grid opacity-30" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 font-display text-3xl font-bold text-primary shadow-glow-roc">
                  {(passport.user.name ?? passport.user.username ?? "S")[0]?.toUpperCase()}
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 border-primary/40 text-primary">
                    <ShieldCheck className="mr-1.5 size-3.5" />
                    Digital Talent Passport™
                  </Badge>
                  <h1 className="font-display text-3xl font-bold">
                    {passport.user.name ?? passport.user.username ?? "Unnamed Star"}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {passport.user.talents.length > 0
                      ? passport.user.talents.join(" · ")
                      : "Add talent categories in your profile"}
                    {" · "}
                    {passport.user.plan === "gold" ? "VStarz Gold" : "Free tier"}
                  </p>
                </div>
              </div>

              {/* Credit score dial */}
              <div className="flex items-center gap-5 rounded-2xl border border-border/60 bg-background/60 p-5">
                <div className="text-center">
                  <p
                    className={cn(
                      "font-display text-5xl font-bold text-gradient-roc",
                      gradeColor[passport.credit.grade],
                    )}
                  >
                    {passport.credit.total}
                  </p>
                  <Badge className="mt-1 badge-gold border-0">
                    {passport.credit.grade}
                  </Badge>
                </div>
                <div className="max-w-[220px] border-l border-border/60 pl-5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <BadgeCheck className="size-4 text-primary" />
                    Creator Credit Score
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Verified trust metric. Brands and labels recruit from it.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Talent Agent */}
          <AIAgent />

          {/* Credit score components */}
          <section>
            <h2 className="mb-4 font-display text-2xl font-bold">
              Score breakdown
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { key: "professionalism", label: "Professionalism" },
                { key: "engagement", label: "Engagement" },
                { key: "reliability", label: "Reliability" },
                { key: "completion", label: "Completion" },
                { key: "brandSafety", label: "Brand Safety" },
              ].map((c, i) => {
                const v = passport.credit[c.key as keyof typeof passport.credit] as number;
                return (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="card-spot">
                      <CardContent className="p-4">
                        <p className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {c.label}
                          </span>
                          <span className="font-display text-xl font-bold">
                            {v}
                          </span>
                        </p>
                        <Progress value={v} className="mt-3 h-1.5" />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Talent-to-Career pipeline */}
          <section>
            <h2 className="mb-1 font-display text-2xl font-bold">
              Talent-to-Career Pipeline
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              From unknown to professional — without leaving VStarz.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {passport.pipeline.map((p, i) => {
                const Icon = stageIcons[p.key] ?? Sparkles;
                return (
                  <motion.div
                    key={p.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "rounded-2xl border p-5",
                      p.current
                        ? "border-primary/50 bg-primary/10 shadow-glow-roc"
                        : p.reached
                          ? "border-border/60 bg-card/60"
                          : "border-border/40 bg-card/30 opacity-70",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-xl",
                          p.reached ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {p.reached ? <Icon className="size-4" /> : <Lock className="size-4" />}
                      </span>
                      {p.current && (
                        <Badge className="bg-primary text-primary-foreground">You are here</Badge>
                      )}
                      {!p.current && p.reached && (
                        <CheckCircle2 className="size-4 text-primary" />
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold">
                      {i + 1}. {p.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    {!p.reached && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Lock className="size-3" />
                        Unlock: {p.unlock}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Stats + certifications */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card-spot rounded-3xl p-6">
              <h2 className="font-display text-xl font-bold">Career stats</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: Video, value: passport.stats.totalAuditions, label: "Auditions" },
                  { icon: Vote, value: passport.stats.totalVotes, label: "Total votes" },
                  { icon: GraduationCap, value: passport.stats.certifications, label: "Certifications" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/60 bg-background/50 p-4">
                    <s.icon className="mx-auto size-5 text-primary" />
                    <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold">
                <Award className="size-4 text-primary" /> Badges
              </h3>
              {passport.user.badges.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No badges yet — earn certifications in the Academy.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {passport.user.badges.map((b) => (
                    <Badge key={b} variant="secondary" className="capitalize">
                      <Star className="mr-1 size-3 text-primary" />
                      {b.replace(/^academy:/, "").replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Competition history */}
            <div className="card-spot rounded-3xl p-6">
              <h2 className="font-display text-xl font-bold">Competition history</h2>
              {passport.history.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No auditions yet. Your verified record starts with your first
                  submission.
                </p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {passport.history.map((h) => (
                    <div
                      key={h._id}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3"
                    >
                      <Trophy className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{h.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.competition?.title ?? "Contest"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-primary">
                        {h.votes} votes
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
