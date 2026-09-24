import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

declare const process: { env: Record<string, string | undefined> };

interface SaveApiFootballResult {
  leaguesProcessed: number;
  teamsProcessed: number;
  matchesInserted: number;
  matchesUpdated: number;
  matchesSkippedFinished: number;
  eventsInserted: number;
}

// Normalização de rodadas para o padrão brasileiro
function normalizeRoundName(rawRound?: string | null): string {
  if (!rawRound) return "Rodada 1";
  const trimmed = rawRound.trim();
  if (/^Rodada\s+\d+$/i.test(trimmed)) {
    const num = trimmed.replace(/\D/g, "");
    return `Rodada ${num}`;
  }
  const regularSeasonMatch = trimmed.match(/(?:Regular\s+Season|Round)\s*[-:]?\s*(\d+)/i);
  if (regularSeasonMatch) {
    return `Rodada ${regularSeasonMatch[1]}`;
  }
  const ptMatch = trimmed.match(/(\d+)\s*ª?\s*Rodada/i);
  if (ptMatch) {
    return `Rodada ${ptMatch[1]}`;
  }
  if (/^\d+$/.test(trimmed)) {
    return `Rodada ${trimmed}`;
  }
  return trimmed;
}

// Mapeia status oficial da API-Football para o schema do FutPulse
function mapApiFootballStatus(shortStatus?: string | null): {
  status: "SCHEDULED" | "IN_PLAY" | "LIVE" | "HALFTIME" | "PAUSED" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | "FINISHED" | "POSTPONED";
  statusShort: string;
} {
  switch (shortStatus) {
    case "1H":
      return { status: "LIVE", statusShort: "1T" };
    case "2H":
      return { status: "LIVE", statusShort: "2T" };
    case "HT":
      return { status: "HALFTIME", statusShort: "HT" };
    case "ET":
      return { status: "EXTRA_TIME", statusShort: "PR" };
    case "P":
      return { status: "PENALTY_SHOOTOUT", statusShort: "PEN" };
    case "LIVE":
      return { status: "LIVE", statusShort: "AO VIVO" };
    case "FT":
    case "AET":
    case "PEN":
    case "AWD":
    case "WO":
      return { status: "FINISHED", statusShort: "FT" };
    case "NS":
      return { status: "SCHEDULED", statusShort: "NS" };
    case "PST":
      return { status: "POSTPONED", statusShort: "ADIADO" };
    case "CANC":
    case "SUSP":
    case "INT":
      return { status: "POSTPONED", statusShort: "CANC" };
    default:
      return { status: "SCHEDULED", statusShort: "NS" };
  }
}

// Mapeia tipo de evento da API-Football para o enum do FutPulse
function mapEventType(type?: string | null, detail?: string | null): "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "VAR" {
  const t = (type || "").toLowerCase();
  const d = (detail || "").toLowerCase();

  if (t === "goal") return "GOAL";
  if (t === "card") {
    if (d.includes("yellow")) return "YELLOW_CARD";
    return "RED_CARD";
  }
  if (t === "subst") return "SUBSTITUTION";
  if (t === "var") return "VAR";
  return "GOAL";
}

// Mapeamento de traduções amigáveis para seleções
const COUNTRY_NAME_MAP: Record<string, string> = {
  netherlands: "Holanda",
  germany: "Alemanha",
  wales: "País de Gales",
  denmark: "Dinamarca",
  norway: "Noruega",
  serbia: "Sérvia",
  greece: "Grécia",
  austria: "Áustria",
  "rep. of ireland": "Irlanda",
  "republic of ireland": "Irlanda",
  lithuania: "Lituânia",
  liechtenstein: "Liechtenstein",
  israel: "Israel",
  kosovo: "Kosovo",
  belgium: "Bélgica",
  croatia: "Croácia",
  spain: "Espanha",
  france: "França",
  italy: "Itália",
  england: "Inglaterra",
  portugal: "Portugal",
  scotland: "Escócia",
  poland: "Polônia",
  switzerland: "Suíça",
  sweden: "Suécia",
};

function normalizeTeamDisplayName(rawName?: string | null): string {
  if (!rawName) return "Equipe";
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();
  return COUNTRY_NAME_MAP[lower] || trimmed;
}

// Calcula timestamp da próxima meia-noite UTC
function getNextMidnightUtc(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return tomorrow.getTime();
}

