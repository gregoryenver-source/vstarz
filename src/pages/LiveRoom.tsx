import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Radio,
  Users,
  Send,
  Vote,
  Coins,
  Loader2,
  Circle,
  StopCircle,
  Crown,
} from "lucide-react";
import { Link, useParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

export default function LiveRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const roomId = id as Id<"liveRooms"> | undefined;

  const room = useQuery(api.live.get, roomId ? { id: roomId } : "skip");
  const chat = useQuery(
    api.live.listChat,
    roomId ? { roomId, limit: 60 } : "skip",
  ) ?? [];
  const tally = useQuery(api.live.getLiveTally, roomId ? { roomId } : "skip") ?? {};

  const sendChat = useMutation(api.live.sendChat);
  const castVote = useMutation(api.live.castLiveVote);
  const goLive = useMutation(api.live.goLive);
  const endRoom = useMutation(api.live.end);
  const heartbeat = useMutation(api.live.heartbeat);

  const [message, setMessage] = useState("");
  const [voting, setVoting] = useState<string | null>(null);
  const [busyHost, setBusyHost] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = room && user && room.host?._id === user._id;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  // naive viewer heartbeat
  useEffect(() => {
    if (!roomId || room?.status !== "live" || isHost) return;
    const t = setInterval(() => {
      heartbeat({ roomId }).catch(() => {});
    }, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, room?.status, isHost]);

  if (room === undefined) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }
  if (room === null) {
    return (
      <AppShell>
        <div className="card-spot rounded-3xl py-20 text-center">
          <Radio className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="font-semibold">Room not found</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/live">Back to Live</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const credits = user?.votingCredits ?? 0;
  const live = room.status === "live";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = message.trim();
    if (!body || !roomId) return;
    setMessage("");
    try {
      await sendChat({ roomId, body });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  };

  const handleVote = async (choice: string) => {
    if (!roomId) return;
    setVoting(choice);
    try {
      await castVote({ roomId, choice });
      toast.success(`Vote cast for ${choice}! −2 credits`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(null);
    }
  };

  const handleGoLive = async () => {
    if (!roomId) return;
    setBusyHost(true);
    try {
      await goLive({ id: roomId });
      toast.success("You're live! Followers were notified.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyHost(false);
    }
  };

  const handleEnd = async () => {
    if (!roomId) return;
    setBusyHost(true);
    try {
      await endRoom({ id: roomId });
      toast.success("Room ended. Great show!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyHost(false);
    }
  };

  const tallyEntries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const tallyTotal = tallyEntries.reduce((s, [, n]) => s + n, 0);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Stage */}
        <div className="space-y-4">
          <div className="card-spot overflow-hidden rounded-2xl">
            <div className="relative aspect-video bg-black">
              {live ? (
                <video
                  src={room.streamUrl ?? ""}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <Radio className="size-10 text-muted-foreground" />
                  <p className="font-semibold">
                    {room.status === "scheduled" ? "Not started yet" : "Show ended"}
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {room.status === "scheduled"
                      ? isHost
                        ? "Go live when you're ready — followers get notified instantly."
                        : "Check back at showtime."
                      : "Catch the next show on the Live page."}
                  </p>
                </div>
              )}
              {live && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-rose/90 px-2.5 py-1 text-xs font-bold text-white">
                  <span className="size-1.5 animate-pulse rounded-full bg-white" />
                  LIVE
                </div>
              )}
              {live && (
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                  <Users className="size-3" /> {room.viewerCount}
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold">{room.title}</h1>
                {room.status === "scheduled" && (
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">
                    Scheduled
                  </Badge>
                )}
                {room.status === "ended" && (
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">
                    Ended
                  </Badge>
                )}
              </div>
              {room.description && (
                <p className="text-sm text-muted-foreground">{room.description}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Avatar className="size-7 border border-border/50">
                  <AvatarImage src={room.host?.image} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {(room.host?.name ?? "H")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  Hosted by {room.host?.name ?? room.host?.username ?? "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Live voting */}
          {live && (
            <div className="card-spot rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Vote className="size-5 text-primary" />
                  Live vote
                </h3>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Coins className="size-4 text-primary" /> {credits} credits
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {["A", "B"].map((choice) => {
                  const count = tally[choice] ?? 0;
                  const pct = tallyTotal > 0 ? Math.round((count / tallyTotal) * 100) : 0;
                  return (
                    <div key={choice} className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold">Contestant {choice}</span>
                        <span className="text-sm font-bold text-primary">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-ember to-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="mt-3 w-full font-semibold"
                        disabled={voting === choice || credits < 2}
                        onClick={() => handleVote(choice)}
                      >
                        {voting === choice ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            Vote {choice} · 2 credits
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Every live vote costs 2 credits and updates the tally in real time.
              </p>
            </div>
          )}

          {/* Host controls */}
          {isHost && (
            <div className="card-spot flex flex-wrap items-center gap-3 rounded-2xl p-5">
              <Crown className="size-5 text-primary" />
              <span className="text-sm font-medium">Host controls</span>
              <div className="ml-auto flex gap-2">
                {room.status === "scheduled" && (
                  <Button onClick={handleGoLive} disabled={busyHost} className="font-semibold">
                    {busyHost ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Circle className="mr-2 size-4 fill-rose text-rose" />}
                    Go live
                  </Button>
                )}
                {live && (
                  <Button onClick={handleEnd} disabled={busyHost} variant="destructive">
                    {busyHost ? <Loader2 className="mr-2 size-4 animate-spin" /> : <StopCircle className="mr-2 size-4" />}
                    End show
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="card-spot flex h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-2xl lg:sticky lg:top-24">
          <div className="border-b border-border/60 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-primary" />
              Live chat
            </h3>
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
            {chat.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Say something nice — chat is real time.
              </p>
            )}
            {chat.map((m) => (
              <div key={m._id} className="flex items-start gap-2.5">
                <Avatar className="size-7 border border-border/50">
                  <AvatarImage src={m.userImage} />
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {m.userName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary">
                    {m.userName}
                    {m.userId === room.host?._id && (
                      <Badge className="ml-1.5 border border-primary/40 bg-primary/15 px-1.5 py-0 text-[10px] text-primary">
                        host
                      </Badge>
                    )}
                  </p>
                  <p className={cn("break-words text-sm text-foreground/90")}>{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 border-t border-border/60 p-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={live ? "Say something…" : "Chat opens when live"}
              disabled={!live}
              maxLength={300}
            />
            <Button type="submit" size="icon" disabled={!live || !message.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
