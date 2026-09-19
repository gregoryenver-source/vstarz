import { useMutation } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export function EntryComments({ entryId, entryTitle }: { entryId: Id<"entries">; entryTitle: string }) {
  const { user } = useAuth();
  const comments = useSafeQuery(api.comments.listForEntry, { entryId, limit: 40 }) ?? [];
  const addComment = useMutation(api.comments.add);
  const removeComment = useMutation(api.comments.remove);

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length, open]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await addComment({ entryId, body: text });
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="size-4" />
        {comments.length > 0 ? comments.length : "Comment"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="card-spot flex max-h-[85vh] flex-col sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{entryTitle}</DialogTitle>
            <DialogDescription>Comments update in real time.</DialogDescription>
          </DialogHeader>

          <div className="min-h-32 flex-1 space-y-3 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No comments yet. Be the first to congratulate this performer.
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-primary">{c.authorName}</p>
                      {c.userId === user?._id && (
                        <button
                          onClick={() =>
                            removeComment({ commentId: c._id }).catch((err) =>
                              toast.error(err instanceof Error ? err.message : "Failed"),
                            )
                          }
                          className="text-muted-foreground/60 transition-colors hover:text-destructive"
                          title="Delete comment"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                    <p className="break-words text-sm text-foreground/90">{c.body}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={listEndRef} />
          </div>

          <form onSubmit={handleAdd} className="flex gap-2 border-t border-border/60 pt-3">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a comment…"
              maxLength={500}
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={!body.trim() || sending}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
