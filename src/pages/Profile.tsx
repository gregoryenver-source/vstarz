import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  User,
  Loader2,
  Save,
  Users,
  Heart,
  Video,
  Star,
  Crown,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const isOwn = !userId || userId === user?._id;

  const updateProfile = useMutation(api.profiles.updateProfile);
  const toggleFollow = useMutation(api.profiles.toggleFollow);

  const targetId = userId as Id<"users"> | undefined;
  const target = useQuery(
    api.profiles.getPublicProfile,
    !isOwn && targetId ? { userId: targetId } : "skip",
  );
  const following = useQuery(
    api.profiles.isFollowing,
    !isOwn && targetId ? { targetId } : "skip",
  );

  const myEntries = useQuery(
    api.entries.listMine,
    isOwn ? {} : "skip",
  ) ?? [];

  const categories = useQuery(api.profiles.getCategories, {}) ?? [];

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [talents, setTalents] = useState<string[]>([]);
  const [isTalent, setIsTalent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOwn && user) {
      setName(user.name ?? "");
      setUsername(user.username ?? "");
      setBio(user.bio ?? "");
      setTalents(user.talents ?? []);
      setIsTalent(user.isTalent ?? false);
    }
  }, [isOwn, user]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  if (!isOwn && (!target || target === null)) {
    return (
      <AppShell>
        <div className="card-spot rounded-3xl py-20 text-center">
          <User className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="font-semibold">Profile not found</p>
        </div>
      </AppShell>
    );
  }

  const profileUser = isOwn ? user : target!.user;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
        talents,
        isTalent,
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleFollow = async () => {
    try {
      const res = await toggleFollow({ targetId: targetId! });
      toast.success(res.following ? "Following!" : "Unfollowed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <AppShell>
      <Tabs defaultValue={isOwn ? "edit" : "profile"} className="space-y-6">
        {isOwn && (
          <TabsList>
            <TabsTrigger value="edit">Edit profile</TabsTrigger>
            <TabsTrigger value="auditions">My auditions</TabsTrigger>
            <TabsTrigger value="profile">Public view</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="edit" className="max-w-2xl space-y-6">
          <h1 className="font-display text-3xl font-bold">My profile</h1>
          <div className="card-spot space-y-5 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 border border-border/60">
                <AvatarImage src={profileUser?.image} />
                <AvatarFallback className="bg-secondary text-xl">
                  {(profileUser?.name ?? "S")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-display text-lg font-semibold">
                  {profileUser?.name ?? "Unnamed Star"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profileUser?.email ?? "guest account"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-name">Display name</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your stage name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-username">Username</Label>
                <Input
                  id="p-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="lowercase_handle"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-bio">Bio</Label>
              <Textarea
                id="p-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell fans who you are and what you do…"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Talent categories</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = talents.includes(c.slug);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() =>
                        setTalents((prev) =>
                          active ? prev.filter((t) => t !== c.slug) : [...prev, c.slug],
                        )
                      }
                      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-4">
              <Switch id="is-talent" checked={isTalent} onCheckedChange={setIsTalent} />
              <div>
                <Label htmlFor="is-talent" className="text-sm font-medium">
                  I am a talent / performer
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enables hosting live rooms and audition uploads.
                </p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="font-semibold">
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" /> Save profile
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="auditions" className="space-y-4">
          <h1 className="font-display text-3xl font-bold">My auditions</h1>
          {myEntries.length === 0 ? (
            <div className="card-spot rounded-3xl py-16 text-center">
              <Video className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-semibold">No auditions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit to a competition to get on stage.
              </p>
              <Button asChild className="mt-4 font-semibold">
                <Link to="/competitions">Browse competitions</Link>
              </Button>
            </div>
          ) : (
            myEntries.map((e) => (
              <div key={e._id} className="card-spot flex items-center gap-4 rounded-2xl p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.competition?.title ?? "Competition"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    e.status === "approved"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : e.status === "rejected"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-primary/30 bg-primary/10 text-primary"
                  }
                >
                  {e.status}
                </Badge>
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <Heart className="size-4" /> {e.voteCount}
                </span>
                {e.competition && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/competitions/${e.competition._id}`}>View</Link>
                  </Button>
                )}
              </div>
            ))
          )}
        </TabsContent>

        {/* Public profile view (own or other user) */}
        <TabsContent value="profile" forceMount={isOwn ? undefined : true}>
          <ProfilePublic
            user={profileUser!}
            followerCount={isOwn ? undefined : target!.followerCount}
            followingCount={isOwn ? undefined : target!.followingCount}
            isOwn={isOwn}
            isFollowing={following ?? false}
            onFollow={handleFollow}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ProfilePublic({
  user,
  followerCount,
  followingCount,
  isOwn,
  isFollowing,
  onFollow,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  followerCount?: number;
  followingCount?: number;
  isOwn: boolean;
  isFollowing: boolean;
  onFollow: () => void;
}) {
  const categories = useQuery(api.profiles.getCategories, {}) ?? [];
  const talentNames = (user.talents ?? [])
    .map((slug) => categories.find((c) => c.slug === slug)?.name ?? slug)
    .map((n) => n[0].toUpperCase() + n.slice(1));

  return (
    <div className="space-y-6">
      <div className="card-spot relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-stage-grid opacity-25" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar className="size-20 border-2 border-primary/40 shadow-glow-gold">
            <AvatarImage src={user?.image} />
            <AvatarFallback className="bg-secondary text-2xl">
              {(user?.name ?? "S")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">
                {user?.name ?? "Unnamed Star"}
              </h1>
              {user?.plan && user.plan !== "free" && (
                <Badge className="border border-primary/40 bg-primary/15 text-primary">
                  <Crown className="mr-1 size-3" />
                  {user.plan === "premium_pro" ? "Premium Pro" : "Premium"}
                </Badge>
              )}
              {user?.isTalent && (
                <Badge variant="outline" className="border-border/60 text-muted-foreground">
                  <Star className="mr-1 size-3" /> Talent
                </Badge>
              )}
            </div>
            {user?.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {user?.bio ?? "This performer hasn't written a bio yet."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {talentNames.map((t) => (
                <Badge key={t} variant="outline" className="border-primary/30 text-primary">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {followerCount !== undefined && (
              <div className="text-center">
                <p className="font-display text-xl font-bold">{followerCount}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
            )}
            {followingCount !== undefined && (
              <div className="text-center">
                <p className="font-display text-xl font-bold">{followingCount}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            )}
            {!isOwn && (
              <Button
                onClick={onFollow}
                variant={isFollowing ? "outline" : "default"}
                className="font-semibold"
              >
                <Heart className={`mr-2 size-4 ${isFollowing ? "fill-current" : ""}`} />
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>
      </div>
      {isOwn && (
        <p className="text-sm text-muted-foreground">
          This is what fans see when they visit your public profile.{" "}
          <Link to="/dashboard" className="text-primary underline">
            Back to dashboard
          </Link>
          <span className="mx-1">·</span>
          <Users className="inline size-3.5" /> share your handle to grow your fanbase.
        </p>
      )}
    </div>
  );
}
