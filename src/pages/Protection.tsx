import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Copyright,
  FileSignature,
  Coins,
  Archive,
  Trash2,
  Plus,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function money(cents: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function timeAgo(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
void timeAgo;

const statusStyles: Record<string, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  archived: "border-border/60 bg-secondary text-muted-foreground",
};

type Item = {
  _id: string;
  kind: string;
  title: string;
  details: string;
  reference?: string;
  amountCents?: number;
  status: string;
  createdAt: number;
};

function ItemCard({
  item,
  className,
  children,
}: {
  item: Item;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-semibold">
          {item.title}
          <Badge
            variant="outline"
            className={cn("border-0 px-1.5 py-0 text-[10px]", statusStyles[item.status])}
          >
            {item.status}
          </Badge>
        </p>
        <p className="truncate text-xs text-muted-foreground">{item.details}</p>
        {item.reference && (
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
            Ref: {item.reference}
          </p>
        )}
      </div>
      {item.amountCents !== undefined && (
        <span className="shrink-0 font-display text-lg font-bold text-primary tabular-nums">
          {money(item.amountCents)}
        </span>
      )}
      {children}
    </div>
  );
}

function AddDialog({
  triggerLabel,
  title,
  onSubmit,
  fields,
}: {
  triggerLabel: string;
  title: string;
  fields: "copyright" | "contract" | "royalty";
  onSubmit: (vals: {
    title: string;
    details: string;
    reference?: string;
    amountCents?: number;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titleV, setTitleV] = useState("");
  const [detailsV, setDetailsV] = useState("");
  const [refV, setRefV] = useState("");
  const [amountV, setAmountV] = useState("");

  const submit = () => {
    if (titleV.trim().length < 2) {
      toast.error("Give it a title");
      return;
    }
    onSubmit({
      title: titleV,
      details: detailsV,
      reference: refV || undefined,
      amountCents:
        fields === "royalty" ? Math.round(Number(amountV || "0") * 100) : undefined,
    });
    setOpen(false);
    setTitleV("");
    setDetailsV("");
    setRefV("");
    setAmountV("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="font-semibold">
          <Plus className="mr-1.5 size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prot-title">Title</Label>
            <Input
              id="prot-title"
              value={titleV}
              onChange={(e) => setTitleV(e.target.value)}
              placeholder={
                fields === "copyright"
                  ? "e.g. Lagos Nights — Master Recording"
                  : fields === "contract"
                    ? "e.g. Distribution agreement — VStarz Label"
                    : "e.g. Streaming royalties — Q3 2026"
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prot-details">Details</Label>
            <Textarea
              id="prot-details"
              value={detailsV}
              onChange={(e) => setDetailsV(e.target.value)}
              placeholder="What is being protected or tracked?"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prot-ref">
              {fields === "contract" ? "Counterparty (optional)" : "Reference (optional)"}
            </Label>
            <Input
              id="prot-ref"
              value={refV}
              onChange={(e) => setRefV(e.target.value)}
              placeholder={fields === "copyright" ? "CIPC-2026-000000" : "Label, brand or partner"}
            />
          </div>
          {fields === "royalty" && (
            <div className="space-y-1.5">
              <Label htmlFor="prot-amount">Amount earned to date (ZAR)</Label>
              <Input
                id="prot-amount"
                type="number"
                min="0"
                value={amountV}
                onChange={(e) => setAmountV(e.target.value)}
                placeholder="12400"
              />
            </div>
          )}
          <Button className="w-full font-semibold" onClick={submit}>
            {fields === "copyright" ? "File claim" : "Save to vault"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Protection() {
  const vault = useQuery(api.protection.myVault, {});
  const registerWork = useMutation(api.protection.registerWork);
  const addContract = useMutation(api.protection.addContract);
  const addRoyalty = useMutation(api.protection.addRoyalty);
  const recordPayment = useMutation(api.protection.recordRoyaltyPayment);
  const setStatus = useMutation(api.protection.setStatus);
  const removeItem = useMutation(api.protection.removeItem);

  const handleError = (e: unknown) =>
    toast.error(String(e).replace("Error: ", ""));

  const err = handleError;

  return (
    <AppShell>
      {/* Header */}
      <div className="card-spot relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="absolute inset-0 bg-stage-grid opacity-30" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/40 text-primary">
              <ShieldCheck className="mr-1.5 size-3.5" />
              Creator Protection Suite
            </Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Your work. <span className="text-gradient-roc">Your ownership.</span>
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Copyright registration assistance, a contract vault and royalty
              management — creators care about ownership, not just exposure.
            </p>
          </div>
          {vault && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-center">
                <p className="font-display text-xl font-bold">{vault.summary.registeredWorks}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Works</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-center">
                <p className="font-display text-xl font-bold">{vault.summary.activeContracts}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Contracts</p>
              </div>
              <div className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-center">
                <p className="font-display text-xl font-bold text-gradient-roc">
                  {money(vault.summary.royaltyTotalCents)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Royalties</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {!vault ? (
        <div className="animate-pulse text-sm text-muted-foreground">Opening your vault…</div>
      ) : (
        <Tabs defaultValue="copyright" className="space-y-4">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="copyright" className="gap-1.5">
              <Copyright className="size-4" /> Copyright
              <Badge variant="secondary" className="ml-1">{vault.works.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1.5">
              <FileSignature className="size-4" /> Contracts & Licenses
              <Badge variant="secondary" className="ml-1">{vault.contracts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="royalties" className="gap-1.5">
              <Coins className="size-4" /> Royalties
              <Badge variant="secondary" className="ml-1">{vault.royalties.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ── Copyright registry ── */}
          <TabsContent value="copyright" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Timestamped proof-of-creation claims. Ownership is verified before
                a claim goes active.
              </p>
              <AddDialog
                triggerLabel="Register a work"
                title="Register a copyright claim"
                fields="copyright"
                onSubmit={(vals) =>
                  registerWork(vals)
                    .then(() => toast.success("Claim filed — timestamped in your vault"))
                    .catch(handleError)
                }
              />
            </div>
            {vault.works.length === 0 ? (
              <EmptyVault text="No registered works yet. Protect your first song, script or choreography." />
            ) : (
              vault.works.map((w, i) => (
                <motion.div
                  key={w._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="card-spot">
                    <CardContent className="flex items-center gap-3 p-0">
                      <div className="flex-1 p-4">
                        <ItemCard item={w} />
                      </div>
                      <div className="flex flex-col gap-1 p-3">
                        <ArchToggle
                          status={w.status}
                          onSet={(s) => setStatus({ itemId: w._id as never, status: s }).catch(err)}
                        />
                        <DeleteBtn onDel={() => removeItem({ itemId: w._id as never }).catch(err)} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* ── Contract vault ── */}
          <TabsContent value="contracts" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Every agreement in one vault — distribution deals, brand
                sponsorships, licensing terms.
              </p>
              <AddDialog
                triggerLabel="Add contract"
                title="Add a contract or license"
                fields="contract"
                onSubmit={(vals) =>
                  addContract({ ...vals, kind: "contract" })
                    .then(() => toast.success("Saved to your contract vault"))
                    .catch(handleError)
                }
              />
            </div>
            {vault.contracts.length === 0 ? (
              <EmptyVault text="No contracts stored yet. Add agreements so nothing lives only in your email." />
            ) : (
              vault.contracts.map((c) => (
                <Card key={c._id} className="card-spot">
                  <CardContent className="p-4">
                    <ItemCard
                      item={c}
                    >
                      <ArchToggle
                        status={c.status}
                        onSet={(s) => setStatus({ itemId: c._id as never, status: s }).catch(err)}
                      />
                      <DeleteBtn onDel={() => removeItem({ itemId: c._id as never }).catch(err)} />
                    </ItemCard>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Royalty ledger ── */}
          <TabsContent value="royalties" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Track every royalty stream and record payouts as they land.
              </p>
              <AddDialog
                triggerLabel="Add royalty stream"
                title="Track a royalty stream"
                fields="royalty"
                onSubmit={(vals) =>
                  addRoyalty({ ...vals, amountCents: vals.amountCents ?? 0 })
                    .then(() => toast.success("Royalty stream added"))
                    .catch(handleError)
                }
              />
            </div>
            {vault.royalties.length === 0 ? (
              <EmptyVault text="No royalty streams tracked yet. Add your first stream to start the ledger." />
            ) : (
              vault.royalties.map((r) => (
                <Card key={r._id} className="card-spot">
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <ItemCard item={r} className="flex-1" />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        recordPayment({ itemId: r._id as never, amountCents: 10000 })
                          .then(() => toast.success("R100 payout recorded"))
                          .catch(err)
                      }
                    >
                      <Coins className="mr-1.5 size-4 text-primary" />
                      Record R100 payout
                    </Button>
                    <ArchToggle
                      status={r.status}
                      onSet={(s) => setStatus({ itemId: r._id as never, status: s }).catch(err)}
                    />
                    <DeleteBtn onDel={() => removeItem({ itemId: r._id as never }).catch(err)} />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

function EmptyVault({ text }: { text: string }) {
  return (
    <div className="card-spot rounded-2xl p-10 text-center">
      <Lock className="mx-auto size-8 text-muted-foreground/50" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ArchToggle({
  status,
  onSet,
}: {
  status: string;
  onSet: (s: "active" | "archived") => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground"
      onClick={() => onSet(status === "archived" ? "active" : "archived")}
    >
      <Archive className="mr-1 size-3.5" />
      {status === "archived" ? "Restore" : "Archive"}
    </Button>
  );
}

function DeleteBtn({ onDel }: { onDel: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-destructive"
      onClick={onDel}
    >
      <Trash2 className="mr-1 size-3.5" />
      Delete
    </Button>
  );
}
