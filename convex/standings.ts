import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStandingsByDivision = query({
  args: {
    division: v.string(),
  },
  handler: async () => {
    return {};
  },
});
