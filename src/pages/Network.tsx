import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeCheck, Users, Megaphone, Sparkles, ScrollText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router";

const CATEGORIES = [
  { value: "singing", label: "Singing" },
  { value: "rap", label: "Rap" },
  { value: "dance", label: "Dance" },
  { value: "dj", label: "DJ" },
  { value: "comedy", label: "Comedy" },
  { value: "acting", label: "Acting" },
  { value: "spoken-word", label: "Spoken Word" },
  { value: "gospel", label: "Gospel" },
  { value: "instrumentalist", label: "Instrumentalist" },
  { value: "fashion", label: "Fashion" },
  { value: "content-creator", label: "Content Creator" },
  { value: "open", label: "Open Category" },
];

export default function NetworkPage() {
  const { user } = useAuth();
  const clubs = useSafeQuery(api.network.listFanClubs, {}) ?? [];
  const posts = useSafeQuery(api.network.listNetworkPosts, {}) ?? [];
  const memberships = useSafeQuery(api.network.myMemberships, {}) ?? [];
  const myVerification = useSafeQuery(api.network.myVerification, {}) ?? null;
  const mySubmissions = useSafeQuery(api.network.myLabelSubmissions, {}) ?? [];

  const joinClub = useMutation(api.network.joinFanClub);
  const leaveClub = useMutation(api.network.leaveFanClub);
  const createClub = useMutation(api.network.createFanClub);
  const requestVerification = useMutation(api.network.requestVerification);
  const submitToLabel = useMutation(api.network.submitToLabel);
  const createPost = useMutation(api.network.createNetworkPost);

  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [clubTier, setClubTier] = useState<"free" | "gold">("free");
  const [creatingClub, setCreatingClub] = useState(false);

  const [stageName, setStageName] = useState("");
  const [category, setCategory] = useState("");
  const [evidence, setEvidence] = useState("");
  const [statement, setStatement] = useState("");
  const [requesting, setRequesting] = useState(false);

  const [artistName, setArtistName] = useState("");
  const [labelCategory, setLabelCategory] = useState("");
  const [links, setLinks] = useState("");
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [postBody, setPostBody] = useState("");
  const [postKind, setPostKind] = useState<"milestone" | "opportunity" | "announcement">("announcement");
  const [posting, setPosting] = useState(false);

  const memberSet = new Set(memberships);
  const canPost = user?.isTalent || user?.role === "artist" || user?.role === "admin";

  const handleCreateClub = async () => {
    if (!clubName.trim() || !clubDesc.trim()) return;
    setCreatingClub(true);
    try {
      await createClub({ name: clubName, description: clubDesc, tier: clubTier });
      setClubName("");
      setClubDesc("");
      setClubTier("free");
      toast.success("Fan club created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create fan club");
    } finally {
      setCreatingClub(false);
    }
  };

  const handleVerify = async () => {
    if (!stageName.trim() || !category || !evidence.trim() || !statement.trim()) return;
    setRequesting(true);
    try {
      await requestVerification({ stageName, categorySlug: category, evidenceUrl: evidence, statement });
      toast.success("Verification request submitted for review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit request");
    } finally {
      setRequesting(false);
    }
  };

  const handleLabelSubmit = async () => {
    if (!artistName.trim() || !labelCategory || !links.trim() || !pitch.trim()) return;
    setSubmitting(true);
    try {
      await submitToLabel({ artistName, categorySlug: labelCategory, links, pitch });
      setArtistName("");
      setLinks("");
      setPitch("");
      toast.success("Submission sent to the label A&R team");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!postBody.trim()) return;
    setPosting(true);
    try {
      await createPost({ kind: postKind, body: postBody });
      setPostBody("");
      toast.success("Posted to the network");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 font-mont text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Roc Nation Africa
        </p>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Artist Network</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The industry layer of VStarz — fan clubs that move charts, verified artists,
          label submissions, and the people building the continent's next sound.
        </p>
      </div>

      <Tabs defaultValue="fanclubs" className="gap-8">
        <TabsList className="flex w-full flex-wrap gap-1 bg-secondary/50 sm:w-auto">
          <TabsTrigger value="fanclubs" className="gap-1.5">
            <Users className="size-4" /> Fan Clubs
          </TabsTrigger>
          <TabsTrigger value="feed" className="gap-1.5">
            <Megaphone className="size-4" /> Network Feed
          </TabsTrigger>
          <TabsTrigger value="verification" className="gap-1.5">
            <BadgeCheck className="size-4" /> Verification
          </TabsTrigger>
          <TabsTrigger value="label" className="gap-1.5">
            <ScrollText className="size-4" /> Label Submissions
          </TabsTrigger>
        </TabsList>

        {/* ── Fan Clubs ── */}
        <TabsContent value="fanclubs" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => {
              const isMember = memberSet.has(club._id);
              return (
                <Card key={club._id} className="border-border/60 bg-secondary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-display text-xl">{club.name}</CardTitle>
                      {club.tier === "gold" && (
                        <Badge className="bg-primary text-primary-foreground">Gold</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {club.memberCount} member{club.memberCount === 1 ? "" : "s"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
                    {club.artist && (
                      <Link
                        to={`/profile/${club.artist._id}`}
                        className="flex items-center gap-2 text-sm hover:text-primary"
                      >
                        <Avatar className="size-6">
                          <AvatarImage src={club.artist.image ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(club.artist.name ?? "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{club.artist.name ?? "Artist"}</span>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant={isMember ? "outline" : "default"}
                      className="w-full"
                      onClick={async () => {
                        try {
                          if (isMember) {
                            await leaveClub({ clubId: club._id });
                            toast("Left the club");
                          } else {
                            await joinClub({ clubId: club._id });
                            toast.success("Welcome to the club");
                          }
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Action failed");
                        }
                      }}
                    >
                      {isMember ? "Leave club" : club.tier === "gold" ? "Join with Gold" : "Join club"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {clubs.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No fan clubs yet — be the first artist to start one.
              </p>
            )}
          </div>

          {/* Create a club */}
          <Card className="border-primary/25 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-display text-xl">Start your fan club</CardTitle>
              <p className="text-sm text-muted-foreground">
                Artists and verified talent only. Gold clubs are exclusive to VStarz Gold members.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Club name — e.g. Smino's Starz"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
              />
              <Textarea
                placeholder="What do members get? Exclusive drops, behind-the-scenes, early votes…"
                value={clubDesc}
                onChange={(e) => setClubDesc(e.target.value)}
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Select value={clubTier} onValueChange={(v) => setClubTier(v as "free" | "gold")}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free club</SelectItem>
                    <SelectItem value="gold">Gold members only</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateClub} disabled={creatingClub} className="ml-auto">
                  {creatingClub && <Loader2 className="size-4 animate-spin" />}
                  Create club
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Network feed ── */}
        <TabsContent value="feed" className="space-y-6">
          {canPost && (
            <Card className="border-border/60 bg-secondary/30">
              <CardContent className="space-y-3 pt-6">
                <Select value={postKind} onValueChange={(v) => setPostKind(v as typeof postKind)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Share a milestone, casting call, or announcement with the network…"
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button onClick={handlePost} disabled={posting}>
                    {posting && <Loader2 className="size-4 animate-spin" />}
                    Post to network
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post._id} className="border-border/60 bg-secondary/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={post.author?.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {(post.author?.name ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{post.author?.name ?? "Network"}</span>
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          {post.kind}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm">{post.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {posts.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                The network feed is quiet. Verified artists can post the first update.
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── Verification ── */}
        <TabsContent value="verification" className="max-w-2xl space-y-6">
          {myVerification ? (
            <Card className="border-border/60 bg-secondary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl">Your request</CardTitle>
                  <Badge
                    variant={myVerification.status === "approved" ? "default" : "outline"}
                    className={
                      myVerification.status === "approved"
                        ? "bg-primary text-primary-foreground"
                        : myVerification.status === "rejected"
                          ? "border-destructive/50 text-destructive"
                          : "border-primary/40 text-primary"
                    }
                  >
                    {myVerification.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Stage name:</span>{" "}
                  {myVerification.stageName}
                </p>
                {myVerification.reviewNote && (
                  <p className="mt-2">
                    <span className="font-medium text-foreground">Reviewer note:</span>{" "}
                    {myVerification.reviewNote}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 bg-secondary/30">
              <CardHeader>
                <CardTitle className="font-display text-xl">Get verified</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The blue-seal badge marks you as a real, active artist on VStarz. Admins review
                  every request manually.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Stage name"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Primary talent category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Proof link — streaming profile, press feature, or social"
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                />
                <Textarea
                  placeholder="Tell the review team about your work — releases, performances, audience…"
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleVerify} disabled={requesting}>
                  {requesting && <Loader2 className="size-4 animate-spin" />}
                  Submit request
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Label submissions ── */}
        <TabsContent value="label" className="max-w-2xl space-y-6">
          {mySubmissions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-mont text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Your submissions
              </h3>
              {mySubmissions.map((s) => (
                <Card key={s._id} className="border-border/60 bg-secondary/30">
                  <CardContent className="flex items-center justify-between gap-3 pt-5">
                    <div>
                      <p className="font-semibold">{s.artistName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        s.status === "signed"
                          ? "border-primary bg-primary text-primary-foreground"
                          : s.status === "declined"
                            ? "border-destructive/50 text-destructive"
                            : "border-primary/40 text-primary"
                      }
                    >
                      {s.status.replace("_", " ")}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card className="border-primary/25 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-display text-xl">Submit to the digital label</CardTitle>
              <p className="text-sm text-muted-foreground">
                The Roc Nation Africa digital record label reviews VStarz submissions for signing.
                One active submission at a time.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Artist name"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
              />
              <Select value={labelCategory} onValueChange={setLabelCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Genre / category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Links — Spotify, Apple Music, YouTube, SoundCloud…"
                value={links}
                onChange={(e) => setLinks(e.target.value)}
              />
              <Textarea
                placeholder="Your pitch — sound, audience, and why the label should sign you…"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                rows={4}
              />
              <Button onClick={handleLabelSubmit} disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                <Sparkles className="size-4" />
                Submit for review
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
