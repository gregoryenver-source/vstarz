import { useQuery, useMutation } from "convex/react";
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
} from "lucide-react";
import { Link, Navigate } from "react-router";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

const zar = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Admin() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const stats = useQuery(api.admin.platformStats, isAdmin ? {} : "skip");
  const revenue = useQuery(api.admin.revenue, isAdmin ? {} : "skip");
  const users = useQuery(api.admin.listUsers, isAdmin ? {} : "skip") ?? [];
  const queue = useQuery(api.admin.moderationQueue, isAdmin ? {} : "skip") ?? [];
  const comps = useQuery(api.competitions.list, isAdmin ? {} : "skip") ?? [];

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
        <TabsList className="mb-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="competitions">Competitions</TabsTrigger>
          <TabsTrigger value="moderation">
            Moderation
            {queue.length > 0 && (
              <Badge className="ml-2 bg-primary/20 text-primary">{queue.length}</Badge>
            )}
          </TabsTrigger>
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
