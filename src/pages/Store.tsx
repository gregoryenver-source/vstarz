import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Ticket, Loader2, MapPin, CalendarDays } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

function zar(cents: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export default function StorePage() {
  const { user } = useAuth();
  const products = useSafeQuery(api.store.listProducts, {}) ?? [];
  const events = useSafeQuery(api.store.listEvents, {}) ?? [];
  const orders = useSafeQuery(api.store.myOrders, {}) ?? [];

  const purchase = useMutation(api.store.purchase);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const buy = async (productId: Id<"merchProducts">, kind: "merch" | "ticket", name: string) => {
    const qty = Math.max(1, quantities[productId] ?? 1);
    setBuyingId(productId);
    try {
      await purchase({ productId, quantity: qty });
      toast.success(
        kind === "ticket"
          ? `Ticket${qty > 1 ? "s" : ""} confirmed for ${name}`
          : `Order placed — ${name}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBuyingId(null);
    }
  };

  const merch = products.filter((p) => p.kind === "merch" && p.active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <p className="mb-1 font-mont text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Official Merchandise &amp; Live Events
        </p>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">VStarz Store</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Wear the V. And when Starz Live comes to your city, be in the room where the season
          is decided.
        </p>
      </div>

      <Tabs defaultValue="merch" className="gap-8">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="merch" className="gap-1.5">
            <ShoppingBag className="size-4" /> Merchandise
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5">
            <Ticket className="size-4" /> Event Tickets
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            My Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merch">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {merch.map((p) => (
              <Card key={p._id} className="flex flex-col border-border/60 bg-secondary/30">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-24 items-center justify-center rounded-xl bg-gradient-to-b from-primary/15 to-transparent text-5xl">
                    {p.emoji ?? "🎁"}
                  </div>
                  <CardTitle className="font-display text-xl">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-bold text-primary">
                      {zar(p.priceCents)}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={quantities[p._id] ?? 1}
                      onChange={(e) =>
                        setQuantities((q) => ({ ...q, [p._id]: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))
                      }
                      className="w-16 text-center"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={buyingId === p._id}
                    onClick={() => buy(p._id, "merch", p.name)}
                  >
                    {buyingId === p._id && <Loader2 className="size-4 animate-spin" />}
                    Add to order
                  </Button>
                </CardContent>
              </Card>
            ))}
            {merch.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                Merch drop coming soon.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tickets">
          <div className="grid gap-4 lg:grid-cols-2">
            {events.map((ev) => {
              const soldOut = ev.ticketsSold >= ev.capacity;
              const remaining = ev.capacity - ev.ticketsSold;
              return (
                <Card key={ev._id} className="border-primary/25 bg-gradient-to-b from-primary/10 to-transparent">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="font-display text-2xl">{ev.title}</CardTitle>
                      <Badge className="bg-primary text-primary-foreground">{zar(ev.priceCents)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{ev.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-4 text-primary" />
                        {new Date(ev.startsAt).toLocaleDateString("en-ZA", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4 text-primary" />
                        {ev.venue}, {ev.city}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {soldOut
                        ? "Sold out"
                        : `${remaining} of ${ev.capacity} tickets remaining`}
                    </p>
                    <Button
                      className="w-full"
                      disabled={soldOut || buyingId === ev.productId}
                      onClick={() => buy(ev.productId, "ticket", ev.title)}
                    >
                      {buyingId === ev.productId && <Loader2 className="size-4 animate-spin" />}
                      {soldOut ? "Sold out" : "Buy tickets"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {events.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No upcoming events announced yet — watch this space.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No orders yet. Your merch and tickets will show up here.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Card key={o._id} className="border-border/60 bg-secondary/30">
                  <CardContent className="flex items-center justify-between gap-3 pt-5">
                    <div>
                      <p className="font-semibold">{o.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        ×{o.quantity} ·{" "}
                        {new Date(o.createdAt).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary">{zar(o.amountCents)}</p>
                      <Badge variant="outline" className="mt-0.5 border-primary/40 text-primary">
                        {o.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!user && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sign in to complete purchases.
        </p>
      )}
    </div>
  );
}
