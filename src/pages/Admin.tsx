import { useMutation } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  Trophy,
  Radio,
  DollarSign,
  Check,
  X,
  Star,
  Loader2,
  Ban,
  Video,
  Crown,
  BadgeCheck,
  ScrollText,
  Megaphone,
  Store,
  Plus,
} from "lucide-react";
import { Link, Navigate } from "react-router";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

const zar = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;

export default function Admin() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const stats = useSafeQuery(api.admin.platformStats, isAdmin ? {} : "skip");
  const revenue = useSafeQuery(api.admin.revenue, isAdmin ? {} : "skip");
  const users = useSafeQuery(api.admin.listUsers, isAdmin ? {} : "skip") ?? [];
  const queue = useSafeQuery(api.admin.moderationQueue, isAdmin ? {} : "skip") ?? [];
  const comps = useSafeQuery(api.competitions.list, isAdmin ? {} : "skip") ?? [];

  const setUserRole = useMutation(api.admin.setUserRole);
  const setUserBanned = useMutation(api.admin.setUserBanned);
  const grantCredits = useMutation(api.admin.grantCredits);
  const moderateEntry = useMutation(api.entries.moderate);
  const addFeedback = useMutation(api.entries.addJudgeFeedback);
  const setStatus = useMutation(api.competitions.setStatus);

  const [reviewing, setReviewing] = useState<null | {
    _id: string;
    title: string;
    videoUrl: string;
  }>(null);
  const [score, setScore] = useState("80");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  // ── Growth ops: verification, label, banners, store ──
  const verifications = useSafeQuery(api.network.listVerificationRequests, isAdmin ? {} : "skip") ?? [];
  const labelQueue = useSafeQuery(api.network.listLabelSubmissions, isAdmin ? {} : "skip") ?? [];
  const bannerList = useSafeQuery(api.banners.listAll, isAdmin ? {} : "skip") ?? [];
  const storeProducts = useSafeQuery(api.store.listProducts, isAdmin ? {} : "skip") ?? [];
  const storeEvents = useSafeQuery(api.store.listEvents, isAdmin ? {} : "skip") ?? [];

  const reviewVerification = useMutation(api.network.reviewVerification);
  const reviewLabel = useMutation(api.network.reviewLabelSubmission);
  const createBanner = useMutation(api.banners.create);
  const setBannerActive = useMutation(api.banners.setActive);
  const createProduct = useMutation(api.store.createProduct);
  const setProductActive = useMutation(api.store.setActive);
  const createEvent = useMutation(api.store.createEvent);

  const [vNote, setVNote] = useState("");
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    advertiser: "",
    ctaLabel: "Learn more",
    ctaUrl: "https://",
    placement: "home_hero" as "home_hero" | "home_feed" | "competitions" | "live",
    weight: "10",
  });
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    priceRand: "",
    emoji: "🛍️",
    kind: "merch" as "merch" | "ticket",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    venue: "",
    city: "",
    date: "",
    priceRand: "",
    capacity: "",
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleModerate = async (entryId: string, status: "approved" | "rejected") => {
    setBusy(true);
    try {
      await moderateEntry({ id: entryId as Id<"entries">, status });
      if (status === "approved" && reviewing && score) {
        await addFeedback({
          entryId: entryId as Id<"entries">,
          score: parseInt(score, 10) || 80,
          comment: comment || undefined,
        });
      }
      toast.success(status === "approved" ? "Entry approved" : "Entry rejected");
      setReviewing(null);
      setComment("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const statCards = [
    { label: "Total users", value: stats?.users ?? "—", icon: Users },
    { label: "Competitions", value: stats?.competitions ?? "—", icon: Trophy },
    { label: "Entries", value: stats?.entries ?? "—", icon: Video },
    { label: "Live rooms", value: stats?.liveRooms ?? "—", icon: Radio },
  ];

  return (
    <AppShell>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-glow-roc">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Admin portal</h1>
          <p className="text-sm text-muted-foreground">
            Users, competitions, revenue, and moderation — all in one control room.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card-spot flex items-center gap-4 rounded-2xl p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <s.icon className="size-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="mb-6 flex flex-wrap">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="competitions">Competitions</TabsTrigger>
          <TabsTrigger value="moderation">
            Moderation
            {queue.length > 0 && (
              <Badge className="ml-2 bg-primary/20 text-primary">{queue.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verification">
            Verification
            {verifications.length > 0 && (
              <Badge className="ml-2 bg-primary/20 text-primary">{verifications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="label">
            Label
            {labelQueue.length > 0 && (
              <Badge className="ml-2 bg-primary/20 text-primary">{labelQueue.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
        </TabsList>

        {/* Revenue */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              { label: "Gross revenue", value: zar(revenue?.grossCents ?? 0), icon: DollarSign },
              { label: "Subscriptions", value: revenue?.subs ?? 0, icon: Crown },
              { label: "Credit sales", value: revenue?.creditSalesCount ?? 0, icon: Star },
              { label: "Users", value: revenue?.totalUsers ?? 0, icon: Users },
            ].map((c) => (
              <div key={c.label} className="card-spot rounded-2xl p-5">
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <c.icon className="size-4" />
                </div>
                <p className="font-display text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="card-spot rounded-2xl p-5">
            <h3 className="mb-4 font-display text-lg font-semibold">Revenue by month</h3>
            {(revenue?.monthly?.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No completed payments yet. Revenue appears here after the first sale.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue?.monthly ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.98 0 0 / 8%)" />
                    <XAxis dataKey="month" stroke="oklch(0.72 0 0)" fontSize={12} />
                    <YAxis
                      stroke="oklch(0.72 0 0)"
                      fontSize={12}
                      tickFormatter={(v: number) => `$${Math.round(v / 100)}`}
                    />
                    <ReTooltip
                      formatter={(v: number) => [zar(v), "Revenue"]}
                      contentStyle={{
                        background: "oklch(0.185 0 0)",
                        border: "1px solid oklch(0.98 0 0 / 12%)",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="cents" fill="oklch(0.56 0.243 27.5)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <div className="card-spot divide-y divide-border/50 overflow-hidden rounded-2xl">
            {users.map((u) => (
              <div key={u._id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Avatar className="size-9 border border-border/50">
                  <AvatarImage src={u.image} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {(u.name ?? u.email ?? "U")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {u.name ?? u.username ?? "Unnamed"}
                    {u.isAnonymous && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(guest)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? "no email"}</p>
                </div>
                <Badge variant="outline" className="border-border/60 text-muted-foreground">
                  {u.votingCredits} cr
                </Badge>
                {u.plan && u.plan !== "free" && (
                  <Badge className="border border-primary/40 bg-primary/15 text-primary">
                    Gold
                  </Badge>
                )}
                <Select
                  value={u.role ?? "user"}
                  onValueChange={(role) =>
                    setUserRole({ userId: u._id, role: role as "admin" | "user" | "member" })
                      .then(() => toast.success("Role updated"))
                      .catch((e) => toast.error(e.message))
                  }
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="member">member</SelectItem>
                    <SelectItem value="user">user</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={u.isBanned}
                  onClick={() =>
                    grantCredits({ userId: u._id, credits: 100 })
                      .then(() => toast.success("Granted 100 credits"))
                      .catch((e) => toast.error(e.message))
                  }
                >
                  <Star className="mr-1 size-3.5 text-primary" /> +100
                </Button>
                <Button
                  size="sm"
                  variant={u.isBanned ? "secondary" : "destructive"}
                  onClick={() =>
                    setUserBanned({ userId: u._id, banned: !u.isBanned })
                      .then(() =>
                        toast.success(u.isBanned ? "User unbanned" : "User banned"),
                      )
                      .catch((e) => toast.error(e.message))
                  }
                >
                  {u.isBanned ? "Unban" : <><Ban className="mr-1 size-3.5" /> Ban</>}
                </Button>
              </div>
            ))}
            {users.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No users found.</p>
            )}
          </div>
        </TabsContent>

        {/* Competitions */}
        <TabsContent value="competitions" className="space-y-3">
          {comps.map((c) => (
            <div key={c._id} className="card-spot flex flex-wrap items-center gap-3 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <Link to={`/competitions/${c._id}`} className="truncate font-medium hover:text-primary">
                  {c.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {c.entryCount ?? 0} entries
                </p>
              </div>
              <Select
                value={c.status}
                onValueChange={(status) =>
                  setStatus({
                    id: c._id,
                    status: status as "draft" | "submissions_open" | "voting_open" | "closed",
                  })
                    .then(() => toast.success("Status updated"))
                    .catch((e) => toast.error(e.message))
                }
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="submissions_open">submissions_open</SelectItem>
                  <SelectItem value="voting_open">voting_open</SelectItem>
                  <SelectItem value="closed">closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
          {comps.length === 0 && (
            <div className="card-spot rounded-2xl py-10 text-center text-sm text-muted-foreground">
              No competitions yet.
            </div>
          )}
        </TabsContent>

        {/* Moderation */}
        <TabsContent value="moderation" className="space-y-3">
          {queue.length === 0 ? (
            <div className="card-spot rounded-3xl py-16 text-center">
              <Check className="mx-auto mb-3 size-10 text-emerald-400" />
              <p className="font-semibold">Queue is clear</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New audition submissions will appear here for review.
              </p>
            </div>
          ) : (
            queue.map((e) => (
              <div key={e._id} className="card-spot flex flex-wrap items-center gap-4 rounded-2xl p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    by {e.owner?.name ?? e.owner?.username ?? "Unknown"} · for{" "}
                    {e.competition?.title ?? "competition"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setReviewing(e)}>
                  <Video className="mr-1.5 size-3.5" /> Review
                </Button>
                <Button
                  size="sm"
                  className="font-semibold"
                  disabled={busy}
                  onClick={() => handleModerate(e._id, "approved")}
                >
                  <Check className="mr-1.5 size-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => handleModerate(e._id, "rejected")}
                >
                  <X className="mr-1.5 size-3.5" /> Reject
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        {/* Verification queue */}
        <TabsContent value="verification" className="space-y-3">
          {verifications.length === 0 ? (
            <div className="card-spot rounded-3xl py-16 text-center">
              <BadgeCheck className="mx-auto mb-3 size-10 text-primary" />
              <p className="font-semibold">No pending verifications</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Artist verification requests will appear here for review.
              </p>
            </div>
          ) : (
            verifications.map((r) => (
              <div key={r._id} className="card-spot space-y-3 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {r.stageName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.categorySlug} · requested by {r.user?.name ?? r.user?.email ?? "unknown"}
                      </span>
                    </p>
                    <a
                      href={r.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline"
                    >
                      {r.evidenceUrl}
                    </a>
                  </div>
                  <Button
                    size="sm"
                    className="font-semibold"
                    onClick={() =>
                      reviewVerification({ requestId: r._id, approve: true, note: vNote || undefined })
                        .then(() => toast.success(`${r.stageName} verified`))
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    <Check className="mr-1.5 size-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      reviewVerification({ requestId: r._id, approve: false, note: vNote || undefined })
                        .then(() => toast.success("Request rejected"))
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    <X className="mr-1.5 size-3.5" /> Reject
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{r.statement}</p>
              </div>
            ))
          )}
          {verifications.length > 0 && (
            <Input
              placeholder="Optional review note attached to approve/reject…"
              value={vNote}
              onChange={(e) => setVNote(e.target.value)}
            />
          )}
        </TabsContent>

        {/* Label submissions */}
        <TabsContent value="label" className="space-y-3">
          {labelQueue.length === 0 ? (
            <div className="card-spot rounded-3xl py-16 text-center">
              <ScrollText className="mx-auto mb-3 size-10 text-primary" />
              <p className="font-semibold">No submissions waiting</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Digital record label submissions from artists appear here.
              </p>
            </div>
          ) : (
            labelQueue.map((s) => (
              <div key={s._id} className="card-spot space-y-3 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {s.artistName}
                      <span className="ml-2 text-xs text-muted-foreground">{s.categorySlug}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{s.links}</p>
                  </div>
                  <Select
                    onValueChange={(status) =>
                      reviewLabel({
                        submissionId: s._id,
                        status: status as "in_review" | "signed" | "declined",
                      })
                        .then(() => toast.success("Submission updated"))
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder="Move to…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_review">In review</SelectItem>
                      <SelectItem value="signed">Signed</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">{s.pitch}</p>
              </div>
            ))
          )}
        </TabsContent>

        {/* Digital real estate — banners */}
        <TabsContent value="banners" className="space-y-6">
          <div className="space-y-3">
            {bannerList.map((b) => (
              <div key={b._id} className="card-spot flex flex-wrap items-center gap-3 rounded-2xl p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.advertiser} · {b.placement} · weight {b.weight} · {b.impressions} impressions ·{" "}
                    {b.clicks} clicks
                  </p>
                </div>
                <Badge variant="outline" className={b.active ? "border-primary/40 text-primary" : "text-muted-foreground"}>
                  {b.active ? "live" : "paused"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setBannerActive({ bannerId: b._id, active: !b.active })
                      .then(() => toast.success(b.active ? "Banner paused" : "Banner live"))
                      .catch((e) => toast.error(e.message))
                  }
                >
                  {b.active ? "Pause" : "Activate"}
                </Button>
              </div>
            ))}
            {bannerList.length === 0 && (
              <p className="card-spot rounded-2xl py-10 text-center text-sm text-muted-foreground">
                No banners yet — sell the first digital real estate slot below.
              </p>
            )}
          </div>

          <div className="card-spot space-y-3 rounded-2xl p-4">
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              <Megaphone className="size-4 text-primary" /> New brand takeover
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Headline — e.g. Your brand on the V"
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
              />
              <Input
                placeholder="Advertiser name"
                value={bannerForm.advertiser}
                onChange={(e) => setBannerForm({ ...bannerForm, advertiser: e.target.value })}
              />
              <Input
                placeholder="Subtitle / offer line"
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                className="sm:col-span-2"
              />
              <Input
                placeholder="CTA label"
                value={bannerForm.ctaLabel}
                onChange={(e) => setBannerForm({ ...bannerForm, ctaLabel: e.target.value })}
              />
              <Input
                placeholder="CTA URL or /route"
                value={bannerForm.ctaUrl}
                onChange={(e) => setBannerForm({ ...bannerForm, ctaUrl: e.target.value })}
              />
              <Select
                value={bannerForm.placement}
                onValueChange={(v) => setBannerForm({ ...bannerForm, placement: v as typeof bannerForm.placement })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_hero">Home — hero takeover</SelectItem>
                  <SelectItem value="home_feed">Home — feed slot</SelectItem>
                  <SelectItem value="competitions">Competitions page</SelectItem>
                  <SelectItem value="live">Live page</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Weight (higher wins)"
                inputMode="numeric"
                value={bannerForm.weight}
                onChange={(e) => setBannerForm({ ...bannerForm, weight: e.target.value })}
              />
            </div>
            <Button
              className="font-semibold"
              onClick={() => {
                if (!bannerForm.title || !bannerForm.advertiser || !bannerForm.subtitle) {
                  toast.error("Headline, advertiser and subtitle are required");
                  return;
                }
                createBanner({
                  ...bannerForm,
                  weight: parseInt(bannerForm.weight, 10) || 10,
                })
                  .then(() => {
                    toast.success("Banner is live");
                    setBannerForm({ ...bannerForm, title: "", subtitle: "", advertiser: "" });
                  })
                  .catch((e) => toast.error(e.message));
              }}
            >
              <Plus className="mr-1.5 size-4" /> Launch banner
            </Button>
          </div>
        </TabsContent>

        {/* Store management */}
        <TabsContent value="store" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card-spot space-y-3 rounded-2xl p-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Store className="size-4 text-primary" /> New product
              </p>
              <Input
                placeholder="Product name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Price (R)"
                  inputMode="numeric"
                  value={productForm.priceRand}
                  onChange={(e) => setProductForm({ ...productForm, priceRand: e.target.value })}
                />
                <Input
                  placeholder="Emoji"
                  value={productForm.emoji}
                  onChange={(e) => setProductForm({ ...productForm, emoji: e.target.value })}
                />
                <Select
                  value={productForm.kind}
                  onValueChange={(v) => setProductForm({ ...productForm, kind: v as "merch" | "ticket" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merch">Merch</SelectItem>
                    <SelectItem value="ticket">Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full font-semibold"
                onClick={() => {
                  const cents = Math.round(parseFloat(productForm.priceRand) * 100);
                  if (!productForm.name || !productForm.description || !Number.isFinite(cents) || cents <= 0) {
                    toast.error("Name, description and a valid price are required");
                    return;
                  }
                  createProduct({
                    name: productForm.name,
                    description: productForm.description,
                    priceCents: cents,
                    emoji: productForm.emoji || undefined,
                    kind: productForm.kind,
                  })
                    .then(() => {
                      toast.success("Product added to the store");
                      setProductForm({ ...productForm, name: "", description: "", priceRand: "" });
                    })
                    .catch((e) => toast.error(e.message));
                }}
              >
                <Plus className="mr-1.5 size-4" /> Add product
              </Button>
            </div>

            <div className="card-spot space-y-3 rounded-2xl p-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Radio className="size-4 text-primary" /> New event
              </p>
              <Input
                placeholder="Event title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Venue"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                />
                <Input
                  placeholder="City"
                  value={eventForm.city}
                  onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })}
                />
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                />
                <Input
                  placeholder="Capacity"
                  inputMode="numeric"
                  value={eventForm.capacity}
                  onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
                />
                <Input
                  placeholder="Ticket price (R)"
                  inputMode="numeric"
                  value={eventForm.priceRand}
                  onChange={(e) => setEventForm({ ...eventForm, priceRand: e.target.value })}
                  className="col-span-2"
                />
              </div>
              <Button
                className="w-full font-semibold"
                onClick={() => {
                  const cents = Math.round(parseFloat(eventForm.priceRand) * 100);
                  const capacity = parseInt(eventForm.capacity, 10);
                  const startsAt = eventForm.date ? new Date(eventForm.date).getTime() : NaN;
                  if (
                    !eventForm.title ||
                    !eventForm.description ||
                    !eventForm.venue ||
                    !eventForm.city ||
                    !Number.isFinite(cents) || cents <= 0 ||
                    !Number.isFinite(capacity) || capacity <= 0 ||
                    !Number.isFinite(startsAt)
                  ) {
                    toast.error("All fields with a valid price, capacity and date are required");
                    return;
                  }
                  createEvent({
                    title: eventForm.title,
                    description: eventForm.description,
                    venue: eventForm.venue,
                    city: eventForm.city,
                    startsAt,
                    priceCents: cents,
                    capacity,
                  })
                    .then(() => {
                      toast.success("Event published with ticket sales live");
                      setEventForm({ ...eventForm, title: "", description: "", venue: "", city: "", date: "", priceRand: "", capacity: "" });
                    })
                    .catch((e) => toast.error(e.message));
                }}
              >
                <Plus className="mr-1.5 size-4" /> Publish event
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-mont text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Catalog · {storeProducts.length} products · {storeEvents.length} upcoming events
            </p>
            {storeProducts.map((p) => (
              <div key={p._id} className="card-spot flex items-center gap-3 rounded-2xl p-3">
                <span className="text-xl">{p.emoji ?? "🛍️"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{zar(p.priceCents)} · {p.kind}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setProductActive({ productId: p._id, active: !p.active })
                      .then(() => toast.success(p.active ? "Delisted" : "Listed"))
                      .catch((e) => toast.error(e.message))
                  }
                >
                  {p.active ? "Delist" : "List"}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review dialog */}
      <Dialog open={reviewing !== null} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent className="card-spot sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Review audition</DialogTitle>
            <DialogDescription>{reviewing?.title}</DialogDescription>
          </DialogHeader>
          {reviewing && (
            <video
              src={reviewing.videoUrl}
              controls
              className="w-full rounded-xl border border-border/50"
            />
          )}
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="score">Score</Label>
              <Input id="score" value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Judge feedback</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Constructive feedback sent to the performer…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Close</Button>
            <Button
              className="font-semibold"
              disabled={busy}
              onClick={() => reviewing && handleModerate(reviewing._id, "approved")}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              Approve with feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
