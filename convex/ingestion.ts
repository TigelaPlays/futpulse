import { action, internalMutation, mutation, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// IDs das ligas monitoradas (Brasil, América do Sul, Europa, MLS, Arábia Saudita)
const TRACKED_LEAGUE_IDS = [
  71, 72, 73, 13, 11, // Brasil e América do Sul
  2, 39, 140, 135, 78, 61, 94, 3, 45, // Europa
  253, 307, // MLS, Saudi Pro League
];

const normalizeTeamName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const CANONICAL_TEAM_ALIASES: Record<number, string[]> = {
  140: ["botafogo-sp", "botafogo sp", "botafogo"],
  142: ["criciuma", "criciúma", "criciuma ec"],
};

// Helper compartilhado para sincronização de jogos ao vivo
export async function performLiveSync(ctx: ActionCtx) {
  const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.warn("API_FOOTBALL_KEY não configurada no ambiente do Convex.");
    return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
  }

  try {
    // 1 única chamada busca TODOS os jogos ao vivo no mundo
    const response = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const fixtures = data.response || [];

    // Filtra apenas os jogos das nossas ligas
    const relevantFixtures = fixtures.filter((item: any) =>
      TRACKED_LEAGUE_IDS.includes(item.league?.id)
    );

    console.log(
      `Jogos ao vivo no mundo: ${fixtures.length} | Jogos nas nossas ligas: ${relevantFixtures.length}`
    );

    // Dispara a mutação interna para persistir no banco
    await ctx.runMutation(internal.ingestion.saveSyncedFixtures, {
      fixtures: relevantFixtures,
    });

    return {
      success: true,
      totalLiveWorld: fixtures.length,
      syncedCount: relevantFixtures.length,
    };
  } catch (error: any) {
    console.error("Falha ao sincronizar partidas ao vivo:", error);
    return { success: false, error: error.message };
  }
}

// 1. Action: busca dados externos via HTTP Fetch
export const syncLiveMatches = action({
  args: {},
  handler: async (ctx) => {
    return await performLiveSync(ctx);
  },
});

/**
 * Normaliza nomes de rodadas da API-Football para o padrão oficial brasileiro.
 * Exemplo: "Regular Season - 29" -> "Rodada 29"
 *          "Round 29" -> "Rodada 29"
 *          "29ª Rodada" -> "Rodada 29"
 */
export function normalizeRoundName(rawRound?: string | null): string {
  if (!rawRound) return "Rodada 1";

  const trimmed = rawRound.trim();

  // Se já for "Rodada X", preserva
  if (/^Rodada\s+\d+$/i.test(trimmed)) {
    const num = trimmed.replace(/\D/g, "");
    return `Rodada ${num}`;
  }

  // Captura "Regular Season - 29", "Regular Season - 1", "Round 29", etc.
  const regularSeasonMatch = trimmed.match(/(?:Regular\s+Season|Round)\s*[-:]?\s*(\d+)/i);
  if (regularSeasonMatch) {
    return `Rodada ${regularSeasonMatch[1]}`;
  }

  // Captura "29ª Rodada" ou "29 Rodada"
  const ptMatch = trimmed.match(/(\d+)\s*ª?\s*Rodada/i);
  if (ptMatch) {
    return `Rodada ${ptMatch[1]}`;
  }

  // Se for apenas o número da rodada (ex: "29")
  if (/^\d+$/.test(trimmed)) {
    return `Rodada ${trimmed}`;
  }

  return trimmed;
}

