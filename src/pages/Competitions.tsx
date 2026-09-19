import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Trophy, ChevronRight, Users, Video } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";

const statusMeta: Record<string, { label: string; className: string }> = {
  submissions_open: { label: "Auditions open", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  voting_open: { label: "Voting open", className: "bg-primary/15 text-primary border-primary/30" },
  closed: { label: "Ended", className: "bg-secondary text-muted-foreground" },
  draft: { label: "Draft", className: "bg-secondary text-muted-foreground" },
};

type Filter = "all" | "submissions_open" | "voting_open" | "closed";

export default function Competitions() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const comps = useSafeQuery(api.competitions.list, {}) ?? [];

  const q = search.trim().toLowerCase();
  const filtered = comps.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.categorySlug ?? "").toLowerCase().includes(q) ||
      (c.prize ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold">Contest catalog</h1>
          <p className="mt-1 text-muted-foreground">
            Browse every contest, audition for the ones that fit, and back the
            performers you believe in.
          </p>
        </div>
        <Button asChild className="font-semibold">
          <Link to="/competitions/new">
            <Trophy className="size-4" />
            Host a contest
          </Link>
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the catalog — title, category, or prize…"
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="submissions_open">Auditions open</TabsTrigger>
            <TabsTrigger value="voting_open">Voting open</TabsTrigger>
            <TabsTrigger value="closed">Ended</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="card-spot rounded-3xl py-16 text-center">
          <Trophy className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            {search.trim()
              ? `No competitions match "${search.trim()}". Try a different search.`
              : "No competitions in this tab yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, i) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
            >
              <Link to={`/competitions/${c._id}`} className="group block h-full">
                <div className="card-spot flex h-full flex-col rounded-2xl p-5 transition-transform group-hover:-translate-y-1">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="outline" className={statusMeta[c.status]?.className}>
                      {statusMeta[c.status]?.label ?? c.status}
                    </Badge>
                    {c.categorySlug && (
                      <span className="text-xs capitalize text-muted-foreground">
                        {c.categorySlug}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-semibold">{c.title}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
                    {c.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      {c.entryCount ?? 0} entries
                    </span>
                    {c.prize && (
                      <span className="flex min-w-0 items-center gap-1 truncate">
                        <Trophy className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{c.prize}</span>
                      </span>
                    )}
                    <ChevronRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-10 card-spot rounded-2xl p-6 flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Video className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Ready to take the stage?</p>
          <p className="text-sm text-muted-foreground">
            Post your audition video to any contest currently accepting
            entries.
          </p>
        </div>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link to="/competitions?submit=1">Post an audition</Link>
        </Button>
      </div>
    </AppShell>
  );
}