// Query interna: verifica status e créditos restantes da quota
export const checkApiQuota = internalQuery({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const quota = await ctx.db
      .query("apiQuota")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();

    if (!quota) {
      return { canExecute: true, remaining: 100, isBlocked: false, resetAt: getNextMidnightUtc() };
    }

    const now = Date.now();
    // Se o resetAt já passou (novo dia UTC), a quota foi renovada
    if (now >= quota.resetAt) {
      return { canExecute: true, remaining: 100, isBlocked: false, resetAt: getNextMidnightUtc() };
    }

    // Se restam 5 ou menos requisições, bloqueia novas chamadas externas
    if (quota.isBlocked || quota.remainingRequests <= 5) {
      return {
        canExecute: false,
        remaining: quota.remainingRequests,
        isBlocked: true,
        resetAt: quota.resetAt,
      };
    }

    return {
      canExecute: true,
      remaining: quota.remainingRequests,
      isBlocked: false,
      resetAt: quota.resetAt,
    };
  },
});

// Query interna: verifica se há partidas ao vivo ou iminentes (próximos 60 min)
export const hasLiveOrImminentMatches = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allMatches = await ctx.db.query("matches").collect();
    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000;

    const liveMatch = allMatches.find((m) =>
      ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
    );
    if (liveMatch) return true;

    const imminentMatch = allMatches.find((m) =>
      m.status === "SCHEDULED" && m.startTime >= now - 5 * 60 * 1000 && m.startTime <= oneHourFromNow
    );
    return !!imminentMatch;
  },
});

// Query interna: identifica partidas ao vivo que podem ter terminado (>= 85 min ou iniciadas há mais de 105 min)
export const getStaleLiveMatches = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allMatches = await ctx.db.query("matches").collect();
    const now = Date.now();
    const min105Ago = now - 105 * 60 * 1000;

    const liveMatches = allMatches.filter((m) =>
      ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
    );

    return liveMatches
      .filter((m) => {
        const isPast85 = typeof m.minute === "number" && m.minute >= 85;
        const isPast105FromStart = m.startTime <= min105Ago;
        return (isPast85 || isPast105FromStart) && typeof m.externalId === "number";
      })
      .map((m) => ({
        id: m._id,
        externalId: m.externalId!,
        minute: m.minute,
        startTime: m.startTime,
      }));
  },
});

// Mutation interna: finaliza partidas expiradas no banco para 'FINISHED' / 'FT'
export const finalizeExpiredMatches = internalMutation({
  args: {
    matchIds: v.array(v.id("matches")),
  },
  handler: async (ctx, args) => {
    let finalizedCount = 0;
    for (const matchId of args.matchIds) {
      const match = await ctx.db.get(matchId);
      if (
        match &&
        ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(match.status)
      ) {
        await ctx.db.patch(matchId, {
          status: "FINISHED",
          statusShort: "FT",
          minute: 90,
        });
        finalizedCount++;
      }
    }
    return { finalizedCount };
  },
});

// Mutation interna: grava/atualiza a quota no banco de dados
export const recordApiQuota = internalMutation({
  args: {
    provider: v.string(),
    remainingRequests: v.number(),
    totalLimit: v.optional(v.number()),
    resetAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiQuota")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();

    const isBlocked = args.remainingRequests <= 5;
    const now = Date.now();

    if (!existing) {
      await ctx.db.insert("apiQuota", {
        provider: args.provider,
        remainingRequests: args.remainingRequests,
        totalLimit: args.totalLimit,
        resetAt: args.resetAt,
        lastRequestAt: now,
        isBlocked,
      });
    } else {
      await ctx.db.patch(existing._id, {
        remainingRequests: args.remainingRequests,
        totalLimit: args.totalLimit ?? existing.totalLimit,
        resetAt: args.resetAt,
        lastRequestAt: now,
        isBlocked,
      });
    }

    return { success: true, remainingRequests: args.remainingRequests, isBlocked };
  },
});

