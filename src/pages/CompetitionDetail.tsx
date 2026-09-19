import { useMutation } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntryComments } from "@/components/EntryComments";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Trophy,
  Vote,
  Play,
  Crown,
  Coins,
  Loader2,
  Upload,
  Medal,
  Clock,
} from "lucide-react";
import { Link, useParams } from "react-router";
import { useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

const statusMeta: Record<string, { label: string; className: string }> = {
  submissions_open: { label: "Auditions open", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  voting_open: { label: "Voting open", className: "bg-primary/15 text-primary border-primary/30" },
  closed: { label: "Ended", className: "bg-secondary text-muted-foreground" },
  draft: { label: "Draft", className: "bg-secondary text-muted-foreground" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const compId = id as Id<"competitions"> | undefined;

  const comp = useSafeQuery(api.competitions.get, compId ? { id: compId } : "skip");
  const entries = useSafeQuery(api.entries.listByCompetition, compId ? { competitionId: compId } : "skip") ?? [];
  const myVotes = useSafeQuery(api.voting.getMyVotes, compId ? { competitionId: compId } : "skip") ?? [];

  const vote = useMutation(api.voting.vote);
  const generateUpload = useMutation(api.entries.generateVideoUploadUrl);
  const createEntry = useMutation(api.entries.create);

  const [votingId, setVotingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [videoMeta, setVideoMeta] = useState<{ storageId: string; url: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  if (comp === undefined) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }
  if (comp === null) {
    return (
      <AppShell>
        <div className="card-spot rounded-3xl py-20 text-center">
          <Trophy className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="text-lg font-semibold">Competition not found</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/competitions">Back to competitions</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const credits = user?.votingCredits ?? 0;
  const votesAllowed = comp.status === "voting_open";
  const submissionsAllowed = comp.status === "submissions_open";
  const alreadySubmitted = entries.some((e) => e.user?._id === user?._id);
  const maxVotes = Math.max(...entries.map((e) => e.voteCount), 1);

  const handleVote = async (entryId: string) => {
    setVotingId(entryId);
    try {
      const res = await vote({ entryId: entryId as Id<"entries"> });
      toast.success(`Vote cast! ${res.creditsLeft} credits left.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVotingId(null);
    }
  };

  const handleFile = async (file: File) => {
    if (!compId) return;
    // Sanity checks so users get clear feedback instead of a cryptic error.
    const MAX_BYTES = 100 * 1024 * 1024; // 100 MB — plenty for a 2-5 min clip
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file (mp4, mov, webm…)");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Video is too large. Please keep it under 100 MB.");
      return;
    }
    setUploading(true);
    setProgress(10);
    try {
      const uploadUrl = await generateUpload({});
      setProgress(30);
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error("Video upload failed");
      const { storageId } = (await res.json()) as { storageId: string };
      setProgress(100);
      // Local preview via object URL — the real playback URL is resolved
      // server-side from the storageId, so nothing huge is stored in the DB.
      const preview = URL.createObjectURL(file);
      setVideoMeta({ storageId, url: preview });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!compId || !videoMeta) return;
    try {
      // The server resolves the playable URL from videoStorageId — never send
      // video bytes or data URLs through the mutation (they exceed the 1MB
      // document limit and cause the upload error).
      await createEntry({
        competitionId: compId,
        title,
        description: desc || undefined,
        videoStorageId: videoMeta.storageId as never,
      });
      toast.success("Audition submitted! It will appear once approved.");
      setSubmitOpen(false);
      setTitle("");
      setDesc("");
      if (videoMeta.url.startsWith("blob:")) URL.revokeObjectURL(videoMeta.url);
      setVideoMeta(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    }
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="card-spot mb-8 rounded-3xl p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={statusMeta[comp.status]?.className}>
            {statusMeta[comp.status]?.label ?? comp.status}
          </Badge>
          {comp.categorySlug && (
            <span className="text-xs capitalize text-muted-foreground">
              {comp.categorySlug}
            </span>
          )}
          {comp.endsAt && comp.status !== "closed" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {new Date(comp.endsAt).toLocaleDateString()} finale
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{comp.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{comp.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Upload className="size-4" /> {fmt(entries.length)} entries
          </span>
          {comp.prize && (
            <span className="flex items-center gap-1.5">
              <Crown className="size-4 text-primary" /> {comp.prize}
            </span>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SocialShareButtons
            compact
            path={`/competitions/${comp._id}`}
            title={comp.title}
            subtitle={comp.prize ? `Prize: ${comp.prize}` : "Join the contest on VStarz"}
          />
          {submissionsAllowed && !alreadySubmitted && (
            <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold shadow-glow-roc">
                  <Upload className="size-4" />
                  Submit your audition
                </Button>
              </DialogTrigger>
              <DialogContent className="card-spot sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-display">Submit audition</DialogTitle>
                  <DialogDescription>
                    Upload a video (up to ~2 min). It goes live after a quick
                    review.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry-title">Title</Label>
                    <Input
                      id="entry-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. My golden buzzer moment"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry-desc">Description (optional)</Label>
                    <Textarea
                      id="entry-desc"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="Tell fans what to expect…"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Audition video</Label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                    {videoMeta ? (
                      <video src={videoMeta.url} controls className="w-full rounded-xl border border-border/50" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 bg-secondary/30 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="size-5 animate-spin text-primary" />
                            Uploading… {progress}%
                          </>
                        ) : (
                          <>
                            <Upload className="size-5 text-primary" />
                            Click to choose a video
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleSubmit}
                    disabled={!title.trim() || !videoMeta || uploading}
                    className="font-semibold"
                  >
                    Submit audition
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {submissionsAllowed && alreadySubmitted && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400">
              <Upload className="mr-1.5 size-3.5" /> Your audition is in
            </Badge>
          )}
          {votesAllowed && (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">
              <Vote className="mr-1.5 size-3.5" /> You have {fmt(credits)} credits
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="entries">
        <TabsList className="mb-6">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-6">
          {entries.length === 0 ? (
            <div className="card-spot rounded-3xl py-16 text-center">
              <Video_Icon className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                No approved entries yet. Be the first on stage!
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {entries.map((e) => {
                const voted = myVotes.includes(e._id);
                return (
                  <div key={e._id} className="card-spot overflow-hidden rounded-2xl">
                    <div className="relative aspect-video bg-black/40">
                      <video
                        src={e.videoUrl}
                        controls
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <p className="font-semibold">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          by {e.user?.name ?? e.user?.username ?? "Unknown"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                          <Vote className="size-4" /> {fmt(e.voteCount)}
                        </span>
                        {votesAllowed && (
                          <Button
                            size="sm"
                            disabled={voted || votingId === e._id || credits < 1}
                            onClick={() => handleVote(e._id)}
                            className="font-semibold"
                          >
                            {votingId === e._id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : voted ? (
                              "Voted ✓"
                            ) : (
                              <>
                                <Coins className="size-4" /> Vote · 1 credit
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-border/50 pt-2">
                        <EntryComments entryId={e._id} entryTitle={e.title} />
                      </div>
                      {votesAllowed && maxVotes > 0 && (
                        <Progress value={(e.voteCount / maxVotes) * 100} className="h-1.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard">
          <div className="card-spot overflow-hidden rounded-2xl">
            <div className="border-b border-border/60 px-5 py-4">
              <h3 className="font-display text-lg font-semibold">Leaderboard</h3>
            </div>
            {entries.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                The board fills up as entries are approved.
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {entries.map((e, i) => (
                  <div key={e._id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="w-7 text-center font-display text-lg font-bold text-primary/70">
                      {i + 1}
                    </span>
                    <Avatar className="size-9 border border-border/50">
                      <AvatarImage src={e.user?.image} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {(e.user?.name ?? "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.user?.name ?? e.user?.username}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <Vote className="size-3.5" /> {fmt(e.voteCount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results">
          {comp.status !== "closed" ? (
            <div className="card-spot rounded-3xl py-16 text-center">
              <Clock className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-semibold">Results drop when the competition ends</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep voting — the top 3 get notified the moment it closes.
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="card-spot rounded-3xl py-16 text-center text-muted-foreground">
              No results to show.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {entries.slice(0, 3).map((e, i) => (
                <div
                  key={e._id}
                  className={`card-spot rounded-2xl p-6 text-center ${i === 0 ? "border-primary/50 shadow-glow-roc" : ""}`}
                >
                  <Medal className={`mx-auto mb-3 size-8 ${["text-primary", "text-muted-foreground", "text-amber-700"][i]}`} />
                  <p className="font-display text-lg font-bold">#{i + 1}</p>
                  <p className="mt-1 font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.user?.name ?? e.user?.username}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">
                    {fmt(e.voteCount)} votes
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Video_Icon(props: React.ComponentProps<typeof Play>) {
  return <Play {...props} />;
}
