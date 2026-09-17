import { motion } from "framer-motion";
import {
  Star,
  Trophy,
  Radio,
  Heart,
  Crown,
  Play,
  Sparkles,
  Users,
  Video,
  Vote,
  ChevronRight,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";

const features = [
  {
    icon: Video,
    title: "Video Auditions",
    body: "Upload your audition once. Get discovered by fans and judges across every category.",
  },
  {
    icon: Vote,
    title: "Credit Voting",
    body: "Fans spend voting credits to back their favorites. Real stakes, real rankings.",
  },
  {
    icon: Radio,
    title: "Live Rooms",
    body: "Go live with your fanbase. Chat, react, and run live votes in the moment.",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    body: "Climb the board week after week. Winners get featured across vStarz.",
  },
  {
    icon: Heart,
    title: "Fan Following",
    body: "Build a following that gets notified the moment you post or go live.",
  },
  {
    icon: Crown,
    title: "Premium Perks",
    body: "Monthly credits, early access, and featured placement for premium members.",
  },
];

const categories = [
  { name: "Singing", icon: "🎤" },
  { name: "Dancing", icon: "🕺" },
  { name: "Comedy", icon: "🎭" },
  { name: "Magic", icon: "🪄" },
  { name: "Music", icon: "🎸" },
  { name: "Acting", icon: "🎬" },
  { name: "Acrobatics", icon: "🤸" },
  { name: "More", icon: "✨" },
];

const steps = [
  {
    n: "01",
    title: "Create your profile",
    body: "Pick your talent category and set up your public stage in under a minute.",
  },
  {
    n: "02",
    title: "Submit your audition",
    body: "Upload a video to an open competition. Our team reviews it fast.",
  },
  {
    n: "03",
    title: "Rally your fans",
    body: "Share your entry, go live, and turn supporters into votes.",
  },
  {
    n: "04",
    title: "Take the crown",
    body: "Top the leaderboard, win featured showcases, and grow your stardom.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow-gold">
              <Star className="size-4 fill-current" />
            </div>
            <span className="font-display text-xl font-bold text-gradient-gold">
              vStarz
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#live" className="hover:text-foreground transition-colors">Live</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Premium</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={isAuthenticated ? "/dashboard" : "/auth"}>Sign in</Link>
            </Button>
            <Button asChild size="sm" className="font-semibold">
              <Link to="/auth?returnTo=%2Fdashboard">
                Join vStarz
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-stage-grid opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Flame className="size-3.5" />
            Season 1 open — auditions are live
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          >
            The stage is yours.
            <span className="block text-gradient-gold">Talent deserves an arena.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            vStarz is the talent competition platform where performers upload
            auditions, fans vote with credits, and champions are crowned live.
            Sing. Dance. Amaze. Get voted into the spotlight.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-glow-gold">
              <Link to="/auth?returnTo=%2Fdashboard">
                <Sparkles className="size-5" />
                Start your audition
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link to="/dashboard">
                <Play className="size-5" />
                Explore competitions
              </Link>
            </Button>
          </motion.div>

          {/* Spotlight visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="relative mx-auto mt-16 max-w-4xl"
          >
            <div className="absolute -inset-8 rounded-[2.5rem] bg-primary/10 blur-3xl" />
            <div className="card-spot relative rounded-3xl p-2 shadow-2xl">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-accent/60 via-card to-background p-6 sm:p-10">
                <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative grid grid-cols-3 gap-4">
                  {["Aria V.", "Dre K.", "Nova L."].map((name, i) => (
                    <div key={name} className="rounded-xl border border-border/60 bg-card/80 p-3 text-center">
                      <div className={`mx-auto mb-2 flex size-10 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        {i + 1}
                      </div>
                      <p className="text-sm font-semibold">{name}</p>
                      <p className="text-xs text-muted-foreground">{[12480, 10912, 9433][i]} votes</p>
                    </div>
                  ))}
                </div>
                <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: "10%" }}
                    animate={{ width: "82%" }}
                    transition={{ delay: 1, duration: 1.4, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-ember to-primary"
                  />
                </div>
                <p className="relative mt-3 text-xs text-muted-foreground">
                  Live leaderboard · Round 2 · voting closes in 4 days
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories marquee */}
      <section className="border-y border-border/50 bg-card/40 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4">
          {categories.map((c) => (
            <span key={c.name} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-lg">{c.icon}</span>
              {c.name}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary">Everything you need</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight">
            Built for the <span className="text-gradient-gold">performer economy</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            From first audition to grand final — vStarz handles the stage, the
            fans, and the votes.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="card-spot group rounded-2xl p-6 transition-transform hover:-translate-y-1"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border/50 bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">The path</Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">
              Four steps to <span className="text-gradient-gold">stardom</span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative"
              >
                <div className="font-display text-4xl font-bold text-primary/30">{s.n}</div>
                <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live section */}
      <section id="live" className="mx-auto max-w-6xl px-4 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="outline" className="mb-4 border-rose/50 text-rose">
              <Radio className="mr-1.5 size-3.5" />
              Live
            </Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">
              Show nights that feel like <span className="text-gradient-gold">prime time</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Hosts open a live room, fans pour in with chat and reactions, and
              live voting decides the winner while everyone watches. Followers
              get pinged the second you go live.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Real-time chat with your fanbase",
                "Credit-based live voting with instant tallies",
                "Automatic follower notifications",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Sparkles className="size-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 font-semibold">
              <Link to="/auth?returnTo=%2Flive">
                Go live with vStarz
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="card-spot rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-rose" />
              </span>
              <span className="text-sm font-semibold">LIVE · Finals Night</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3.5" /> 2,184 watching
              </span>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-accent via-card to-background">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow-gold">
                  <Play className="size-6 fill-current" />
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { who: "Maya", text: "NO WAY that high note 😭" },
                { who: "J4ZZ", text: "10 credits on Nova, let's go" },
                { who: "Tariq", text: "chat we are witnessing history" },
              ].map((m) => (
                <div key={m.who} className="rounded-lg bg-secondary/60 px-3 py-2 text-sm">
                  <span className="font-semibold text-primary">{m.who}</span>{" "}
                  <span className="text-muted-foreground">{m.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="border-t border-border/50 bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">Monetization</Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">
              Credits, crowns &amp; <span className="text-gradient-gold">cash prizes</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Fans buy voting credits. Talent keeps creating. Premium members
              get monthly credit drops and featured placement.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card-spot rounded-3xl p-8">
              <div className="flex items-center gap-2 text-primary">
                <Vote className="size-5" />
                <h3 className="font-display text-xl font-semibold">Voting Credits</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Packs from $4.99. The bigger the pack, the more you save.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {["50 credits — $4.99", "150 credits — $11.99", "500 credits — $34.99", "1,500 credits — $89.99"].map((p) => (
                  <div key={p} className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">{p}</div>
                ))}
              </div>
            </div>
            <div className="card-spot relative overflow-hidden rounded-3xl p-8">
              <div className="absolute right-4 top-4">
                <Badge className="bg-primary text-primary-foreground">Popular</Badge>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Crown className="size-5" />
                <h3 className="font-display text-xl font-semibold">Premium</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                From $7.99/mo. Monthly credits, early access, and the gold badge.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {["500–1,500 bonus credits monthly", "Early competition access", "Featured leaderboard placement", "Priority audition review"].map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <Star className="size-3.5 fill-current text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-stage-grid opacity-40" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">
            Your audience is <span className="text-gradient-gold">waiting</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join the performers and fans already on stage. Create your free
            account and submit your first audition tonight.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 font-semibold shadow-glow-gold">
              <Link to="/auth?returnTo=%2Fdashboard">Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8">
              <Link to="/dashboard">Watch the competition</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Star className="size-3.5 fill-current" />
            </div>
            <span className="font-display font-bold text-gradient-gold">vStarz</span>
          </div>
          <p>© 2026 vStarz. The stage is yours.</p>
          <div className="flex gap-5">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Premium</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
