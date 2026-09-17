import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VStarzLogo } from "@/components/VStarzLogo";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";
import {
  Download as DownloadIcon,
  Share2,
  PlusSquare,
  Smartphone,
  Wifi,
  Check,
  Zap,
  Trophy,
  Radio,
  Users,
} from "lucide-react";

type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Download() {
  const { isAuthenticated } = useAuth();
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<"idle" | "prompted" | "done">("idle");

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(detectStandalone());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallState("done");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setInstallState("done");
      else setInstallState("prompted");
    }
  };

  const appUrl = `${window.location.origin}/vstarz`;
  const downloadUrl = `${window.location.origin}/vstarz/download`;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <VStarzLogo className="size-8" glow={false} />
            <div className="leading-none">
              <span className="font-display text-xl font-bold tracking-wide">VStarz</span>
              <span className="block font-mont text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Powered by Roc Nation Africa
              </span>
            </div>
          </Link>
          <Button asChild size="sm" className="font-semibold">
            <Link to={isAuthenticated ? "/dashboard" : "/auth?returnTo=%2Fdashboard"}>
              {isAuthenticated ? "Open app" : "Sign in"}
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-stage-grid opacity-30" />
        <div className="hero-red-haze absolute inset-0" />
        <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div className="text-center lg:text-left">
            <Badge className="mb-4 border border-primary/30 bg-primary/10 text-primary" variant="outline">
              <DownloadIcon className="mr-1.5 size-3.5" />
              Free to download · Free to watch · Free to follow
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
              Get the <span className="text-gradient-roc">VStarz app</span> on your phone
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground max-lg:mx-auto">
              No app store required. Install VStarz directly from this page and carry
              Africa's Digital Talent Revolution in your pocket — auditions, live shows,
              voting and fan clubs, all in one app.
            </p>

            {/* Free tier callouts */}
            <div className="mt-6 grid max-w-md gap-2 max-lg:mx-auto lg:mx-0">
              {[
                { icon: Users, text: "Watch auditions and follow artists — free forever" },
                { icon: Zap, text: "Voting credits from R10 whenever you want to back a star" },
                { icon: Trophy, text: "Enter competitions and track the leaderboard live" },
                { icon: Radio, text: "Never miss a Starz Live show with push notifications" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <f.icon className="size-4" />
                  </span>
                  {f.text}
                </div>
              ))}
            </div>

            {/* Install actions */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row max-lg:mx-auto lg:mx-0">
              {installed ? (
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-glow-roc">
                  <Link to="/dashboard">
                    <Check className="size-5" />
                    App installed — open VStarz
                  </Link>
                </Button>
              ) : platform === "ios" ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Smartphone className="size-4 text-primary" />
                    Install on iPhone — 3 taps
                  </p>
                  <ol className="space-y-1.5 text-sm text-muted-foreground">
                    <li>
                      <span className="font-semibold text-foreground">1.</span> Tap the{" "}
                      <Share2 className="inline size-4 text-primary" /> Share button in Safari
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">2.</span> Choose{" "}
                      <PlusSquare className="inline size-4 text-primary" /> "Add to Home Screen"
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">3.</span> Tap{" "}
                      <span className="font-semibold text-foreground">Add</span> — done
                    </li>
                  </ol>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="h-12 px-8 text-base font-semibold shadow-glow-roc"
                  disabled={!installEvent}
                  onClick={handleInstall}
                >
                  <DownloadIcon className="size-5" />
                  {installEvent
                    ? installState === "done"
                      ? "Installed"
                      : "Install the app — free"
                    : "Open on your phone to install"}
                </Button>
              )}
              {platform !== "ios" && !installed && installEvent && (
                <p className="text-xs text-muted-foreground">
                  Installs directly — no app store, no account needed to start.
                </p>
              )}
            </div>
          </div>

          {/* QR panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mx-auto w-full max-w-sm"
          >
            <Card className="card-spot border-primary/25">
              <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
                <div className="rounded-3xl bg-white p-4 shadow-glow-roc">
                  <QRCodeSVG
                    value={downloadUrl}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">Scan to download</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Point your phone's camera here to open the download page, then install
                    in one tap.
                  </p>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  rocnation.co.za/vstarz
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wifi className="size-3.5 text-primary" />
                  Works on Android, iPhone and desktop
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Android secondary steps */}
      {platform === "android" && !installEvent && !installed && (
        <section className="border-t border-border/50 bg-card/40 py-8">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="font-semibold">One more tap needed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your browser needs you to confirm: open the browser menu{" "}
              <span className="font-semibold text-foreground">⋮</span> and choose{" "}
              <span className="font-semibold text-foreground">"Install app"</span> or{" "}
              <span className="font-semibold text-foreground">"Add to Home screen"</span>.
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-muted-foreground">
          <p>
            VStarz™ — Africa's Digital Talent Revolution · © 2026 Judah Corporation (Pty) Ltd ·
            Powered by Roc Nation Africa
          </p>
          <p className="mt-1">
            The free tier includes watching, following and limited voting. VStarz Gold and
            voting credits are optional in-app purchases.
          </p>
        </div>
      </footer>
    </div>
  );
}
