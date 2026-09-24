import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

declare const process: { env: Record<string, string | undefined> };

interface SaveMatchesResult {
  leaguesCreated: number;
  teamsCreated: number;
  matchesInserted: number;
  matchesUpdated: number;
}

// Tradução amigável de fases
function formatStage(stage: string | null | undefined): string {
  if (!stage) return "Temporada Regular";
  switch (stage) {
    case "REGULAR_SEASON":
      return "Temporada Regular";
    case "GROUP_STAGE":
      return "Fase de Grupos";
    case "ROUND_OF_16":
      return "Oitavas de Final";
    case "QUARTER_FINALS":
      return "Quartas de Final";
    case "SEMI_FINALS":
      return "Semifinal";
    case "FINAL":
      return "Final";
    case "LEAGUE_STAGE":
    case "LEAGUE_PHASE":
      return "Fase de Liga";
    default:
      return stage;
  }
}

// Mapeia status do Football-Data.org para o schema do FutPulse
function mapFootballDataStatus(status: string): {
  status: "SCHEDULED" | "IN_PLAY" | "LIVE" | "HALFTIME" | "PAUSED" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | "FINISHED" | "POSTPONED";
  statusShort: string;
} {
  switch (status) {
    case "IN_PLAY":
      return { status: "LIVE", statusShort: "AO VIVO" };
    case "PAUSED":
      return { status: "HALFTIME", statusShort: "HT" };
    case "FINISHED":
    case "AWARDED":
      return { status: "FINISHED", statusShort: "FT" };
    case "TIMED":
    case "SCHEDULED":
      return { status: "SCHEDULED", statusShort: "NS" };
    case "POSTPONED":
      return { status: "POSTPONED", statusShort: "ADIADO" };
    case "CANCELLED":
    case "SUSPENDED":
      return { status: "POSTPONED", statusShort: "CANC" };
    default:
      return { status: "SCHEDULED", statusShort: "NS" };
  }
}

// Action pública: consome a API oficial e orquestra a sincronização
export const syncMatchesAction = action({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey) {
      throw new Error("FOOTBALL_DATA_API_KEY não está configurada no ambiente Convex.");
    }

    // Monta URL de requisição
    let url = "https://api.football-data.org/v4/matches";
    if (args.dateFrom && args.dateTo) {
      url += `?dateFrom=${args.dateFrom}&dateTo=${args.dateTo}`;
    }

    console.log(`[FootballData] Consultando ${url}...`);

    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha na API football-data.org (${response.status}): ${errText}`);
    }

    const data = await response.json();
    let matches = data.matches || [];

    // Fallback inteligente: se a janela de hoje não possuir jogos na cota gratuita,
    // busca a rodada da semana atual (3 dias antes a 3 dias depois) para manter o app alimentado
    if (matches.length === 0 && !args.dateFrom && !args.dateTo) {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 4);
      const to = new Date(today);
      to.setDate(today.getDate() + 3);

      const dFrom = from.toISOString().split("T")[0];
      const dTo = to.toISOString().split("T")[0];

      const weekUrl = `https://api.football-data.org/v4/matches?dateFrom=${dFrom}&dateTo=${dTo}`;
      console.log(`[FootballData] 0 jogos hoje. Consultando janela da semana: ${weekUrl}...`);

      const weekResponse = await fetch(weekUrl, {
        headers: {
          "X-Auth-Token": apiKey,
          Accept: "application/json",
        },
      });

      if (weekResponse.ok) {
        const weekData = await weekResponse.json();
        matches = weekData.matches || [];
      }
    }

    console.log(`[FootballData] ${matches.length} partidas retornadas pela API.`);

    if (matches.length === 0) {
      return { success: true, count: 0, message: "Nenhuma partida na janela informada." };
    }

    // Persiste no banco através de mutation interna
    const result: SaveMatchesResult = await ctx.runMutation(internal.footballData.saveFootballDataMatches, {
      matches: matches.map((m: any) => ({
        externalId: m.id,
        utcDate: m.utcDate,
        status: m.status,
        matchday: m.matchday || undefined,
        stage: m.stage || undefined,
        group: m.group || undefined,
        minute: m.minute || undefined,
        competition: {
          id: m.competition.id,
          name: m.competition.name,
          code: m.competition.code || undefined,
          type: m.competition.type || "LEAGUE",
          emblem: m.competition.emblem || undefined,
          country: m.area?.name || "Europa",
        },
        homeTeam: {
          id: m.homeTeam.id,
          name: m.homeTeam.name,
          shortName: m.homeTeam.shortName || undefined,
          tla: m.homeTeam.tla || undefined,
          crest: m.homeTeam.crest || undefined,
        },
        awayTeam: {
          id: m.awayTeam.id,
          name: m.awayTeam.name,
          shortName: m.awayTeam.shortName || undefined,
          tla: m.awayTeam.tla || undefined,
          crest: m.awayTeam.crest || undefined,
        },
        score: {
          homeFullTime: m.score?.fullTime?.home ?? 0,
          awayFullTime: m.score?.fullTime?.away ?? 0,
          homeHalfTime: m.score?.halfTime?.home ?? undefined,
          awayHalfTime: m.score?.halfTime?.away ?? undefined,
        },
      })),
    });

    return {
      success: true,
      matchesProcessed: matches.length,
      ...result,
    };
  },
});

