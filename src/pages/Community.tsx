import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OAuthButtons } from "@/components/OAuthButtons";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Heart,
  MessageCircle,
  Loader2,
  Users,
  Trash2,
  Send,
  Sparkles,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

type Audience = "creator" | "voter" | "public";

const AUDIENCES: { id: Audience | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "creator", label: "Creators" },
  { id: "voter", label: "Voters" },
  { id: "public", label: "Public" },
];

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function MetaBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#0064e1]/40 bg-[#0064e1]/10 px-4 py-1.5">
      <img
        src={`${import.meta.env.BASE_URL}meta-logo.svg`}
        alt="Meta"
        className="h-4 w-auto"
      />
      <span className="font-mont text-[10px] font-bold uppercase tracking-[0.22em] text-[#0082fb]">
        Brought to you exclusively by Meta
      </span>
    </div>
  );
}

export default function Community() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const feed = useQuery(api.community.listFeed, {}) ?? [];
  const stats = useQuery(api.community.stats, {}) ?? {
    posts: 0,
    members: 0,
    comments: 0,
  };
  const createPost = useMutation(api.community.createPost);
  const toggleLike = useMutation(api.community.toggleLike);
  const removePost = useMutation(api.community.removePost);

  const [tab, setTab] = useState<Audience | "all">("all");
  const [draft, setDraft] = useState("");
  const [audience, setAudience] = useState<Audience>("public");
  const [busy, setBusy] = useState(false);
  const [openComments, setOpenComments] = useState<Id<"communityPosts"> | null>(
    null,
  );

  const posts = useMemo(
    () => (tab === "all" ? feed : feed.filter((p) => p.audience === tab)),
    [feed, tab],
  );

  const handlePost = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      await createPost({ body, audience });
      setDraft("");
      toast.success("Posted to the community");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post");
    } finally {
      setBusy(false);
    }
  };

  const handleLike = async (postId: Id<"communityPosts">) => {
    try {
      await toggleLike({ postId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not react");
    }
  };

  // ── Connection gate ─────────────────────────────────────────────────
  if (!isLoading && !isAuthenticated) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <img
            src={`${import.meta.env.BASE_URL}meta-logo.svg`}
            alt="Meta"
            className="mx-auto mb-6 h-10 w-auto"
          />
          <h1 className="font-display text-3xl font-bold">
            The VStarz Community
          </h1>
          <p className="mt-3 text-muted-foreground">
            A social space for Creators, Voters and the Public — connect your
            vStarz, Facebook or Instagram account to post, like and comment.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <OAuthButtons stacked redirectTo="/community" />
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth?returnTo=%2Fcommunity">
                Connect with vStarz (mobile or email)
              </Link>
            </Button>
          </div>
          <MetaBadge />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#0064e1]/15">
              <Users className="size-6 text-[#0082fb]" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">Community</h1>
              <p className="text-sm text-muted-foreground">
                Creators · Voters · The Public — one stage, every voice.
              </p>
            </div>
          </div>
          <MetaBadge />
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3 sm:max-w-md">
          {[
            { label: "Members", value: stats.members, icon: Users },
            { label: "Posts", value: stats.posts, icon: Sparkles },
            { label: "Replies", value: stats.comments, icon: MessageCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card-spot rounded-xl px-3 py-2.5">
              <Icon className="size-4 text-[#0082fb]" />
              <p className="mt-1 font-display text-xl font-bold">{value}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Composer + feed */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {/* Composer */}
          <div className="card-spot rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Avatar className="size-9 border border-border/50">
                <AvatarImage src={user?.image} />
                <AvatarFallback className="bg-secondary text-xs">
                  {(user?.name ?? user?.username ?? "You")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Share something with the ${
                    audience === "public"
                      ? "world"
                      : `${audience} community`
                  }…`}
                  rows={3}
                  maxLength={1000}
                  className="resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1">
                    {AUDIENCES.filter((a) => a.id !== "all").map((a) => (
                      <Button
                        key={a.id}
                        type="button"
                        size="sm"
                        variant={audience === a.id ? "default" : "ghost"}
                        className="h-7 px-3 text-xs"
                        onClick={() => setAudience(a.id as Audience)}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {draft.length}/1000
                    </span>
                    <Button
                      size="sm"
                      onClick={() => void handlePost()}
                      disabled={busy || !draft.trim()}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audience filter */}
          <div className="flex gap-1.5">
            {AUDIENCES.map((a) => (
              <Button
                key={a.id}
                size="sm"
                variant={tab === a.id ? "secondary" : "ghost"}
                className="h-8 rounded-full px-4 text-xs"
                onClick={() => setTab(a.id)}
              >
                {a.label}
              </Button>
            ))}
          </div>

          {/* Feed */}
          {posts.length === 0 ? (
            <div className="card-spot rounded-2xl p-10 text-center">
              <InfinityIcon className="mx-auto size-8 text-[#0082fb]" />
              <p className="mt-3 font-display text-lg font-bold">
                No posts here yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to start the conversation.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post._id} className="card-spot rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 border border-border/50">
                      <AvatarImage src={post.authorImage} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {post.authorName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">
                        {post.authorName}
                        <span className="ml-2 font-normal text-muted-foreground">
                          · {timeAgo(post.createdAt)}
                        </span>
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-0.5 h-4 px-1.5 text-[9px] uppercase tracking-wider text-muted-foreground"
                      >
                        {post.audience}
                      </Badge>
                    </div>
                  </div>
                  {user?._id === post.authorId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      aria-label="Delete post"
                      onClick={() => {
                        void removePost({ postId: post._id }).catch((err) =>
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Could not delete",
                          ),
                        );
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {post.body}
                </p>
                <div className="mt-3 flex items-center gap-1 border-t border-border/40 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground hover:text-[#0082fb]"
                    onClick={() => void handleLike(post._id)}
                  >
                    <Heart className="size-4" />
                    {post.likeCount > 0 ? post.likeCount : "Like"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => setOpenComments(post._id)}
                  >
                    <MessageCircle className="size-4" />
                    {post.commentCount > 0 ? post.commentCount : "Comment"}
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="card-spot rounded-2xl p-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider">
              House rules
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>· Celebrate talent — no hate speech or harassment.</li>
              <li>· No spam, scams or impersonation.</li>
              <li>· Share your journey; lift others up.</li>
              <li>· Moderation is active. Violations are removed.</li>
            </ul>
          </div>
          <div className="card-spot rounded-2xl p-4 text-center">
            <img
              src={`${import.meta.env.BASE_URL}meta-logo.svg`}
              alt="Meta"
              className="mx-auto h-6 w-auto"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              The VStarz Community is brought to you exclusively by Meta —
              connecting Creators, Voters and the Public across Facebook,
              Instagram and vStarz.
            </p>
          </div>
        </aside>
      </div>

      {/* Comments dialog */}
      {openComments && (
        <CommunityComments
          postId={openComments}
          onClose={() => setOpenComments(null)}
        />
      )}
    </AppShell>
  );
}

function CommunityComments({
  postId,
  onClose,
}: {
  postId: Id<"communityPosts">;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const comments = useQuery(api.community.listComments, { postId }) ?? [];
  const addComment = useMutation(api.community.addComment);
  const removeComment = useMutation(api.community.removeComment);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await addComment({ postId, body: text });
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="card-spot flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Conversation
          </DialogTitle>
          <DialogDescription>Replies update in real time.</DialogDescription>
        </DialogHeader>
        <div className="min-h-32 flex-1 space-y-3 overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No replies yet. Start the conversation.
            </p>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="flex items-start gap-2.5">
                <Avatar className="size-7 border border-border/50">
                  <AvatarImage src={c.authorImage} />
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {c.authorName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-xl bg-secondary/60 px-3 py-2">
                  <p className="text-xs font-semibold">
                    {c.authorName}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {timeAgo(c.createdAt)}
                    </span>
                  </p>
                  <p className="mt-0.5 break-words text-sm">{c.body}</p>
                </div>
                {user?._id === c.userId && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    aria-label="Delete reply"
                    onClick={() => {
                      void removeComment({ commentId: c._id }).catch(() => {});
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleAdd} className="flex gap-2 border-t border-border/40 pt-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a reply…"
            rows={1}
            maxLength={500}
            className="min-h-9 resize-none py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleAdd(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={sending || !body.trim()}>
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
