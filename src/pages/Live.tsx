import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Radio, Users, Plus, Loader2, CalendarClock } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";

export default function Live() {
  const { user } = useAuth();
  const rooms = useQuery(api.live.listLive, {}) ?? { live: [], scheduled: [] };
  const createRoom = useMutation(api.live.create);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const canHost = user?.isTalent || user?.role === "admin";

  const handleCreate = async () => {
    setBusy(true);
    try {
      const id = await createRoom({ title, description: desc || undefined });
      toast.success("Room created! Open it to go live.");
      setOpen(false);
      setTitle("");
      setDesc("");
      window.location.href = `/live/${id}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold">Live shows</h1>
          <p className="mt-1 text-muted-foreground">
            Real-time performances, chat, and live voting — happening now.
          </p>
        </div>
        {canHost && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="font-semibold">
                <Plus className="size-4" />
                Create live room
              </Button>
            </DialogTrigger>
            <DialogContent className="card-spot">
              <DialogHeader>
                <DialogTitle className="font-display">New live room</DialogTitle>
                <DialogDescription>
                  Set it up now, go live when you're ready.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lr-title">Title</Label>
                  <Input
                    id="lr-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Finals watch party + live votes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lr-desc">Description (optional)</Label>
                  <Textarea
                    id="lr-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={2}
                    placeholder="What's the show about?"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!title.trim() || busy} className="font-semibold">
                  {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Create room
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
        <span className="relative flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-primary" />
        </span>
        On air now
      </h2>
      {rooms.live.length === 0 ? (
        <div className="card-spot mb-10 rounded-3xl py-14 text-center">
          <Radio className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="font-semibold">No shows are on air right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow performers and you'll be notified the moment they go live.
          </p>
        </div>
      ) : (
        <div className="mb-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.live.map((r) => (
            <Link key={r._id} to={`/live/${r._id}`} className="group block">
              <div className="card-spot overflow-hidden rounded-2xl transition-transform group-hover:-translate-y-1">
                <div className="relative aspect-video bg-gradient-to-br from-accent/70 via-card to-background">
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-bold text-white">
                    <span className="size-1.5 animate-pulse rounded-full bg-white" />
                    LIVE
                  </div>
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                    <Users className="size-3" /> {r.viewerCount}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground transition-transform group-hover:scale-110">
                      <Radio className="size-5" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Hosted by {r.host?.name ?? r.host?.username ?? "Unknown"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {rooms.scheduled.length > 0 && (
        <>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
            <CalendarClock className="size-5 text-primary" />
            Scheduled
          </h2>
          <div className="space-y-3">
            {rooms.scheduled.map((r) => (
              <Link
                key={r._id}
                to={`/live/${r._id}`}
                className="card-spot flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Radio className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.scheduledAt
                      ? `Starts ${new Date(r.scheduledAt).toLocaleString()}`
                      : "Start time TBA"}
                  </p>
                </div>
                <Badge variant="outline" className="border-border/60 text-muted-foreground">
                  Upcoming
                </Badge>
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