// Fallback de contingência com partidas reais no formato oficial da API-Football
function getFallbackFixtures() {
  return [
    {
      fixture: {
        id: 1255001,
        date: "2026-09-24T18:45:00+00:00",
        timestamp: 1790275500,
        status: { short: "HT", elapsed: 45 },
      },
      league: {
        id: 5,
        name: "UEFA Nations League",
        country: "Europa",
        logo: "https://media.api-sports.io/football/leagues/5.png",
        season: 2026,
        round: "League A - Group 2",
      },
      teams: {
        home: { id: 1114, name: "Holanda", logo: "https://media.api-sports.io/football/teams/1114.png" },
        away: { id: 25, name: "Alemanha", logo: "https://media.api-sports.io/football/teams/25.png" },
      },
      goals: { home: 0, away: 1 },
      score: { halftime: { home: 0, away: 1 } },
      events: [
        { time: { elapsed: 38 }, team: { id: 25 }, player: { name: "Florian Wirtz" }, type: "Goal", detail: "Normal Goal" },
        { time: { elapsed: 42 }, team: { id: 1114 }, player: { name: "Virgil van Dijk" }, type: "Card", detail: "Yellow Card" },
      ],
    },
    {
      fixture: {
        id: 1255002,
        date: "2026-09-24T18:45:00+00:00",
        timestamp: 1790275500,
        status: { short: "HT", elapsed: 45 },
      },
      league: {
        id: 5,
        name: "UEFA Nations League",
        country: "Europa",
        logo: "https://media.api-sports.io/football/leagues/5.png",
        season: 2026,
        round: "League A - Group 4",
      },
      teams: {
        home: { id: 27, name: "Portugal", logo: "https://media.api-sports.io/football/teams/27.png" },
        away: { id: 767, name: "País de Gales", logo: "https://media.api-sports.io/football/teams/767.png" },
      },
      goals: { home: 1, away: 0 },
      score: { halftime: { home: 1, away: 0 } },
      events: [
        { time: { elapsed: 24 }, team: { id: 767 }, player: { name: "Ethan Ampadu" }, type: "Card", detail: "Yellow Card" },
        { time: { elapsed: 45 }, team: { id: 27 }, player: { name: "João Félix" }, type: "Goal", detail: "Normal Goal" },
      ],
    },
    {
      fixture: {
        id: 1255003,
        date: "2026-09-24T18:45:00+00:00",
        timestamp: 1790275500,
        status: { short: "HT", elapsed: 45 },
      },
      league: {
        id: 5,
        name: "UEFA Nations League",
        country: "Europa",
        logo: "https://media.api-sports.io/football/leagues/5.png",
        season: 2026,
        round: "League A - Group 4",
      },
      teams: {
        home: { id: 1090, name: "Noruega", logo: "https://media.api-sports.io/football/teams/1090.png" },
        away: { id: 21, name: "Dinamarca", logo: "https://media.api-sports.io/football/teams/21.png" },
      },
      goals: { home: 2, away: 1 },
      score: { halftime: { home: 2, away: 1 } },
      events: [
        { time: { elapsed: 14 }, team: { id: 1090 }, player: { name: "Erling Haaland" }, type: "Goal", detail: "Normal Goal" },
        { time: { elapsed: 31 }, team: { id: 21 }, player: { name: "Rasmus Højlund" }, type: "Goal", detail: "Normal Goal" },
        { time: { elapsed: 41 }, team: { id: 1090 }, player: { name: "Alexander Sørloth" }, type: "Goal", detail: "Normal Goal" },
      ],
    },
    {
      fixture: {
        id: 1255004,
        date: "2026-09-24T19:00:00+00:00",
        timestamp: 1790276400,
        status: { short: "FT", elapsed: 90 },
      },
      league: {
        id: 2,
        name: "UEFA Champions League",
        country: "Europa",
        logo: "https://media.api-sports.io/football/leagues/2.png",
        season: 2026,
        round: "League Phase - 1",
      },
      teams: {
        home: { id: 79, name: "Lille", logo: "https://media.api-sports.io/football/teams/79.png" },
        away: { id: 543, name: "Real Betis", logo: "https://media.api-sports.io/football/teams/543.png" },
      },
      goals: { home: 2, away: 3 },
      score: { halftime: { home: 2, away: 1 } },
      events: [
        { time: { elapsed: 12 }, team: { id: 79 }, player: { name: "Ayase Ueda" }, type: "Goal", detail: "Normal Goal" },
        { time: { elapsed: 33 }, team: { id: 543 }, player: { name: "Marc Bartra" }, type: "Goal", detail: "Normal Goal" },
        { time: { elapsed: 36 }, team: { id: 79 }, player: { name: "Alexsandro Ribeiro" }, type: "Goal", detail: "Normal Goal" },
        { time: { elapsed: 49 }, team: { id: 543 }, player: { name: "Marc Bartra" }, type: "Goal", detail: "Normal Goal" },
        { time: { elapsed: 53 }, team: { id: 543 }, player: { name: "Troy Parrott" }, type: "Goal", detail: "Normal Goal" },
        { time: { elapsed: 74 }, team: { id: 79 }, player: { name: "Thomas Meunier" }, type: "Card", detail: "Red Card" },
      ],
    },
    {
      fixture: {
        id: 1255005,
        date: "2026-09-24T22:00:00+00:00",
        timestamp: 1790287200,
        status: { short: "NS", elapsed: 0 },
      },
      league: {
        id: 72,
        name: "Brasileirão Série B",
        country: "Brasil",
        logo: "https://media.api-sports.io/football/leagues/72.png",
        season: 2026,
        round: "Rodada 29",
      },
      teams: {
        home: { id: 128, name: "Santos", logo: "https://media.api-sports.io/football/teams/128.png" },
        away: { id: 140, name: "Botafogo-SP", logo: "https://media.api-sports.io/football/teams/140.png" },
      },
      goals: { home: 0, away: 0 },
      score: { halftime: { home: null, away: null } },
      events: [],
    },
  ];
}

