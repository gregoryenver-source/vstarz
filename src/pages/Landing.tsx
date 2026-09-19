import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import {
  Trophy,
  Radio,
  Heart,
  Crown,
  Play,
  Sparkles,
  Users,
  Video,
  Vote,
  Download,
  ChevronRight,
  Flame,
  Mic,
  AudioLines,
  Footprints,
  Disc3,
  Laugh,
  Clapperboard,
  Quote,
  Church,
  Guitar,
  Shirt,
  Camera,
  Gavel,
  Scale,
  ShieldCheck,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VStarzLogo } from "@/components/VStarzLogo";
import { SponsorBanner } from "@/components/SponsorBanner";
import { OAuthButtons } from "@/components/OAuthButtons";
import { QueryErrorBoundary } from "@/components/QueryErrorBoundary";
import { HottestAuditions } from "@/components/HottestAuditions";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";
import { useEffect } from "react";

const categories = [
  { name: "Singing", icon: Mic },
  { name: "Rap", icon: AudioLines },
  { name: "Dance", icon: Footprints },
  { name: "DJ", icon: Disc3 },
  { name: "Comedy", icon: Laugh },
  { name: "Acting", icon: Clapperboard },
  { name: "Spoken Word", icon: Quote },
  { name: "Gospel", icon: Church },
  { name: "Instrumentalist", icon: Guitar },
  { name: "Fashion", icon: Shirt },
  { name: "Content Creator", icon: Camera },
  { name: "Open Category", icon: Sparkles },
];

const features = [
  {
    icon: Video,
    title: "Video Auditions",
    body: "Perform once, reach a continent. Upload your audition in 30-second, 60-second, 3-minute or 5-minute formats — straight from your phone.",
  },
  {
    icon: Scale,
    title: "Judged & Voted",
    body: "Every contest blends 40% public voting with 60% professional judge scoring, so talent and fan support both decide the outcome.",
  },
  {
    icon: Radio,
    title: "Live Show Nights",
    body: "Artists go live for sessions, competitions and fan engagement. Real-time chat, live voting and judge commentary as it happens.",
  },
  {
    icon: Trophy,
    title: "Leaderboards & Results",
    body: "Combined weighted standings, updated instantly. Season champions earn featured placement across the platform.",
  },
  {
    icon: Heart,
    title: "A Following That Grows",
    body: "Followers are notified the moment you post an audition or go live — your fanbase builds with every performance.",
  },
  {
    icon: ShieldCheck,
    title: "Fair, Protected Contests",
    body: "AI-assisted moderation screens profanity, copyright and fraudulent votes, keeping every competition credible.",
  },
];

const steps = [
  {
    n: "01",
    title: "Create your profile",
    body: "Choose your talent categories and set up your public performer profile in under a minute.",
  },
  {
    n: "02",
    title: "Post your audition",
    body: "Upload a video to an open contest. Judges review every entry before it takes the stage.",
  },
  {
    n: "03",
    title: "Rally your audience",
    body: "Share your entry, go live, and turn supporters into votes. Every credit moves you up the board.",
  },
  {
    n: "04",
    title: "Take the crown",
    body: "Finish on top of the combined leaderboard and your win is featured across VStarz.",
  },
];

const creditPacks = [
  { credits: "10 votes", price: "R10" },
  { credits: "50 votes", price: "R40" },
  { credits: "100 votes", price: "R75" },
  { credits: "500 votes", price: "R299" },
];

const leaderboardRows = [
  { name: "Thabo M.", tag: "Singing", public: 12480, score: 92 },
  { name: "Aisha K.", tag: "Dance", public: 10912, score: 88 },
  { name: "Nova L.", tag: "Rap", public: 9433, score: 84 },
];