// Mutation interna: cadastra/atualiza ligas, equipes e partidas no banco de dados
export const saveFootballDataMatches = internalMutation({
  args: {
    matches: v.array(
      v.object({
        externalId: v.number(),
        utcDate: v.string(),
        status: v.string(),
        matchday: v.optional(v.number()),
        stage: v.optional(v.string()),
        group: v.optional(v.string()),
        minute: v.optional(v.number()),
        competition: v.object({
          id: v.number(),
          name: v.string(),
          code: v.optional(v.string()),
          type: v.string(),
          emblem: v.optional(v.string()),
          country: v.string(),
        }),
        homeTeam: v.object({
          id: v.number(),
          name: v.string(),
          shortName: v.optional(v.string()),
          tla: v.optional(v.string()),
          crest: v.optional(v.string()),
        }),
        awayTeam: v.object({
          id: v.number(),
          name: v.string(),
          shortName: v.optional(v.string()),
          tla: v.optional(v.string()),
          crest: v.optional(v.string()),
        }),
        score: v.object({
          homeFullTime: v.number(),
          awayFullTime: v.number(),
          homeHalfTime: v.optional(v.number()),
          awayHalfTime: v.optional(v.number()),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const allLeagues = await ctx.db.query("leagues").collect();
    const allTeams = await ctx.db.query("teams").collect();
    const allMatches = await ctx.db.query("matches").collect();

    let leaguesCreated = 0;
    let teamsCreated = 0;
    let matchesInserted = 0;
    let matchesUpdated = 0;

    // Cache local em memória durante a transação
    const leagueMap = new Map<number, Id<"leagues">>();
    const teamMap = new Map<number, Id<"teams">>();

    for (const m of args.matches) {
      // 1. Resolve ou cria a Liga
      let leagueId = leagueMap.get(m.competition.id);
      if (!leagueId) {
        let existingLeague =
          allLeagues.find((l) => l.externalId === m.competition.id) ||
          allLeagues.find((l) => m.competition.code && l.code === m.competition.code) ||
          allLeagues.find((l) => l.name.toLowerCase() === m.competition.name.toLowerCase());

        if (!existingLeague) {
          const newLeagueId = await ctx.db.insert("leagues", {
            name: m.competition.name,
            code: m.competition.code,
            country: m.competition.country,
            logoUrl: m.competition.emblem || "",
            season: new Date(m.utcDate).getFullYear(),
            type: m.competition.type === "CUP" ? "cup" : "league",
            externalId: m.competition.id,
            priority: 15,
          });
          leagueId = newLeagueId;
          leaguesCreated++;
          allLeagues.push((await ctx.db.get(newLeagueId))!);
        } else {
          leagueId = existingLeague._id;
          if (m.competition.emblem && !existingLeague.logoUrl) {
            await ctx.db.patch(existingLeague._id, { logoUrl: m.competition.emblem });
          }
        }
        leagueMap.set(m.competition.id, leagueId);
      }

      // 2. Resolve ou cria o Time Mandante
      let homeTeamId = teamMap.get(m.homeTeam.id);
      if (!homeTeamId) {
        let existingTeam =
          allTeams.find((t) => t.externalId === m.homeTeam.id) ||
          allTeams.find((t) => m.homeTeam.tla && t.code === m.homeTeam.tla) ||
          allTeams.find(
            (t) =>
              t.name.toLowerCase() === m.homeTeam.name.toLowerCase() ||
              (m.homeTeam.shortName && t.name.toLowerCase() === m.homeTeam.shortName.toLowerCase())
          );

        if (!existingTeam) {
          const newTeamId = await ctx.db.insert("teams", {
            name: m.homeTeam.name,
            shortName: m.homeTeam.shortName,
            code: m.homeTeam.tla,
            logoUrl: m.homeTeam.crest || "",
            externalId: m.homeTeam.id,
          });
          homeTeamId = newTeamId;
          teamsCreated++;
          allTeams.push((await ctx.db.get(newTeamId))!);
        } else {
          homeTeamId = existingTeam._id;
          if (m.homeTeam.crest && !existingTeam.logoUrl) {
            await ctx.db.patch(existingTeam._id, { logoUrl: m.homeTeam.crest });
          }
        }
        teamMap.set(m.homeTeam.id, homeTeamId);
      }

      // 3. Resolve ou cria o Time Visitante
      let awayTeamId = teamMap.get(m.awayTeam.id);
      if (!awayTeamId) {
        let existingTeam =
          allTeams.find((t) => t.externalId === m.awayTeam.id) ||
          allTeams.find((t) => m.awayTeam.tla && t.code === m.awayTeam.tla) ||
          allTeams.find(
            (t) =>
              t.name.toLowerCase() === m.awayTeam.name.toLowerCase() ||
              (m.awayTeam.shortName && t.name.toLowerCase() === m.awayTeam.shortName.toLowerCase())
          );

        if (!existingTeam) {
          const newTeamId = await ctx.db.insert("teams", {
            name: m.awayTeam.name,
            shortName: m.awayTeam.shortName,
            code: m.awayTeam.tla,
            logoUrl: m.awayTeam.crest || "",
            externalId: m.awayTeam.id,
          });
          awayTeamId = newTeamId;
          teamsCreated++;
          allTeams.push((await ctx.db.get(newTeamId))!);
        } else {
          awayTeamId = existingTeam._id;
          if (m.awayTeam.crest && !existingTeam.logoUrl) {
            await ctx.db.patch(existingTeam._id, { logoUrl: m.awayTeam.crest });
          }
        }
        teamMap.set(m.awayTeam.id, awayTeamId);
      }

      // 4. Mapeia dados e status da partida
      const statusMapping = mapFootballDataStatus(m.status);
      const roundStr = m.matchday ? `Rodada ${m.matchday}` : m.stage ? formatStage(m.stage) : "Rodada 1";
      const startTime = new Date(m.utcDate).getTime();

      let minute = m.minute;
      if (minute === undefined) {
        if (statusMapping.status === "FINISHED") minute = 90;
        else if (statusMapping.status === "HALFTIME") minute = 45;
        else if (statusMapping.status === "SCHEDULED") minute = 0;
      }

      // 5. Verifica existência da partida
      const existingMatch =
        allMatches.find((em) => em.externalId === m.externalId) ||
        allMatches.find(
          (em) =>
            em.leagueId === leagueId &&
            em.homeTeamId === homeTeamId &&
            em.awayTeamId === awayTeamId &&
            Math.abs(em.startTime - startTime) < 86400000 // Menos de 24h de diferença
        );

      if (!existingMatch) {
        await ctx.db.insert("matches", {
          externalId: m.externalId,
          leagueId,
          homeTeamId,
          awayTeamId,
          round: roundStr,
          stage: formatStage(m.stage),
          group: m.group || undefined,
          status: statusMapping.status,
          statusShort: statusMapping.statusShort,
          minute,
          homeScore: m.score.homeFullTime,
          awayScore: m.score.awayFullTime,
          homeHalftimeScore: m.score.homeHalfTime,
          awayHalftimeScore: m.score.awayHalfTime,
          startTime,
        });
        matchesInserted++;
      } else {
        await ctx.db.patch(existingMatch._id, {
          externalId: m.externalId,
          round: roundStr,
          stage: formatStage(m.stage),
          group: m.group || undefined,
          status: statusMapping.status,
          statusShort: statusMapping.statusShort,
          minute,
          homeScore: m.score.homeFullTime,
          awayScore: m.score.awayFullTime,
          homeHalftimeScore: m.score.homeHalfTime,
          awayHalftimeScore: m.score.awayHalfTime,
          startTime,
        });
        matchesUpdated++;
      }
    }

    return {
      leaguesCreated,
      teamsCreated,
      matchesInserted,
      matchesUpdated,
    };
  },
});
