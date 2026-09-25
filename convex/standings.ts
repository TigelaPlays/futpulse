import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStandingsByDivision = query({
  args: {
    division: v.union(v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D")),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("standings")
      .withIndex("by_division", (q) => q.eq("division", args.division))
      .collect();

    const grouped: Record<string, typeof records> = {};
    for (const row of records) {
      const g = row.group ?? "1";
      if (!grouped[g]) {
        grouped[g] = [];
      }
      grouped[g].push(row);
    }

    for (const groupKey of Object.keys(grouped)) {
      grouped[groupKey].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference)
          return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return b.won - a.won;
      });
    }

    return grouped;
  },
});
