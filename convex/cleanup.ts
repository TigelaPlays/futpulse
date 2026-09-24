import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const TEAM_NAME_TRANSLATIONS: Record<string, string> = {
  "netherlands": "Holanda",
  "germany": "Alemanha",
  "wales": "País de Gales",
  "denmark": "Dinamarca",
  "norway": "Noruega",
  "serbia": "Sérvia",
  "greece": "Grécia",
  "austria": "Áustria",
  "rep. of ireland": "Irlanda",
  "republic of ireland": "Irlanda",
  "lithuania": "Lituânia",
  "liechtenstein": "Liechtenstein",
  "israel": "Israel",
  "kosovo": "Kosovo",
  "belgium": "Bélgica",
  "croatia": "Croácia",
  "spain": "Espanha",
  "france": "França",
  "italy": "Itália",
  "england": "Inglaterra",
  "portugal": "Portugal",
  "scotland": "Escócia",
  "poland": "Polônia",
  "switzerland": "Suíça",
  "sweden": "Suécia",
  "czech republic": "Tchéquia",
  "turkey": "Turquia",
  "ukraine": "Ucrânia",
  "hungary": "Hungria",
};

export const cleanOldMockMatches = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const isDryRun = args.dryRun ?? false;

    const allMatches = await ctx.db.query("matches").collect();
    const allLeagues = await ctx.db.query("leagues").collect();
    const allTeams = await ctx.db.query("teams").collect();

    const leagueMap = new Map(allLeagues.map((l) => [l._id, l]));
    const teamMap = new Map(allTeams.map((t) => [t._id, t]));

    // IDs das partidas do seed antigo da Nations League
    const oldNationsIds = [15534057, 15534071, 15534100, 15534097, 15534155, 15534165, 15534241, 15537726];

    const matchesToDelete = allMatches.filter((m) => {
      // 1. Partidas do seed antigo da Nations League pelo externalId
      if (m.externalId && oldNationsIds.includes(m.externalId)) return true;

      // 2. Partidas que estão na UEFA Nations League mas NÃO são do formato da API-Football (1528xxx)
      const league = leagueMap.get(m.leagueId);
      if (league && /nations league/i.test(league.name)) {
        if (!m.externalId || m.externalId > 10000000) return true;
      }

      return false;
    });

    let deletedEventsCount = 0;
    let deletedStatsCount = 0;
    const deletedMatchDetails: any[] = [];

    for (const match of matchesToDelete) {
      const home = teamMap.get(match.homeTeamId);
      const away = teamMap.get(match.awayTeamId);
      const league = leagueMap.get(match.leagueId);

      deletedMatchDetails.push({
        id: match._id,
        externalId: match.externalId,
        league: league?.name,
        match: `${home?.name} ${match.homeScore} x ${match.awayScore} ${away?.name}`,
        minute: match.minute,
        status: match.status,
      });

      // Busca eventos associados
      const events = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();

      // Busca estatísticas associadas
      const stats = await ctx.db
        .query("matchStatistics")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();

      deletedEventsCount += events.length;
      deletedStatsCount += stats.length;

      if (!isDryRun) {
        for (const ev of events) {
          await ctx.db.delete(ev._id);
        }
        for (const st of stats) {
          await ctx.db.delete(st._id);
        }
        await ctx.db.delete(match._id);
      }
    }

    // Tradução e padronização dos nomes de seleções no banco
    let translatedTeamsCount = 0;
    if (!isDryRun) {
      for (const team of allTeams) {
        const lowerName = team.name.toLowerCase().trim();
        const ptName = TEAM_NAME_TRANSLATIONS[lowerName];
        if (ptName && team.name !== ptName) {
          await ctx.db.patch(team._id, {
            name: ptName,
            shortName: ptName,
          });
          translatedTeamsCount++;
        }
      }
    }

    return {
      success: true,
      dryRun: isDryRun,
      deletedMatchesCount: matchesToDelete.length,
      deletedEventsCount,
      deletedStatsCount,
      translatedTeamsCount,
      deletedMatchDetails,
    };
  },
});

export const getLiveMatchesList = query({
  args: {},
  handler: async (ctx) => {
    const allMatches = await ctx.db.query("matches").collect();
    const allLeagues = await ctx.db.query("leagues").collect();
    const allTeams = await ctx.db.query("teams").collect();

    const leagueMap = new Map(allLeagues.map((l) => [l._id, l]));
    const teamMap = new Map(allTeams.map((t) => [t._id, t]));

    const live = allMatches
      .filter((m) =>
        ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
      )
      .map((m) => ({
        id: m._id,
        externalId: m.externalId,
        league: leagueMap.get(m.leagueId)?.name,
        home: teamMap.get(m.homeTeamId)?.name,
        away: teamMap.get(m.awayTeamId)?.name,
        score: `${m.homeScore} x ${m.awayScore}`,
        minute: m.minute,
        status: m.status,
        statusShort: m.statusShort,
      }));

    return live;
  },
});
