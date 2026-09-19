import { useMutation } from "convex/react";
import { useSafeQuery } from "@/lib/safe-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mic,
  PenLine,
  Footprints,
  Clapperboard,
  Camera,
  BadgeCheck,
  Briefcase,
  PlayCircle,
  CheckCircle2,
  Award,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const trackIcons: Record<string, typeof Mic> = {
  vocal: Mic,
  songwriting: PenLine,
  dance: Footprints,
  acting: Clapperboard,
  content: Camera,
  branding: BadgeCheck,
  business: Briefcase,
};

const levelStyles: Record<string, string> = {
  starter: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  pro: "border-primary/30 bg-primary/10 text-primary",
  elite: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

type Course = {
  _id: string;
  title: string;
  track: string;
  level: string;
  description: string;
  lessons: number;
  badge: string;
  enrollment: {
    _id: string;
    completedLessons: number;
    completedAt: number | null;
  } | null;
};

export default function Academy() {
  const courses = (useSafeQuery(api.academy.listCourses, {}) ?? []) as Course[];
  const enroll = useMutation(api.academy.enroll);
  const complete = useMutation(api.academy.completeLesson);

  const handleEnroll = (courseId: Course["_id"], title: string) => {
    enroll({ courseId: courseId as never })
      .then(() => toast.success(`Enrolled in "${title}"`))
      .catch((e) => toast.error(String(e).replace("Error: ", "")));
  };

  const handleLesson = (course: Course) => {
    complete({ courseId: course._id as never })
      .then((r) => {
        if (r.finished) {
          toast.success("Certification earned!", {
            description: `"${course.title}" complete — badge added to your Talent Passport.`,
          });
        } else {
          toast.success(`Lesson ${r.completedLessons}/${r.lessons} complete`);
        }
      })
      .catch((e) => toast.error(String(e).replace("Error: ", "")));
  };

  const enrolledCount = courses.filter((c) => c.enrollment).length;
  const certs = courses.filter((c) => c.enrollment?.completedAt).length;

  return (
    <AppShell>
      {/* Header */}
      <div className="card-spot relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="absolute inset-0 bg-stage-grid opacity-30" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/40 text-primary">
              <GraduationCap className="mr-1.5 size-3.5" />
              VStarz Academy
            </Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Learn. Certify. <span className="text-gradient-roc">Rise.</span>
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              The learning engine of the Creator OS — vocal coaching to music
              business. Earn certifications that build your Talent Passport and
              unlock pipeline stages.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/60 px-5 py-4 text-center">
              <p className="font-display text-2xl font-bold">{enrolledCount}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-center">
              <p className="font-display text-2xl font-bold text-gradient-roc">{certs}</p>
              <p className="text-xs text-muted-foreground">Certified</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course grid */}
      {courses.length === 0 ? (
        <div className="card-spot rounded-3xl p-10 text-center text-sm text-muted-foreground">
          The curriculum is being written — check back soon.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c, i) => {
            const Icon = trackIcons[c.track] ?? GraduationCap;
            const enr = c.enrollment;
            const pct = enr ? Math.round((enr.completedLessons / c.lessons) * 100) : 0;
            const done = Boolean(enr?.completedAt);
            return (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="h-full"
              >
                <article
                  className={cn(
                    "card-spot flex h-full flex-col rounded-3xl p-6",
                    done && "border-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          levelStyles[c.level],
                        )}
                      >
                        {c.level}
                      </span>
                      {done && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          <Award className="size-3" /> Certified
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-4 font-display text-xl font-semibold leading-tight">
                    {c.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                    {c.description}
                  </p>

                  {enr && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {enr.completedLessons}/{c.lessons} lessons
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="mt-1.5 h-1.5" />
                    </div>
                  )}

                  <div className="mt-5 flex items-center gap-2 border-t border-border/50 pt-4">
                    {!enr ? (
                      <Button
                        size="sm"
                        className="flex-1 font-semibold"
                        onClick={() => handleEnroll(c._id, c.title)}
                      >
                        <PlayCircle className="mr-1.5 size-4" />
                        Enroll free
                      </Button>
                    ) : done ? (
                      <Button variant="secondary" size="sm" className="flex-1" disabled>
                        <CheckCircle2 className="mr-1.5 size-4 text-primary" />
                        Completed
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 font-semibold"
                        onClick={() => handleLesson(c)}
                      >
                        Continue · lesson {enr.completedLessons + 1}
                      </Button>
                    )}
                    <span
                      className="flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground"
                      title="Badge awarded on completion"
                    >
                      {done ? <Award className="size-3 text-primary" /> : <Lock className="size-3" />}
                      {c.lessons} lessons
                    </span>
                  </div>
                </article>
              </motion.div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