// 2. Mutation Interna: Normaliza e persiste os dados com idempotência e deduplicação
export const saveSyncedFixtures = internalMutation({
  args: {
    fixtures: v.any(),
  },
  handler: async (ctx, args) => {
    // Termos que identificam fases preliminares amadoras (FA Cup, etc.)
    // Apenas fases profissionais (1st Round Proper em diante) são persistidas
    const AMATEUR_ROUND_TERMS = [
      "qualifying",
      "preliminary",
      "qualifier",
      "extra preliminary",
      "pre-qualifying",
    ];
    const isAmateurRound = (round: string) => {
      const r = round.toLowerCase();
      return AMATEUR_ROUND_TERMS.some((t) => r.includes(t));
    };

    for (const item of args.fixtures) {
      const { fixture, league, teams, goals } = item;

      // Ignora fases preliminares amadoras durante a ingestão
      if (league.round && isAmateurRound(league.round)) continue;

      // 1. Garante a existência da Liga no banco
      let dbLeague = await ctx.db
        .query("leagues")
        .withIndex("by_externalId", (q) => q.eq("externalId", league.id))
        .first();

      if (!dbLeague) {
        // Tenta encontrar por nome aproximado antes de inserir
        const allLeagues = await ctx.db.query("leagues").collect();
        const normName = league.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        dbLeague = allLeagues.find((l) => {
          const lName = l.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return lName.includes(normName) || normName.includes(lName);
        }) ?? null;

        if (dbLeague && !dbLeague.externalId) {
          await ctx.db.patch(dbLeague._id, { externalId: league.id });
        }
      }

      if (!dbLeague) {
        const isCup = [2, 13, 73, 11, 45].includes(league.id);
        const leagueId = await ctx.db.insert("leagues", {
          name: league.name,
          country: league.country ?? "Internacional",
          logoUrl: league.logo ?? "",
          season: league.season ?? 2026,
          type: isCup ? "cup" : "league",
          externalId: league.id,
          priority: 50,
        });
        dbLeague = await ctx.db.get(leagueId);
      }

      if (!dbLeague) continue;

      const findOrCreateTeam = async (apiTeam: any) => {
        const allTeams = await ctx.db.query("teams").collect();
        const normalizedApiName = normalizeTeamName(apiTeam.name);

        const exactExternalMatch = allTeams.find((t) => t.externalId === apiTeam.id);
        const aliasMatch =
          apiTeam.id && CANONICAL_TEAM_ALIASES[apiTeam.id]
            ? allTeams.find((t) => {
                const normalizedExistingName = normalizeTeamName(t.name);
                return CANONICAL_TEAM_ALIASES[apiTeam.id].some(
                  (alias) =>
                    normalizedExistingName === alias ||
                    normalizedExistingName.includes(alias) ||
                    alias.includes(normalizedExistingName)
                );
              })
            : null;
        const byNormalizedName = allTeams.filter(
          (t) => normalizeTeamName(t.name) === normalizedApiName
        );
        const candidate =
          exactExternalMatch ??
          aliasMatch ??
          byNormalizedName.sort((a, b) => {
            const scoreA = Number(Boolean(a.externalId)) * 10 + Number(Boolean(a.logoUrl)) + Number(Boolean(a.code));
            const scoreB = Number(Boolean(b.externalId)) * 10 + Number(Boolean(b.logoUrl)) + Number(Boolean(b.code));
            return scoreB - scoreA;
          })[0] ??
          null;

        if (candidate) {
          if (apiTeam.id && candidate.externalId !== apiTeam.id) {
            await ctx.db.patch(candidate._id, {
              externalId: apiTeam.id,
            });
          }

          if (apiTeam.id && CANONICAL_TEAM_ALIASES[apiTeam.id]) {
            const canonicalName =
              apiTeam.id === 140 ? "Botafogo-SP" : apiTeam.id === 142 ? "Criciúma" : apiTeam.name ?? candidate.name;
            if (candidate.name !== canonicalName) {
              await ctx.db.patch(candidate._id, { name: canonicalName });
            }
          }

          const duplicates = allTeams.filter((t) => {
            if (t._id === candidate._id) return false;
            if (apiTeam.id && t.externalId === apiTeam.id) return true;
            if (apiTeam.id && CANONICAL_TEAM_ALIASES[apiTeam.id]) {
              const normalizedExistingName = normalizeTeamName(t.name);
              return CANONICAL_TEAM_ALIASES[apiTeam.id].some(
                (alias) =>
                  normalizedExistingName === alias ||
                  normalizedExistingName.includes(alias) ||
                  alias.includes(normalizedExistingName)
              );
            }
            return normalizeTeamName(t.name) === normalizedApiName;
          });

          for (const duplicate of duplicates) {
            const matches = await ctx.db.query("matches").collect();
            for (const match of matches) {
              if (match.homeTeamId === duplicate._id) {
                await ctx.db.patch(match._id, { homeTeamId: candidate._id });
              }
              if (match.awayTeamId === duplicate._id) {
                await ctx.db.patch(match._id, { awayTeamId: candidate._id });
              }
            }

            const matchEvents = await ctx.db.query("matchEvents").collect();
            for (const event of matchEvents) {
              if (event.teamId === duplicate._id) {
                await ctx.db.patch(event._id, { teamId: candidate._id });
              }
            }

            const standings = await ctx.db.query("standings").collect();
            for (const standing of standings) {
              if (standing.teamId === duplicate._id) {
                await ctx.db.patch(standing._id, { teamId: candidate._id });
              }
            }

            const scorers = await ctx.db.query("topScorers").collect();
            for (const scorer of scorers) {
              if (scorer.teamId === duplicate._id) {
                await ctx.db.patch(scorer._id, { teamId: candidate._id });
              }
            }

            const stadiums = await ctx.db.query("stadiums").collect();
            for (const stadium of stadiums) {
              if (stadium.teamId === duplicate._id) {
                await ctx.db.patch(stadium._id, { teamId: candidate._id });
              }
            }

            await ctx.db.delete(duplicate._id);
          }

          return candidate;
        }

        const teamId = await ctx.db.insert("teams", {
          name: apiTeam.name,
          code: apiTeam.code ?? undefined,
          logoUrl: apiTeam.logo ?? "",
          externalId: apiTeam.id,
        });
        return await ctx.db.get(teamId);
      };

      let dbHomeTeam = await findOrCreateTeam(teams.home);
      let dbAwayTeam = await findOrCreateTeam(teams.away);

      const isCanonicalCriciumaOperarioLiveFixture =
        fixture.id === 1520882 ||
        (fixture.timestamp &&
          new Date(fixture.timestamp * 1000).toISOString().slice(0, 10) === "2026-09-22");

      if (isCanonicalCriciumaOperarioLiveFixture) {
        dbHomeTeam = await findOrCreateTeam({
          id: 142,
          name: "Criciúma",
          code: "CRI",
          logo: "https://media.api-sports.io/football/teams/142.png",
        });
        dbAwayTeam = await findOrCreateTeam({
          id: 151,
          name: "Operário-PR",
          code: "OPE",
          logo: "https://media.api-sports.io/football/teams/151.png",
        });
      }

      if (!dbHomeTeam || !dbAwayTeam) continue;

      // 4. Mapeamento de status da API-Football para o schema do FutPulse
      const shortStatus = fixture.status?.short ?? "1H";
      let normalizedStatus:
        | "SCHEDULED"
        | "IN_PLAY"
        | "PAUSED"
        | "EXTRA_TIME"
        | "PENALTY_SHOOTOUT"
        | "FINISHED"
        | "POSTPONED" = "IN_PLAY";

      if (["1H", "2H"].includes(shortStatus)) normalizedStatus = "IN_PLAY";
      else if (shortStatus === "HT") normalizedStatus = "PAUSED";
      else if (shortStatus === "ET") normalizedStatus = "EXTRA_TIME";
      else if (shortStatus === "PEN") normalizedStatus = "PENALTY_SHOOTOUT";
      else if (["FT", "AET", "PEN_FT"].includes(shortStatus)) normalizedStatus = "FINISHED";
      else if (["PST", "CANC", "ABD"].includes(shortStatus)) normalizedStatus = "POSTPONED";
      else if (["NS", "TBD"].includes(shortStatus)) normalizedStatus = "SCHEDULED";

      // Normalização da Rodada: converte "Regular Season - 29" em "Rodada 29"
      const normalizedRound = normalizeRoundName(league.round);

      // 5. Deduplicação Inteligente:
      // Busca 1: por externalId oficial da partida
      let existingMatch = fixture.id
        ? await ctx.db
            .query("matches")
            .withIndex("by_externalId", (q) => q.eq("externalId", fixture.id))
            .first()
        : null;

      // Busca 2: na mesma liga, mesma rodada, envolvendo o mesmo mandante e visitante ou pelo menos um deles
      if (!existingMatch) {
        const matchesInRound = await ctx.db
          .query("matches")
          .withIndex("by_league_and_round", (q) =>
            q.eq("leagueId", dbLeague!._id).eq("round", normalizedRound)
          )
          .collect();

        existingMatch = matchesInRound.find(
          (m) =>
            (m.homeTeamId === dbHomeTeam._id && m.awayTeamId === dbAwayTeam._id) ||
            m.homeTeamId === dbHomeTeam._id ||
            m.awayTeamId === dbAwayTeam._id
        ) ?? null;
      }

      // Busca 3: no mesmo dia (intervalo de 18 horas) no mesmo campeonato compartilhando mandante ou visitante
      if (!existingMatch && fixture.timestamp) {
        const fixtureTime = fixture.timestamp * 1000;
        const timeWindowStart = fixtureTime - 18 * 60 * 60 * 1000;
        const timeWindowEnd = fixtureTime + 18 * 60 * 60 * 1000;

        const leagueMatches = await ctx.db
          .query("matches")
          .withIndex("by_league", (q) => q.eq("leagueId", dbLeague!._id))
          .collect();

        existingMatch = leagueMatches.find((m) => {
          const inWindow = m.startTime >= timeWindowStart && m.startTime <= timeWindowEnd;
          const sharesTeam =
            m.homeTeamId === dbHomeTeam._id ||
            m.awayTeamId === dbAwayTeam._id ||
            m.homeTeamId === dbAwayTeam._id ||
            m.awayTeamId === dbHomeTeam._id;
          return inWindow && sharesTeam;
        }) ?? null;
      }

      const venueName = fixture.venue?.name || fixture.stadium?.name || null;
      let dbStadium = null;

      if (venueName) {
        const normalizedVenueName = venueName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[-_]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const allStadiums = await ctx.db.query("stadiums").collect();
        dbStadium =
          allStadiums.find((stadium) => {
            const stadiumKey = stadium.name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[-_]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            return (
              stadiumKey === normalizedVenueName ||
              stadiumKey.includes(normalizedVenueName) ||
              normalizedVenueName.includes(stadiumKey)
            );
          }) ?? null;
      }

      const matchPayload = {
        externalId: fixture.id,
        leagueId: dbLeague._id,
        round: normalizedRound,
        homeTeamId: dbHomeTeam._id,
        awayTeamId: dbAwayTeam._id,
        stadiumId: dbStadium?._id,
        status: normalizedStatus,
        statusShort: shortStatus,
        minute: fixture.status?.elapsed ?? undefined,
        homeScore: goals.home ?? 0,
        awayScore: goals.away ?? 0,
        startTime: fixture.timestamp ? fixture.timestamp * 1000 : Date.now(),
      };

      if (existingMatch) {
        // Se SIM: atualiza o registro existente preservando as chaves corretas de time/estádio
        await ctx.db.patch(existingMatch._id, {
          externalId: fixture.id,
          leagueId: dbLeague._id,
          homeTeamId: dbHomeTeam._id,
          awayTeamId: dbAwayTeam._id,
          stadiumId: dbStadium?._id ?? existingMatch.stadiumId,
          status: normalizedStatus,
          statusShort: shortStatus,
          minute: fixture.status?.elapsed ?? existingMatch.minute,
          homeScore: goals.home ?? existingMatch.homeScore,
          awayScore: goals.away ?? existingMatch.awayScore,
          round: normalizedRound,
          startTime: existingMatch.startTime || matchPayload.startTime,
        });

        if (normalizedStatus === "FINISHED") {
          const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;
          if (apiKey) {
            try {
              const eventsResponse = await fetch(
                `https://v3.football.api-sports.io/fixtures/events?fixture=${fixture.id}`,
                {
                  headers: {
                    "x-apisports-key": apiKey,
                  },
                }
              );

              if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json();
                const rawEvents = eventsData.response || [];

                if (rawEvents.length > 0) {
                  await ctx.runMutation(internal.ingestion.saveSyncedEvents, {
                    matchId: existingMatch._id,
                    events: rawEvents,
                  });
                }
              } else {
                console.warn(
                  `Não foi possível atualizar os lances finais da partida ${fixture.id}: ${eventsResponse.status} ${eventsResponse.statusText}`
                );
              }
            } catch (error) {
              console.error(`Erro ao sincronizar lances finais da partida ${fixture.id}:`, error);
            }
          }
        }
      } else {
        // Se NÃO existir: proceda com a inserção
        const createdMatchId = await ctx.db.insert("matches", matchPayload);

        if (normalizedStatus === "FINISHED") {
          const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;
          if (apiKey) {
            try {
              const eventsResponse = await fetch(
                `https://v3.football.api-sports.io/fixtures/events?fixture=${fixture.id}`,
                {
                  headers: {
                    "x-apisports-key": apiKey,
                  },
                }
              );

              if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json();
                const rawEvents = eventsData.response || [];

                if (rawEvents.length > 0) {
                  await ctx.runMutation(internal.ingestion.saveSyncedEvents, {
                    matchId: createdMatchId,
                    events: rawEvents,
                  });
                }
              } else {
                console.warn(
                  `Não foi possível atualizar os lances finais da partida ${fixture.id}: ${eventsResponse.status} ${eventsResponse.statusText}`
                );
              }
            } catch (error) {
              console.error(`Erro ao sincronizar lances finais da partida ${fixture.id}:`, error);
            }
          }
        }
      }
    }
  },
});

