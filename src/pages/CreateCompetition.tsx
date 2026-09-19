import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSafeQuery } from "@/lib/safe-query";
import { toast } from "sonner";
import { Trophy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

const D = 24 * 60 * 60 * 1000;

export default function CreateCompetition() {
  const navigate = useNavigate();
  const categories = useSafeQuery(api.profiles.getCategories, {}) ?? [];
  const create = useMutation(api.competitions.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("other");
  const [prize, setPrize] = useState("");
  const [durationDays, setDurationDays] = useState("14");
  const [startNow, setStartNow] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const now = Date.now();
      const days = parseInt(durationDays, 10) || 14;
      const id = await create({
        title,
        description,
        categorySlug,
        prize: prize || undefined,
        submissionsOpenAt: startNow ? now : undefined,
        endsAt: startNow ? now + days * D : undefined,
        startNow,
      });
      toast.success("Competition created!");
      navigate(`/competitions/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold">Host a competition</h1>
        <p className="mt-1 text-muted-foreground">
          Create the stage, set the prize, and open auditions. Every contest
          blends 40% public voting with 60% judge scoring.
        </p>

        <Card className="card-spot mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Trophy className="size-5 text-primary" />
              Competition details
            </CardTitle>
            <CardDescription>
              You can move it between auditions → voting → results at any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="c-title">Title</Label>
                <Input
                  id="c-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Rising Starz: Season 2 — Gospel Edition"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-desc">Description</Label>
                <Textarea
                  id="c-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you looking for? Rules, rounds, judging…"
                  rows={4}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categorySlug} onValueChange={setCategorySlug}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c._id} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-prize">Prize (optional)</Label>
                  <Input
                    id="c-prize"
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    placeholder="e.g. Featured showcase + credits"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Runs for</Label>
                  <Select value={durationDays} onValueChange={setDurationDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["7", "14", "21", "30"].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <Switch id="start-now" checked={startNow} onCheckedChange={setStartNow} />
                  <Label htmlFor="start-now" className="text-sm text-muted-foreground">
                    Open auditions immediately
                  </Label>
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full font-semibold">
                {busy ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create competition"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
