import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

const ACADEMY_BADGE_PREFIX = "academy:";

// ── Public: course catalog ─────────────────────────────────────────────────

export const listCourses = query({
  args: {},
  handler: async (ctx) => {
    const courses = await ctx.db
      .query("academyCourses")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    courses.sort((a, b) => a.sortOrder - b.sortOrder);

    const userId = await getAuthUserId(ctx);
    const enrollments =
      userId === null
        ? []
        : await ctx.db
            .query("academyEnrollments")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

    const byCourse = new Map(enrollments.map((e) => [e.courseId, e]));

    return courses.map((c) => {
      const enr = byCourse.get(c._id);
      return {
        _id: c._id,
        title: c.title,
        slug: c.slug,
        track: c.track,
        level: c.level,
        description: c.description,
        lessons: c.lessons,
        badge: c.badge,
        enrollment: enr
          ? {
              _id: enr._id,
              completedLessons: enr.completedLessons,
              completedAt: enr.completedAt ?? null,
            }
          : null,
      };
    });
  },
});

// ── Actions ────────────────────────────────────────────────────────────────

export const enroll = mutation({
  args: { courseId: v.id("academyCourses") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const course = await ctx.db.get(args.courseId);
    if (!course || !course.active) throw new Error("Course not found");

    const existing = await ctx.db
      .query("academyEnrollments")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", userId).eq("courseId", args.courseId),
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("academyEnrollments", {
      userId,
      courseId: args.courseId,
      completedLessons: 0,
      createdAt: Date.now(),
    });
  },
});

export const completeLesson = mutation({
  args: { courseId: v.id("academyCourses") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    let enr = await ctx.db
      .query("academyEnrollments")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", userId).eq("courseId", args.courseId),
      )
      .first();
    if (!enr) {
      const id = await ctx.db.insert("academyEnrollments", {
        userId,
        courseId: args.courseId,
        completedLessons: 0,
        createdAt: Date.now(),
      });
      enr = await ctx.db.get(id);
      if (!enr) throw new Error("Enrollment failed");
    }

    const completedLessons = Math.min(enr.completedLessons + 1, course.lessons);
    const finished = completedLessons >= course.lessons;

    await ctx.db.patch(enr._id, {
      completedLessons,
      completedAt: finished ? (enr.completedAt ?? Date.now()) : undefined,
    });

    // Award the certification badge exactly once on completion.
    const badge = `${ACADEMY_BADGE_PREFIX}${course.badge}`;
    if (finished && !(user.badges ?? []).includes(badge)) {
      const badges = [...(user.badges ?? []), badge];
      await ctx.db.patch(userId, { badges });
      await ctx.db.insert("notifications", {
        userId,
        type: "system",
        title: "Certification earned",
        body: `You completed "${course.title}" and earned the ${course.badge.replace(/-/g, " ")} badge.`,
        link: "/passport",
        createdAt: Date.now(),
      });
    }

    return { completedLessons, lessons: course.lessons, finished };
  },
});

export const resetProgress = mutation({
  args: { courseId: v.id("academyCourses") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const enr = await ctx.db
      .query("academyEnrollments")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", userId).eq("courseId", args.courseId),
      )
      .first();
    if (enr) {
      await ctx.db.patch(enr._id, { completedLessons: 0, completedAt: undefined });
    }
  },
});

// ── Passport feed: certifications for the Talent Passport ─────────────────

export const certificationsFor = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const enr = await ctx.db
      .query("academyEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const done = enr.filter((e) => e.completedAt !== undefined);
    return Promise.all(
      done.map(async (e) => {
        const course: Doc<"academyCourses"> | null = await ctx.db.get(e.courseId);
        return course
          ? {
              _id: e._id as Id<"academyEnrollments">,
              title: course.title,
              badge: course.badge,
              level: course.level,
              completedAt: e.completedAt as number,
            }
          : null;
      }),
    );
  },
});