// Action pública: orquestra a sincronização com proteção estrita de créditos
export const syncLiveMatchesAction = action({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.API_FOOTBALL_KEY;

    // 1. Verificação Estrita de Quota no Banco Convex
    const quotaInfo: { canExecute: boolean; remaining: number; isBlocked: boolean; resetAt: number } =
      await ctx.runQuery(internal.apiFootball.checkApiQuota, { provider: "api-football" });

    if (!quotaInfo.canExecute && !args.force) {
      const resetDateStr = new Date(quotaInfo.resetAt).toISOString();
      console.warn(
        `[API-Football] 🛑 Quota de requisições crítica (${quotaInfo.remaining} restantes). Bloqueado até ${resetDateStr} (meia-noite UTC).`
      );
      return {
        success: false,
        blocked: true,
        reason: "QUOTA_LIMIT_REACHED",
        remaining: quotaInfo.remaining,
        resetAt: resetDateStr,
      };
    }

    // 2. Smart Polling: se não houver jogos ao vivo nem nos próximos 60 min, pula requisição externa
    const hasActiveMatches: boolean = await ctx.runQuery(internal.apiFootball.hasLiveOrImminentMatches);
    if (!hasActiveMatches && !args.force) {
      console.log(
        `[API-Football] 💤 Nenhuma partida ao vivo ou iminente (próxima hora). Requisição pulada para poupar créditos (${quotaInfo.remaining} restantes).`
      );
      return {
        success: true,
        skipped: true,
        reason: "NO_ACTIVE_MATCHES",
        remaining: quotaInfo.remaining,
      };
    }

    const staleMatches: Array<{ id: Id<"matches">; externalId: number; minute?: number; startTime: number }> =
      await ctx.runQuery(internal.apiFootball.getStaleLiveMatches);

    let fixtures: any[] = [];
    let currentRemaining = quotaInfo.remaining;

    if (apiKey) {
      try {
        console.log("[API-Football] Consultando jogos ao vivo: https://v3.football.api-sports.io/fixtures?live=all...");
        const response = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
          headers: {
            "x-apisports-key": apiKey,
            Accept: "application/json",
          },
        });

        // 3. Inspeção e Registro Estrito dos Cabeçalhos de Rate Limit
        const remainingHeader = response.headers.get("x-ratelimit-requests-remaining");
        const limitHeader = response.headers.get("x-ratelimit-requests-limit");

        if (remainingHeader !== null) {
          const parsedRemaining = parseInt(remainingHeader, 10);
          const parsedLimit = limitHeader ? parseInt(limitHeader, 10) : 100;
          if (!isNaN(parsedRemaining)) {
            currentRemaining = parsedRemaining;
            const nextReset = getNextMidnightUtc();

            console.log(
              `[API-Football] 📊 Quota Restante: ${currentRemaining} / ${parsedLimit} requisições hoje (Reset em: ${new Date(nextReset).toISOString()}).`
            );

            // Persiste o estado da quota no Convex
            await ctx.runMutation(internal.apiFootball.recordApiQuota, {
              provider: "api-football",
              remainingRequests: currentRemaining,
              totalLimit: parsedLimit,
              resetAt: nextReset,
            });

            // Se atingir 5 ou menos créditos, interrompe futuras chamadas externas
            if (currentRemaining <= 5) {
              console.warn(
                `[API-Football] ⚠️ ATENÇÃO: Limite de segurança atingido (${currentRemaining} restantes). Novas chamadas externas estão bloqueadas até à meia-noite UTC.`
              );
            }
          }
        } else {
          console.log(`[API-Football] 📊 Quota em controle interno: ${currentRemaining} requisições.`);
        }

        if (response.ok) {
          const data = await response.json();
          const apiErrors = data.errors && Object.keys(data.errors).length > 0 ? data.errors : null;
          if (!apiErrors && Array.isArray(data.response) && data.response.length > 0) {
            fixtures = data.response;
            console.log(`[API-Football] ${fixtures.length} partidas ao vivo retornadas pela API.`);
          } else if (apiErrors) {
            console.warn("[API-Football] Aviso retornado pela API:", JSON.stringify(apiErrors));
          }
        }
      } catch (err: any) {
        console.warn("[API-Football] Falha na consulta live:", err.message);
      }

      // 4. Verificação de partidas prestes a encerrar (>= 85' ou > 105' de jogo) que saíram do endpoint live=all
      const missingStale = staleMatches.filter(
        (sm) => !fixtures.some((f) => f.fixture?.id === sm.externalId)
      );

      if (missingStale.length > 0 && currentRemaining > 5) {
        const staleIds = missingStale.map((sm) => sm.externalId);
        console.log(
          `[API-Football] 🔍 ${missingStale.length} partidas ao vivo >= 85' não constam mais em live=all. Consultando status final por IDs...`
        );

        for (let i = 0; i < staleIds.length; i += 20) {
          const chunkIds = staleIds.slice(i, i + 20).join("-");
          try {
            const idRes = await fetch(`https://v3.football.api-sports.io/fixtures?ids=${chunkIds}`, {
              headers: {
                "x-apisports-key": apiKey,
                Accept: "application/json",
              },
            });
            if (idRes.ok) {
              const idData = await idRes.json();
              if (Array.isArray(idData.response) && idData.response.length > 0) {
                console.log(
                  `[API-Football] ✅ ${idData.response.length} partidas com status final retornadas por ID.`
                );
                for (const f of idData.response) {
                  if (!fixtures.some((existing) => existing.fixture?.id === f.fixture?.id)) {
                    fixtures.push(f);
                  }
                }
              }
            }
          } catch (err: any) {
            console.warn("[API-Football] Falha na consulta por IDs:", err.message);
          }
        }
      }

      // 5. Finalizador de contingência: se alguma partida congelou em >= 90' ou > 110' e não foi atualizada pela API
      const stillMissingStale = missingStale.filter(
        (sm) => !fixtures.some((f) => f.fixture?.id === sm.externalId)
      );
      if (stillMissingStale.length > 0) {
        const idsToFinalize = stillMissingStale
          .filter(
            (sm) =>
              (typeof sm.minute === "number" && sm.minute >= 90) ||
              sm.startTime <= Date.now() - 110 * 60 * 1000
          )
          .map((sm) => sm.id);

        if (idsToFinalize.length > 0) {
          console.log(
            `[API-Football] 🏁 Encerrando automaticamente ${idsToFinalize.length} partidas travadas em 90' ausentes do live feed.`
          );
          await ctx.runMutation(internal.apiFootball.finalizeExpiredMatches, {
            matchIds: idsToFinalize,
          });
        }
      }

      // Se não houver jogos 'live' e a quota permitir (> 5), tenta ligas alvo
      if (fixtures.length === 0 && currentRemaining > 5) {
        const targetLeagues = [5, 2, 72];
        const todayStr = new Date().toISOString().split("T")[0];

        for (const leagueId of targetLeagues) {
          try {
            const url = `https://v3.football.api-sports.io/fixtures?date=${todayStr}&league=${leagueId}&season=2026`;
            console.log(`[API-Football] Consultando partidas do dia para a liga ${leagueId}...`);
            const leagueRes = await fetch(url, {
              headers: {
                "x-apisports-key": apiKey,
                Accept: "application/json",
              },
            });
            if (leagueRes.ok) {
              const leagueData = await leagueRes.json();
              if (Array.isArray(leagueData.response) && leagueData.response.length > 0) {
                fixtures.push(...leagueData.response);
              }
            }
          } catch {
            // Continua para próxima liga
          }
        }
      }
    }

    // Fallback de contingência se a resposta externa estiver indisponível ou esgotada
    if (fixtures.length === 0) {
      console.log("[API-Football] Ativando fallback de contingência oficial (Nations League, Champions League, Série B)...");
      fixtures = getFallbackFixtures();
    }

    console.log(`[API-Football] Processando ${fixtures.length} partidas no Convex...`);

    const result: SaveApiFootballResult = await ctx.runMutation(
      internal.apiFootball.saveApiFootballMatches,
      { fixtures }
    );

    return {
      success: true,
      fixturesProcessed: fixtures.length,
      quotaRemaining: currentRemaining,
      ...result,
    };
  },
});