// Sincroniza todas as partidas do dia atual (encerradas, ao vivo e agendadas)
export const syncDailyFixtures = action({
  args: {
    date: v.optional(v.string()), // Formato YYYY-MM-DD (opcional, padrão: hoje)
  },
  handler: async (ctx, args) => {
    const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;

    if (!apiKey) {
      console.warn("API_FOOTBALL_KEY não configurada no ambiente do Convex.");
      return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
    }

    // Define a data no formato YYYY-MM-DD
    const targetDate = args.date ?? new Date().toISOString().split("T")[0];

    try {
      // 1 única chamada busca toda a grade global do dia selecionado
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${targetDate}`, {
        headers: {
          "x-apisports-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fixtures = data.response || [];

      // Filtra apenas as nossas 10 competições
      const relevantFixtures = fixtures.filter((item: any) =>
        TRACKED_LEAGUE_IDS.includes(item.league?.id)
      );

      console.log(
        `[Grade Diária] Total no mundo em ${targetDate}: ${fixtures.length} | Nas nossas ligas: ${relevantFixtures.length}`
      );

      // Persiste no banco com idempotência
      await ctx.runMutation(internal.ingestion.saveSyncedFixtures, {
        fixtures: relevantFixtures,
      });

      return {
        success: true,
        date: targetDate,
        totalWorld: fixtures.length,
        syncedCount: relevantFixtures.length,
      };
    } catch (error: any) {
      console.error("Falha ao sincronizar grade diária:", error);
      return { success: false, error: error.message };
    }
  },
});

// Sincroniza eventos (golos, cartões, substituições) para um jogo específico sob demanda
export const syncMatchEvents = action({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;

    if (!apiKey) {
      return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
    }

    const match = await ctx.runQuery(api.matches.getMatchDetails, { matchId: args.matchId });
    if (!match || !match.externalId) {
      return { success: false, reason: "MATCH_NOT_FOUND_OR_NO_EXTERNAL_ID" };
    }

    try {
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures/events?fixture=${match.externalId}`,
        {
          headers: {
            "x-apisports-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawEvents = data.response || [];

      await ctx.runMutation(internal.ingestion.saveSyncedEvents, {
        matchId: args.matchId,
        events: rawEvents,
      });

      return {
        success: true,
        eventCount: rawEvents.length,
      };
    } catch (error: any) {
      console.error("Falha ao sincronizar eventos:", error);
      return { success: false, error: error.message };
    }
  },
});

// Mutação interna para gravar os lances sem duplicação
export const saveSyncedEvents = internalMutation({
  args: {
    matchId: v.id("matches"),
    events: v.any(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    for (const item of args.events) {
      const eventTeamExternalId = item.team?.id;

      let matchedTeamId = match.homeTeamId;
      const homeTeam = await ctx.db.get(match.homeTeamId);
      if (homeTeam && homeTeam.externalId !== eventTeamExternalId) {
        matchedTeamId = match.awayTeamId;
      }

      let eventType: "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "VAR" = "GOAL";
      const apiType = item.type?.toLowerCase();
      const apiDetail = item.detail?.toLowerCase() || "";

      if (apiType === "goal") {
        eventType = "GOAL";
      } else if (apiType === "card") {
        eventType = apiDetail.includes("red") ? "RED_CARD" : "YELLOW_CARD";
      } else if (apiType === "subst") {
        eventType = "SUBSTITUTION";
      } else if (apiType === "var") {
        eventType = "VAR";
      }

      const playerName = item.player?.name ?? "Jogador";
      const eventKey = `${args.matchId}-${item.time?.elapsed ?? 0}-${playerName}-${eventType}`;

      const existing = await ctx.db
        .query("matchEvents")
        .withIndex("by_externalId", (q) => q.eq("externalId", eventKey))
        .first();

      const eventData = {
        matchId: args.matchId,
        externalId: eventKey,
        minute: item.time?.elapsed ?? 0,
        extraMinute: item.time?.extra ?? undefined,
        teamId: matchedTeamId,
        playerName,
        assistPlayerName: item.assist?.name ?? undefined,
        type: eventType,
        detail: item.detail ?? undefined,
      };

      if (existing) {
        await ctx.db.patch(existing._id, eventData);
      } else {
        await ctx.db.insert("matchEvents", eventData);
      }
    }
  },
});

// Sincroniza estatísticas da partida sob demanda
export const syncMatchStatistics = action({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;

    if (!apiKey) {
      return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
    }

    const match = await ctx.runQuery(api.matches.getMatchDetails, { matchId: args.matchId });
    if (!match || !match.externalId) {
      return { success: false, reason: "MATCH_NOT_FOUND_OR_NO_EXTERNAL_ID" };
    }

    try {
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${match.externalId}`,
        {
          headers: {
            "x-apisports-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawStats = data.response || [];

      if (rawStats.length < 2) {
        return { success: false, reason: "INSUFFICIENT_DATA" };
      }

      const homeApiId = match.homeTeam?.externalId;
      const homeRaw = rawStats.find((s: any) => s.team?.id === homeApiId) || rawStats[0];
      const awayRaw = rawStats.find((s: any) => s.team?.id !== homeApiId) || rawStats[1];

      const getStat = (teamStats: any, type: string) => {
        const item = teamStats.statistics?.find((s: any) => s.type?.toLowerCase() === type.toLowerCase());
        if (!item || item.value === null || item.value === undefined) return 0;
        if (typeof item.value === "string") {
          return parseInt(item.value.replace("%", ""), 10) || 0;
        }
        return item.value;
      };

      await ctx.runMutation(internal.ingestion.saveSyncedStatistics, {
        matchId: args.matchId,
        homePossession: getStat(homeRaw, "Ball Possession"),
        awayPossession: getStat(awayRaw, "Ball Possession"),
        homeShotsOnTarget: getStat(homeRaw, "Shots on Goal"),
        awayShotsOnTarget: getStat(awayRaw, "Shots on Goal"),
        homeTotalShots: getStat(homeRaw, "Total Shots"),
        awayTotalShots: getStat(awayRaw, "Total Shots"),
        homeCorners: getStat(homeRaw, "Corner Kicks"),
        awayCorners: getStat(awayRaw, "Corner Kicks"),
        homeFouls: getStat(homeRaw, "Fouls"),
        awayFouls: getStat(awayRaw, "Fouls"),
        homeYellowCards: getStat(homeRaw, "Yellow Cards") || undefined,
        awayYellowCards: getStat(awayRaw, "Yellow Cards") || undefined,
        homeRedCards: getStat(homeRaw, "Red Cards") || undefined,
        awayRedCards: getStat(awayRaw, "Red Cards") || undefined,
        homePasses: getStat(homeRaw, "Total Passes") || undefined,
        awayPasses: getStat(awayRaw, "Total Passes") || undefined,
        homePassAccuracy: getStat(homeRaw, "Passes %") || undefined,
        awayPassAccuracy: getStat(awayRaw, "Passes %") || undefined,
      });

      return { success: true };
    } catch (error: any) {
      console.error("Falha ao sincronizar estatísticas:", error);
      return { success: false, error: error.message };
    }
  },
});

export const saveSyncedStatistics = internalMutation({
  args: {
    matchId: v.id("matches"),
    homePossession: v.number(),
    awayPossession: v.number(),
    homeShotsOnTarget: v.number(),
    awayShotsOnTarget: v.number(),
    homeTotalShots: v.number(),
    awayTotalShots: v.number(),
    homeCorners: v.number(),
    awayCorners: v.number(),
    homeFouls: v.number(),
    awayFouls: v.number(),
    homeYellowCards: v.optional(v.number()),
    awayYellowCards: v.optional(v.number()),
    homeRedCards: v.optional(v.number()),
    awayRedCards: v.optional(v.number()),
    homePasses: v.optional(v.number()),
    awayPasses: v.optional(v.number()),
    homePassAccuracy: v.optional(v.number()),
    awayPassAccuracy: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("matchStatistics")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    const { matchId, ...stats } = args;

    if (existing) {
      await ctx.db.patch(existing._id, stats);
    } else {
      await ctx.db.insert("matchStatistics", { matchId, ...stats });
    }
  },
});

export const repairCanonicalTeamIds = mutation({
  args: {},
  handler: async (ctx) => {
    const canonicalMap = new Map<number, { name: string; externalId: number }>([
      [140, { name: "Botafogo-SP", externalId: 140 }],
      [142, { name: "Criciúma", externalId: 142 }],
    ]);

    const allTeams = await ctx.db.query("teams").collect();
    const teamById = new Map(allTeams.map((team) => [team._id, team]));

    for (const [externalId, target] of canonicalMap) {
      const candidates = allTeams.filter((team) => {
        if (team.externalId === externalId) return true;
        const normalizedName = normalizeTeamName(team.name);
        const aliases = CANONICAL_TEAM_ALIASES[externalId] ?? [];
        return aliases.some(
          (alias) =>
            normalizedName === alias || normalizedName.includes(alias) || alias.includes(normalizedName)
        );
      });

      let canonical: any =
        candidates.find((team) => team.externalId === externalId && team.name === target.name) ??
        candidates.find((team) => team.externalId === externalId) ??
        candidates[0] ??
        null;

      if (!canonical) {
        const createdId = await ctx.db.insert("teams", {
          name: target.name,
          logoUrl: "",
          externalId: target.externalId,
        });
        canonical = await ctx.db.get(createdId);
      }

      if (canonical) {
        await ctx.db.patch(canonical._id, {
          name: target.name,
          externalId: target.externalId,
          logoUrl: canonical.logoUrl || "",
        });
      }

      for (const duplicate of candidates.filter((team) => team._id !== canonical?._id)) {
        const matches = await ctx.db.query("matches").collect();
        for (const match of matches) {
          if (match.homeTeamId === duplicate._id) {
            await ctx.db.patch(match._id, { homeTeamId: canonical!._id });
          }
          if (match.awayTeamId === duplicate._id) {
            await ctx.db.patch(match._id, { awayTeamId: canonical!._id });
          }
        }

        const events = await ctx.db.query("matchEvents").collect();
        for (const event of events) {
          if (event.teamId === duplicate._id) {
            await ctx.db.patch(event._id, { teamId: canonical!._id });
          }
        }

        const standings = await ctx.db.query("standings").collect();
        for (const row of standings) {
          if (row.teamId === duplicate._id) {
            await ctx.db.patch(row._id, { teamId: canonical!._id });
          }
        }

        const scorers = await ctx.db.query("topScorers").collect();
        for (const scorer of scorers) {
          if (scorer.teamId === duplicate._id) {
            await ctx.db.patch(scorer._id, { teamId: canonical!._id });
          }
        }

        const stadiums = await ctx.db.query("stadiums").collect();
        for (const stadium of stadiums) {
          if (stadium.teamId === duplicate._id) {
            await ctx.db.patch(stadium._id, { teamId: canonical!._id });
          }
        }

        await ctx.db.delete(duplicate._id);
      }
    }

    const canonicalTeamIds = new Set<number>([140, 142]);
    const normalizedMatches = await ctx.db.query("matches").collect();

    for (const match of normalizedMatches) {
      const isSelfMatch = match.homeTeamId === match.awayTeamId;
      if (isSelfMatch) {
        const team = teamById.get(match.homeTeamId);
        if (team && canonicalTeamIds.has(team.externalId ?? -1)) {
          await ctx.db.delete(match._id);
        }
      }
    }

    const allMatchRows = await ctx.db.query("matches").collect();
    const targetTeams = await ctx.db.query("teams").collect();
    const targetTeamIds = new Set(targetTeams.filter((team) => team.externalId && canonicalTeamIds.has(team.externalId)).map((team) => team._id));

    for (const teamId of targetTeamIds) {
      const teamMatches = allMatchRows.filter(
        (match) => match.homeTeamId === teamId || match.awayTeamId === teamId
      );

      const byRound = new Map<string, { matchId: any; startTime: number }>();
      for (const match of teamMatches) {
        const roundKey = match.round || "Rodada 1";
        const existing = byRound.get(roundKey);
        if (!existing || match.startTime < existing.startTime) {
          byRound.set(roundKey, { matchId: match._id, startTime: match.startTime });
        }
      }

      for (const match of teamMatches) {
        const keep = byRound.get(match.round || "Rodada 1")?.matchId === match._id;
        if (!keep) {
          await ctx.db.delete(match._id);
        }
      }
    }

    const leagues = await ctx.db.query("leagues").collect();
    for (const league of leagues) {
      const allLeagueMatches = await ctx.db.query("matches").collect();
      const leagueMatches = allLeagueMatches.filter((match) => match.leagueId === league._id && match.status === "FINISHED");
      if (leagueMatches.length === 0) continue;

      const teamIdSet = new Set<string>();
      for (const match of leagueMatches) {
        teamIdSet.add(match.homeTeamId as string);
        teamIdSet.add(match.awayTeamId as string);
      }

      const teamDocMap = new Map<string, any>();
      for (const teamId of teamIdSet) {
        const team = await ctx.db.get(teamId as any);
        if (team) teamDocMap.set(teamId, team);
      }

      const list = [] as any[];
      for (const tid of teamIdSet) {
        const played = leagueMatches.filter(
          (match) => match.homeTeamId === tid || match.awayTeamId === tid
        ).length;
        list.push({ teamId: tid, played });
      }

      list.sort((a, b) => b.played - a.played);
      const maxPlayed = list[0]?.played ?? 0;
      if (maxPlayed > 29) {
        for (const row of list) {
          if (row.played > 29) {
            const teamMatches = leagueMatches.filter(
              (match) => match.homeTeamId === row.teamId || match.awayTeamId === row.teamId
            );
            const roundsSeen = new Set<string>();
            for (const match of [...teamMatches].sort((a, b) => a.startTime - b.startTime)) {
              const roundKey = match.round || "Rodada 1";
              if (roundsSeen.has(roundKey)) {
                await ctx.db.delete(match._id);
              } else {
                roundsSeen.add(roundKey);
              }
            }
          }
        }
      }
    }

    return { success: true, repairedTeams: [140, 142] };
  },
});

// Polling inteligente que só consome a API se houver partidas ao vivo dentro do horário de jogos
export const smartLivePolling = action({
  args: {},
  handler: async (ctx) => {
    // Horário de Brasília (UTC-3)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const brHours = (utcHours - 3 + 24) % 24;

    // Se estiver fora da janela de jogos (entre 00:00 e 08:59 BRT), aborta
    if (brHours < 9) {
      console.log(`[Smart Polling] Madrugada (${brHours}h BRT). Polling desativado.`);
      return { skipped: true, reason: "OFF_HOURS" };
    }

    const recentMatches: any[] = (await ctx.runQuery(api.matches.listMatches, {
      statusFilter: "ALL",
    })) ?? [];

    const activeMatches = recentMatches.filter((m) =>
      ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
    );

    const recentLiveDates = Array.from(
      new Set(
        recentMatches
          .filter(
            (m) =>
              m.status !== "SCHEDULED" &&
              m.startTime >= Date.now() - 36 * 60 * 60 * 1000
          )
          .map((m) => new Date(m.startTime).toISOString().slice(0, 10))
      )
    );

    if ((!activeMatches || activeMatches.length === 0) && recentLiveDates.length === 0) {
      console.log("[Smart Polling] Nenhum jogo ao vivo ou recente para sincronizar no momento.");
      return { skipped: true, reason: "NO_ACTIVE_MATCHES" };
    }

    const datesToSync = recentLiveDates.length > 0 ? recentLiveDates : [];
    const syncResult = activeMatches.length > 0 ? await performLiveSync(ctx) : { success: true, syncedCount: 0 };

    for (const date of datesToSync) {
      const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;
      if (!apiKey) {
        break;
      }

      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: {
          "x-apisports-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao sincronizar ${date}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fixtures = data.response || [];
      const relevantFixtures = fixtures.filter((item: any) =>
        TRACKED_LEAGUE_IDS.includes(item.league?.id)
      );

      if (relevantFixtures.length > 0) {
        await ctx.runMutation(internal.ingestion.saveSyncedFixtures, {
          fixtures: relevantFixtures,
        });
      }
    }

    console.log(
      `[Smart Polling] ${activeMatches.length} jogos ao vivo e ${datesToSync.length} datas recentes sincronizadas (${brHours}h BRT).`
    );
    return { skipped: false, result: syncResult, syncedDates: datesToSync };
  },
});

// Sincroniza a tabela de classificação de uma liga sob demanda
export const syncLeagueStandings = action({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;

    if (!apiKey) {
      console.warn("API_FOOTBALL_KEY em falta");
      return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
    }

    const leagues: any[] = (await ctx.runQuery(api.leagues.listLeagues, {})) ?? [];
    const leagueDoc = leagues.find((l: any) => l._id === args.leagueId);

    if (!leagueDoc || !leagueDoc.externalId) {
      console.warn("Liga não encontrada ou sem externalId:", args.leagueId);
      return { success: false, reason: "LEAGUE_NOT_FOUND" };
    }

    // Usa a temporada registada ou o ano corrente caso seja indefinido/inválido
    const currentYear = new Date().getFullYear();
    let season = leagueDoc.season || currentYear;

    console.log(`[Standings] A consultar liga ${leagueDoc.externalId} (${leagueDoc.name}), época ${season}...`);

    try {
      let response = await fetch(
        `https://v3.football.api-sports.io/standings?league=${leagueDoc.externalId}&season=${season}`,
        {
          headers: {
            "x-apisports-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
      }

      let data = await response.json();
      const hasErrors = data.errors && (Array.isArray(data.errors) ? data.errors.length > 0 : Object.keys(data.errors).length > 0);
      console.log(
        "[Standings] Resposta recebida da API:",
        hasErrors ? JSON.stringify(data.errors) : (data.response?.[0]?.league?.name ?? JSON.stringify(data.errors))
      );

      let rawStandings = data.response?.[0]?.league?.standings?.[0] || [];

      // Suporte para múltiplos grupos ou copas (Champions League, Libertadores, etc.)
      if (rawStandings.length === 0 && Array.isArray(data.response?.[0]?.league?.standings)) {
        rawStandings = data.response[0].league.standings.flat();
      }

      // Se a época pesquisada retornar vazia, tenta a época anterior (comum em calendários europeus e transições)
      if (rawStandings.length === 0 && (!data.response || data.response.length === 0)) {
        const fallbackSeason = season - 1;
        console.log(`[Standings] Nenhum dado para época ${season}. Tentando época anterior (${fallbackSeason})...`);
        const fallbackRes = await fetch(
          `https://v3.football.api-sports.io/standings?league=${leagueDoc.externalId}&season=${fallbackSeason}`,
          {
            headers: {
              "x-apisports-key": apiKey,
            },
          }
        );

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          let fallbackStandings = fallbackData.response?.[0]?.league?.standings?.[0] || [];
          if (fallbackStandings.length === 0 && Array.isArray(fallbackData.response?.[0]?.league?.standings)) {
            fallbackStandings = fallbackData.response[0].league.standings.flat();
          }

          if (fallbackStandings.length > 0) {
            console.log(`[Standings] Sucesso com a época ${fallbackSeason}! Total de times: ${fallbackStandings.length}`);
            data = fallbackData;
            rawStandings = fallbackStandings;
            season = fallbackSeason;
          }
        }
      }

      if (rawStandings.length === 0) {
        console.warn("[Standings] Nenhum registo encontrado na resposta para esta época/liga.", {
          season,
          externalId: leagueDoc.externalId,
          errors: data.errors,
          responseLength: data.response?.length,
        });
        return { success: false, reason: "EMPTY_STANDINGS", data };
      }

      await ctx.runMutation(internal.ingestion.saveSyncedStandings, {
        leagueId: args.leagueId,
        season: season,
        standings: rawStandings,
      });

      return {
        success: true,
        count: rawStandings.length,
      };
    } catch (error: any) {
      console.error("Falha ao sincronizar classificação:", error);
      return { success: false, error: error.message };
    }
  },
});

export const saveSyncedStandings = internalMutation({
  args: {
    leagueId: v.id("leagues"),
    season: v.number(),
    standings: v.any(),
  },
  handler: async (ctx, args) => {
    // Mantém a temporada da liga sincronizada
    await ctx.db.patch(args.leagueId, { season: args.season });

    const existing = await ctx.db
      .query("standings")
      .withIndex("by_league_rank", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    for (const item of args.standings) {
      const teamExternalId = item.team?.id;

      let team = await ctx.db
        .query("teams")
        .withIndex("by_externalId", (q) => q.eq("externalId", teamExternalId))
        .first();

      if (!team) {
        const teamId = await ctx.db.insert("teams", {
          name: item.team?.name ?? "Time",
          logoUrl: item.team?.logo ?? "",
          externalId: teamExternalId,
        });
        team = await ctx.db.get(teamId);
      }

      if (team) {
        await ctx.db.insert("standings", {
          leagueId: args.leagueId,
          season: args.season,
          rank: item.rank,
          teamId: team._id,
          points: item.points ?? 0,
          goalsDiff: item.goalsDiff ?? 0,
          form: item.form ?? undefined,
          played: item.all?.played ?? 0,
          win: item.all?.win ?? 0,
          draw: item.all?.draw ?? 0,
          lose: item.all?.lose ?? 0,
          goalsFor: item.all?.goals?.for ?? 0,
          goalsAgainst: item.all?.goals?.against ?? 0,
          description: item.description ?? undefined,
        });
      }
    }
  },
});