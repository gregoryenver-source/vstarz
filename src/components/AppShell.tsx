import { useAuth } from "@/hooks/use-auth";
import { VStarzLogo } from "@/components/VStarzLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import {
  Star,
  LayoutDashboard,
  Trophy,
  Radio,
  Crown,
  User,
  ShieldCheck,
  Bell,
  LogOut,
  Coins,
  Menu,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/competitions", label: "Competitions", icon: Trophy },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/boost", label: "Boost", icon: Crown },
  { to: "/profile", label: "My Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const credits = user?.votingCredits ?? 0;
  const plan = user?.plan ?? "free";

  const unread = useQuery(api.notifications.unreadCount, {}) ?? 0;
  const notifications = useQuery(api.notifications.listMine, {}) ?? [];
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = (
    <>
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink
          to="/admin"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )
          }
        >
          <ShieldCheck className="size-4" />
          Admin Portal
        </NavLink>
      )}
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu className="size-5" />
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <VStarzLogo className="size-8" glow={false} />
            <span className="hidden font-display text-xl font-bold tracking-wide sm:block">
              VStarz
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/boost">
                <Coins className="size-4 text-primary" />
                <span className="font-semibold tabular-nums">{credits}</span>
                <span className="hidden text-muted-foreground sm:inline">credits</span>
              </Link>
            </Button>


            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unread > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => markAllRead({})}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-72">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nothing yet. Follow talent and join competitions to hear
                      what's happening.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {notifications.map((n) => (
                        <button
                          key={n._id}
                          className={cn(
                            "block w-full px-4 py-3 text-left transition-colors hover:bg-secondary/60",
                            !n.readAt && "bg-primary/5",
                          )}
                          onClick={() => {
                            if (!n.readAt) markRead({ id: n._id });
                            if (n.link) navigate(n.link);
                          }}
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          {n.body && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.body}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-primary focus-visible:ring-2">
                  <Avatar className="size-9 border border-border/60">
                    <AvatarImage src={user?.image} />
                    <AvatarFallback className="bg-secondary text-sm">
                      {(user?.name ?? user?.username ?? "S")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {user?.name ?? user?.username ?? "Star"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user?.email ?? "guest account"}
                      </p>
                    </div>
                    {plan !== "free" && (
                      <Badge className="bg-primary text-primary-foreground">
                        <Crown className="mr-1 size-3" />
                        Gold
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 size-4" /> My profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/boost")}>
                  <Zap className="mr-2 size-4" /> Boost & credits
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <ShieldCheck className="mr-2 size-4" /> Admin portal
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute left-0 top-16 flex w-64 flex-col gap-1 border-r border-border/50 bg-background p-3">
            {navItems}
          </nav>
      </div>
      )}

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-1 border-r border-border/50 p-3 lg:flex">
          {navItems}
          <div className="mt-auto rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold text-primary">Voting credits</p>
            <p className="mt-1 font-display text-2xl font-bold">{credits}</p>
            <Button asChild size="sm" className="mt-3 w-full font-semibold">
              <Link to="/boost">Get more</Link>
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
