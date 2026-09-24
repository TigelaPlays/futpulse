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

    // Agrupa por grupo (ex: A1, A2, etc.)
    const grouped: Record<string, typeof records> = {};
    for (const row of records) {
      if (!grouped[row.group]) {
        grouped[row.group] = [];
      }
      grouped[row.group].push(row);
    }

    // Ordenação padrão UEFA: Pontos -> Saldo -> Gols Pró -> Vitórias
    for (const groupKey of Object.keys(grouped)) {
      grouped[groupKey].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return b.won - a.won;
      });
    }

    return grouped;
  },
});