const contacts = [
  {
    name: "Judah",
    role: "Chief Strategy Officer",
    emails: ["judah@judahcorporation.co.za", "judah@rocnation.co.za"],
    mobile: "+27 794999885",
  },
  {
    name: "Adrian Pillay",
    role: "Chief Executive Officer",
    emails: ["adrian@judahcorporation.co.za"],
    mobile: "+27 66 486 7806",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  // Seed demo content (competitions, auditions, sponsor banner) for signed-out
  // visitors too — every step is idempotent.
  const seedDemo = useMutation(api.bootstrap.createDemoData);
  useEffect(() => {
    // Seeding is best-effort: never let a backend error break page render.
    seedDemo({}).catch(() => {});
  }, [seedDemo]);

  // Digital real estate — brand takeover slot
  const heroBanners = useSafeQuery(api.banners.getActiveBanners, { placement: "home_hero" }) ?? [];
  const recordImpression = useMutation(api.banners.recordImpression);
  const recordClick = useMutation(api.banners.recordClick);
  const takeover = heroBanners[0] ?? null;

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
          <Link to="/" className="flex items-center">
            <VStarzLogo className="h-8 w-auto" glow={false} />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#voting" className="transition-colors hover:text-foreground">Voting</a>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#live" className="transition-colors hover:text-foreground">Live</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            {/* One-tap Facebook / Instagram connect — always visible up top */}
            <OAuthButtons
              variant="icon"
              redirectTo="/dashboard"
            />
            <Button asChild variant="ghost" size="sm">
              <Link to={isAuthenticated ? "/dashboard" : "/auth"}>Sign in</Link>
            </Button>
            <Button asChild size="sm" className="font-semibold">
              <Link to="/auth?returnTo=%2Fdashboard">
                Join VStarz
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Digital real estate — brand takeover above the V (falls back to the
          static Ignition Group banner until a DB banner exists) */}
      {takeover ? (
        <section className="relative overflow-hidden border-b border-primary/25 bg-gradient-to-r from-[#180000] via-[#3d0000] to-[#180000]">
          <div className="absolute inset-0 bg-stage-grid opacity-20" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-6 sm:flex-row sm:items-center">
            {takeover.advertiser.toLowerCase().includes("ignition") && (
              <a
                href="https://www.ignitiongroup.co.za/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center rounded-xl bg-white/95 px-4 py-2.5 shadow-lg transition-transform hover:scale-[1.03]"
                aria-label="Ignition Group — visit ignitiongroup.co.za"
              >
                <img
                  src={`${import.meta.env.BASE_URL}ignition-logo-possibility.png`}
                  alt="Ignition Group — Powered by possibility"
                  className="h-10 w-auto sm:h-12"
                  loading="lazy"
                />
              </a>
            )}
            <div
              ref={(el) => {
                if (el && !el.dataset.impressed) {
                  el.dataset.impressed = "1";
                  void recordImpression({ bannerId: takeover._id });
                }
              }}
              className="min-w-0 flex-1"
            >
              <p className="font-mont text-[10px] font-bold uppercase tracking-[0.25em] text-primary/90">
                Brand takeover · {takeover.advertiser}
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{takeover.title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-foreground/70">{takeover.subtitle}</p>
            </div>
            <Button
              asChild
              size="lg"
              className="shrink-0 shadow-glow-roc"
              onClick={() => recordClick({ bannerId: takeover._id })}
            >
              {takeover.ctaUrl.startsWith("/") ? (
                <Link to={takeover.ctaUrl}>{takeover.ctaLabel}</Link>
              ) : (
                <a href={takeover.ctaUrl} target="_blank" rel="noreferrer">
                  {takeover.ctaLabel}
                </a>
              )}
            </Button>
          </div>
        </section>
      ) : (
        <SponsorBanner />
      )}

      {/* Hero — signature layout: official brand lockup left, headline right */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-stage-grid opacity-40" />
        <div className="hero-red-haze absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-16 pb-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6 lg:pt-20">
          {/* The emblem */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative mx-auto flex w-full max-w-[320px] items-center justify-center lg:max-w-[420px]"
          >
            <div className="absolute inset-0 -z-10 mx-auto aspect-square w-[85%] rounded-full bg-primary/25 blur-[90px]" />
            <VStarzLogo className="v-glow h-40 w-auto sm:h-52" />
          </motion.div>

          {/* Headline block */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary"
            >
              <Flame className="size-3.5" />
              Season 1 auditions are now open
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-3 font-mont text-xs font-bold uppercase tracking-[0.3em] text-silver"
            >
              Discover · Compete · Create · Earn
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              The World's First
              <span className="block text-gradient-roc">Digital Mobile Talent Contest</span>
              &amp; Creator Economy Platform
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-6 max-w-xl text-lg text-muted-foreground max-lg:mx-auto"
            >
              Discover, compete, create, and earn. VSTARZ empowers singers,
              dancers, comedians, influencers, and creators to showcase their
              talent, grow their audience, win prizes, and unlock new income
              opportunities—all from their mobile device.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
            >
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-glow-roc">
                <Link to="/auth?returnTo=%2Fdashboard">
                  <Sparkles className="size-5" />
                  Post your audition
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
                <Link to="/auth?returnTo=%2Fcompetitions">
                  <Play className="size-5" />
                  Watch the talent
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="h-12 px-6 text-sm text-muted-foreground">
                <Link to="/download">
                  <Download className="size-4" />
                  Get the app — free
                </Link>
              </Button>
            </motion.div>

            {/* Connect with Facebook / Instagram */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-8 rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5"
            >
              <p className="font-mont text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Connect to your Facebook or Instagram
              </p>
              <p className="mt-1 mb-3 text-sm text-muted-foreground">
                One tap signs you up or links your account — no passwords, no
                forms.
              </p>
              <OAuthButtons
                stacked={false}
                redirectTo="/dashboard"
              />
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground lg:justify-start"
            >
              <span className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span className="font-mont font-bold text-foreground">12,400+</span> performers
              </span>
              <span className="flex items-center gap-2">
                <Video className="size-4 text-primary" />
                <span className="font-mont font-bold text-foreground">8,900+</span> auditions
              </span>
              <span className="flex items-center gap-2">
                <Vote className="size-4 text-primary" />
                <span className="font-mont font-bold text-foreground">1.2M+</span> votes cast
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Hottest auditions this week — video carousel (live data) */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <QueryErrorBoundary fallback={null}>
          <HottestAuditions />
        </QueryErrorBoundary>
      </section>

      {/* Spotlight leaderboard strip */}
      <section className="border-y border-border/50 bg-card/40 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative mx-auto max-w-4xl">
            <div className="card-spot rounded-3xl p-2 shadow-2xl">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-accent/60 via-card to-background p-6 sm:p-8">
                <div className="absolute left-1/2 top-0 h-56 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-display text-xl font-bold">Season 1 · Combined leaderboard</p>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-primary" />
                    </span>
                    Live · voting closes in 4 days
                  </span>
                </div>
                <div className="relative space-y-2.5">
                  {leaderboardRows.map((row, i) => (
                    <div
                      key={row.name}
                      className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/80 px-4 py-3"
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${
                          i === 0 ? "bg-primary text-primary-foreground shadow-glow-roc" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.tag} · {row.public.toLocaleString()} public votes</p>
                      </div>
                      <div className="hidden w-40 sm:block">
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <motion.div
                            initial={{ width: "8%" }}
                            whileInView={{ width: `${row.score}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 + i * 0.15, duration: 1, ease: "easeOut" }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                      <span className="font-display text-xl font-bold text-gradient-roc">{row.score}</span>
                    </div>
                  ))}
                </div>
                <p className="relative mt-4 text-center text-xs text-muted-foreground">
                  Combined score = 40% public vote + 60% judge score
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voting system */}
      <section id="voting" className="border-b border-border/50 bg-card/40 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">
              <Scale className="mr-1.5 size-3.5" />
              The voting system
            </Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">
              Two voices, <span className="text-gradient-roc">one verdict</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Fans and industry professionals each get a say. The combined
              weighted score decides who advances — and who takes the crown.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Public Voting",
                weight: "40%",
                body: "Fans vote with credits for the performers they believe in. Real support, real stakes.",
              },
              {
                icon: Gavel,
                title: "Professional Judges",
                weight: "60%",
                body: "Industry judges score every entry on craft, stage presence and star potential.",
              },
              {
                icon: Trophy,
                title: "Combined Score",
                weight: "100%",
                body: "The weighted blend produces one transparent leaderboard for every contest.",
              },
            ].map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={`card-spot rounded-2xl p-6 ${i === 2 ? "border-primary/40 shadow-glow-roc" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <v.icon className="size-5" />
                  </div>
                  <span className={`font-display text-2xl font-bold ${i === 2 ? "text-gradient-roc" : "text-silver"}`}>
                    {v.weight}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-border/50 bg-card/30 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-3 px-4">
          {categories.map((c) => (
            <span key={c.name} className="flex items-center gap-2 text-sm text-muted-foreground">
              <c.icon className="size-4 text-primary" />
              {c.name}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary">The platform</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight">
            A professional stage, <span className="text-gradient-roc">in your pocket</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything a modern talent contest demands — from first audition to
            grand final, handled end to end.
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
              Four steps to <span className="text-gradient-roc">the crown</span>
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
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
              <Radio className="mr-1.5 size-3.5" />
              Live
            </Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">
              Finals that feel like <span className="text-gradient-roc">prime time</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Contest finalists broadcast live with chat and real-time
              reactions, while credit voting decides the winner as everyone
              watches. Followers are notified the moment a show begins.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Artist live sessions and live competitions",
                "Real-time chat and judge commentary",
                "Credit-based live voting with instant tallies",
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
                Go live with VStarz
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="card-spot rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-primary" />
              </span>
              <span className="text-sm font-semibold">LIVE · Finals Night</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3.5" /> 2,184 watching
              </span>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-accent via-card to-background">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow-roc">
                  <Play className="size-6 fill-current" />
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { who: "Lerato", text: "NO WAY that high note 😭" },
                { who: "J4ZZ", text: "10 credits on Nova, let's go" },
                { who: "Sipho", text: "chat, we are witnessing history" },
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

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/50 bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">Voting & membership</Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">
              Credits, crowns &amp; <span className="text-gradient-roc">featured wins</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Voting credits give every supporter a real stake in the outcome.
              VStarz Gold unlocks the full experience for members who mean
              business.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card-spot rounded-3xl p-8">
              <div className="flex items-center gap-2 text-primary">
                <Vote className="size-5" />
                <h3 className="font-display text-xl font-semibold">Voting Credits</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                One credit, one competition vote. Larger packs carry more
                weight for less.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {creditPacks.map((p) => (
                  <div
                    key={p.credits}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2"
                  >
                    <span>{p.credits}</span>
                    <span className="font-mont font-bold text-silver">{p.price}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-spot relative overflow-hidden rounded-3xl border-primary/40 p-8">
              <div className="absolute right-4 top-4">
                <Badge className="badge-gold">Most popular</Badge>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Crown className="size-5" />
                <h3 className="font-display text-xl font-semibold">VStarz Gold</h3>
              </div>
              <p className="mt-3">
                <span className="font-display text-3xl font-bold text-gradient-roc">R79</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {[
                  "Unlimited voting power",
                  "Exclusive Gold-only content",
                  "Early access to competitions",
                  "Monthly bonus voting credits",
                ].map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full font-semibold shadow-glow-roc">
                <Link to="/auth?returnTo=%2Fboost">Go Gold</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-stage-grid opacity-40" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <VStarzLogo className="v-glow mx-auto mb-8 h-16 w-auto sm:h-20" />
          <h2 className="font-display text-4xl font-bold sm:text-5xl">
            Your audience is <span className="text-gradient-roc">waiting</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join the performers and supporters already competing this season.
            Create your free account and post your first audition in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 font-semibold shadow-glow-roc">
              <Link to="/auth?returnTo=%2Fdashboard">Create your account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8">
              <Link to="/auth?returnTo=%2Fcompetitions">Explore the contest</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-border/50 bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">
              <UserRound className="mr-1.5 size-3.5" />
              Contact
            </Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">
              Talk to <span className="text-gradient-roc">the team</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Partnerships, sponsorship and press enquiries reach the
              leadership team behind VStarz™ at Judah Corporation directly.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {contacts.map((c) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4 }}
                className="card-spot rounded-3xl p-8"
              >
                <div className="flex items-center gap-2 text-primary">
                  <UserRound className="size-5" />
                  <h3 className="font-display text-xl font-semibold">{c.name}</h3>
                </div>
                <p className="mt-2 text-sm font-semibold text-silver">{c.role}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Judah Corporation
                </p>
                <div className="mt-5 space-y-2.5 text-sm">
                  {c.emails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary/60"
                    >
                      <Mail className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{email}</span>
                    </a>
                  ))}
                  <a
                    href={`tel:${c.mobile.replace(/\s/g, "")}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary/60"
                  >
                    <Phone className="size-4 shrink-0 text-primary" />
                    <span className="tabular-nums">{c.mobile}</span>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <VStarzLogo className="h-7 w-auto" glow={false} />
          </div>
          <p>
            © 2026 Judah Corporation (Pty) Ltd · VStarz™ · Africa's Digital
            Talent Revolution
          </p>
          <div className="flex gap-5">
            <a
              href="https://www.judahcorporation.co.za"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Judah Corporation
            </a>
            <Link to="/download" className="font-semibold text-primary hover:text-primary/80">
              Get the app
            </Link>
            <a href="#contact" className="hover:text-foreground">Contact</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