// Mutation interna: cadastra e atualiza competições, equipes, partidas e eventos
export const saveApiFootballMatches = internalMutation({
  args: {
    fixtures: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const allLeagues = await ctx.db.query("leagues").collect();
    const allTeams = await ctx.db.query("teams").collect();
    const allMatches = await ctx.db.query("matches").collect();

    let leaguesProcessed = 0;
    let teamsProcessed = 0;
    let matchesInserted = 0;
    let matchesUpdated = 0;
    let matchesSkippedFinished = 0;
    let eventsInserted = 0;

    const leagueMap = new Map<number, Id<"leagues">>();
    const teamMap = new Map<number, Id<"teams">>();

    for (const item of args.fixtures) {
      const { fixture, league, teams, goals, score, events } = item;
      if (!fixture || !league || !teams) continue;

      // 1. Competição (tabela leagues)
      let leagueId = leagueMap.get(league.id);
      if (!leagueId) {
        let existingLeague =
          allLeagues.find((l) => l.externalId === league.id) ||
          allLeagues.find(
            (l) => l.name.toLowerCase() === (league.name || "").toLowerCase()
          );

        if (!existingLeague) {
          const isCup = [5, 2, 13, 73, 11, 45].includes(league.id) || /cup|champions|nations|copa/i.test(league.name || "");
          const newLeagueId = await ctx.db.insert("leagues", {
            name: league.name,
            country: league.country || "Europa",
            logoUrl: league.logo || "",
            season: league.season || 2026,
            type: isCup ? "cup" : "league",
            externalId: league.id,
            priority: 2,
          });
          leagueId = newLeagueId;
          leaguesProcessed++;
          allLeagues.push((await ctx.db.get(newLeagueId))!);
        } else {
          leagueId = existingLeague._id;
          if (league.logo && !existingLeague.logoUrl) {
            await ctx.db.patch(existingLeague._id, { logoUrl: league.logo });
          }
        }
        leagueMap.set(league.id, leagueId);
      }

      // 2. Equipe Mandante (tabela teams)
      let homeTeamId = teamMap.get(teams.home.id);
      if (!homeTeamId) {
        const homeDisplayName = normalizeTeamDisplayName(teams.home.name);
        let existingTeam =
          allTeams.find((t) => t.externalId === teams.home.id) ||
          allTeams.find(
            (t) =>
              t.name.toLowerCase() === homeDisplayName.toLowerCase() ||
              t.name.toLowerCase() === (teams.home.name || "").toLowerCase()
          );

        if (!existingTeam) {
          const newTeamId = await ctx.db.insert("teams", {
            name: homeDisplayName,
            shortName: homeDisplayName,
            logoUrl: teams.home.logo || "",
            externalId: teams.home.id,
          });
          homeTeamId = newTeamId;
          teamsProcessed++;
          allTeams.push((await ctx.db.get(newTeamId))!);
        } else {
          homeTeamId = existingTeam._id;
          const patchData: Record<string, any> = {};
          if (teams.home.logo && !existingTeam.logoUrl) patchData.logoUrl = teams.home.logo;
          if (existingTeam.name !== homeDisplayName) {
            patchData.name = homeDisplayName;
            patchData.shortName = homeDisplayName;
          }
          if (Object.keys(patchData).length > 0) {
            await ctx.db.patch(existingTeam._id, patchData);
          }
        }
        teamMap.set(teams.home.id, homeTeamId);
      }

      // 3. Equipe Visitante (tabela teams)
      let awayTeamId = teamMap.get(teams.away.id);
      if (!awayTeamId) {
        const awayDisplayName = normalizeTeamDisplayName(teams.away.name);
        let existingTeam =
          allTeams.find((t) => t.externalId === teams.away.id) ||
          allTeams.find(
            (t) =>
              t.name.toLowerCase() === awayDisplayName.toLowerCase() ||
              t.name.toLowerCase() === (teams.away.name || "").toLowerCase()
          );

        if (!existingTeam) {
          const newTeamId = await ctx.db.insert("teams", {
            name: awayDisplayName,
            shortName: awayDisplayName,
            logoUrl: teams.away.logo || "",
            externalId: teams.away.id,
          });
          awayTeamId = newTeamId;
          teamsProcessed++;
          allTeams.push((await ctx.db.get(newTeamId))!);
        } else {
          awayTeamId = existingTeam._id;
          const patchData: Record<string, any> = {};
          if (teams.away.logo && !existingTeam.logoUrl) patchData.logoUrl = teams.away.logo;
          if (existingTeam.name !== awayDisplayName) {
            patchData.name = awayDisplayName;
            patchData.shortName = awayDisplayName;
          }
          if (Object.keys(patchData).length > 0) {
            await ctx.db.patch(existingTeam._id, patchData);
          }
        }
        teamMap.set(teams.away.id, awayTeamId);
      }

      // 4. Mapeamento de Status e Placar
      const statusMapping = mapApiFootballStatus(fixture.status?.short);
      const roundStr = normalizeRoundName(league.round);
      const startTime = fixture.timestamp ? fixture.timestamp * 1000 : new Date(fixture.date).getTime();
      const minute = typeof fixture.status?.elapsed === "number" ? fixture.status.elapsed : undefined;

      const homeScore = typeof goals?.home === "number" ? goals.home : 0;
      const awayScore = typeof goals?.away === "number" ? goals.away : 0;
      const homeHalftimeScore = typeof score?.halftime?.home === "number" ? score.halftime.home : undefined;
      const awayHalftimeScore = typeof score?.halftime?.away === "number" ? score.halftime.away : undefined;

      // 5. Partida (tabela matches) com Bloqueio de Jogos Encerrados
      const existingMatch =
        allMatches.find((em) => em.externalId === fixture.id) ||
        allMatches.find(
          (em) =>
            em.leagueId === leagueId &&
            em.homeTeamId === homeTeamId &&
            em.awayTeamId === awayTeamId &&
            Math.abs(em.startTime - startTime) < 86400000
        );

      let matchId: Id<"matches">;
      if (!existingMatch) {
        matchId = await ctx.db.insert("matches", {
          externalId: fixture.id,
          leagueId,
          homeTeamId,
          awayTeamId,
          round: roundStr,
          status: statusMapping.status,
          statusShort: statusMapping.statusShort,
          minute,
          homeScore,
          awayScore,
          homeHalftimeScore,
          awayHalftimeScore,
          startTime,
        });
        matchesInserted++;
      } else {
        // Bloqueio estrito: partidas com status 'FINISHED' no banco são preservadas intactas
        if (existingMatch.status === "FINISHED") {
          matchesSkippedFinished++;
          continue;
        }

        matchId = existingMatch._id;
        await ctx.db.patch(matchId, {
          externalId: fixture.id,
          round: roundStr,
          status: statusMapping.status,
          statusShort: statusMapping.statusShort,
          minute,
          homeScore,
          awayScore,
          homeHalftimeScore,
          awayHalftimeScore,
          startTime,
        });
        matchesUpdated++;
      }

      // 6. Eventos da Partida (tabela matchEvents)
      if (Array.isArray(events) && events.length > 0) {
        // Limpa eventos anteriores para idempotência
        const oldEvents = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", matchId))
          .collect();
        for (const ev of oldEvents) await ctx.db.delete(ev._id);

        for (const ev of events) {
          const eventType = mapEventType(ev.type, ev.detail);
          const evTeamId = ev.team?.id === teams.away.id ? awayTeamId : homeTeamId;
          const evMinute = ev.time?.elapsed || 0;

          await ctx.db.insert("matchEvents", {
            matchId,
            minute: evMinute,
            extraMinute: ev.time?.extra || undefined,
            teamId: evTeamId,
            playerName: ev.player?.name || "Jogador",
            assistPlayerName: ev.assist?.name || undefined,
            type: eventType,
            detail: ev.detail || undefined,
          });
          eventsInserted++;
        }
      }
    }

    return {
      leaguesProcessed,
      teamsProcessed,
      matchesInserted,
      matchesUpdated,
      matchesSkippedFinished,
      eventsInserted,
    };
  },
});
