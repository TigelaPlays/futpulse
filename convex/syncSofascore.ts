import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Mapeamento de nomes em português para os nomes do Sofascore e ESPN (inglês)
const TEAM_NAME_MAP: Record<string, string> = {
  "itália": "italy",
  "bélgica": "belgium",
  "frança": "france",
  "turquia": "türkiye",
  "turkey": "türkiye",
  "türkiye": "türkiye",
  "países baixos": "netherlands",
  "holanda": "netherlands",
  "alemanha": "germany",
  "sérvia": "serbia",
  "grécia": "greece",
  "inglaterra": "england",
  "espanha": "spain",
  "croácia": "croatia",
  "tchéquia": "czech republic",
  "república tcheca": "czech republic",
  "república checa": "czech republic",
  "czech republic": "czech republic",
  "czechia": "czech republic",
  "noruega": "norway",
  "dinamarca": "denmark",
  "portugal": "portugal",
  "país de gales": "wales",
  "eslovênia": "slovenia",
  "escócia": "scotland",
  "macedônia do norte": "north macedonia",
  "macedônia": "north macedonia",
  "suíça": "switzerland",
  "geórgia": "georgia",
  "irlanda do norte": "northern ireland",
  "hungria": "hungary",
  "ucrânia": "ukraine",
  "áustria": "austria",
  "israel": "israel",
  "kosovo": "kosovo",
  "república da irlanda": "ireland",
  "irlanda": "ireland",
  "polônia": "poland",
  "bósnia e herzegovina": "bosnia-herzegovina",
  "bósnia": "bosnia-herzegovina",
  "bosnia": "bosnia-herzegovina",
  "bosnia and herzegovina": "bosnia-herzegovina",
  "bosnia & herzegovina": "bosnia-herzegovina",
  "suécia": "sweden",
  "romênia": "romania",
  "san marino": "san marino",
  "finlândia": "finland",
  "albânia": "albania",
  "bielorrússia": "belarus",
  "belarus": "belarus",
  "armênia": "armenia",
  "letônia": "latvia",
  "montenegro": "montenegro",
  "chipre": "cyprus",
  "ilhas faroé": "faroe islands",
  "faroe islands": "faroe islands",
  "cazaquistão": "kazakhstan",
  "eslováquia": "slovakia",
  "moldávia": "moldova",
  "islândia": "iceland",
  "estônia": "estonia",
  "bulgária": "bulgaria",
  "luxemburgo": "luxembourg",
  "andorra": "andorra",
  "malta": "malta",
  "gibraltar": "gibraltar",
  "liechtenstein": "liechtenstein",
  "lituânia": "lithuania",
  "azerbaijão": "azerbaijan",
};

function normalize(name: string): string {
  const clean = name.toLowerCase().trim();
  return TEAM_NAME_MAP[clean] || clean;
}

export const getScheduledMatches = internalQuery({
  handler: async (ctx) => {
    let unlLeague = await ctx.db
      .query("leagues")
      .filter((q) => q.eq(q.field("code"), "UNL"))
      .first();

    const matchesQuery = unlLeague
      ? ctx.db.query("matches").withIndex("by_league", (q) => q.eq("leagueId", unlLeague._id))
      : ctx.db.query("matches");

    const matches = await matchesQuery.collect();
    const list = [];
    for (const m of matches) {
      const home = await ctx.db.get(m.homeTeamId);
      const away = await ctx.db.get(m.awayTeamId);
      if (home && away) {
        list.push({
          matchId: m._id,
          homeName: home.name,
          awayName: away.name,
          status: m.status,
          currentHomeScore: m.homeScore,
          currentAwayScore: m.awayScore,
        });
      }
    }
    return list;
  },
});

export const patchScore = internalMutation({
  args: {
    matchId: v.id("matches"),
    homeScore: v.number(),
    awayScore: v.number(),
    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("IN_PLAY"),
      v.literal("LIVE"),
      v.literal("HALFTIME"),
      v.literal("PAUSED"),
      v.literal("EXTRA_TIME"),
      v.literal("PENALTY_SHOOTOUT"),
      v.literal("FINISHED"),
      v.literal("POSTPONED")
    ),
    statusShort: v.optional(v.string()),
    minute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patchData: Record<string, any> = {
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      status: args.status,
    };
    if (args.minute !== undefined) patchData.minute = args.minute;
    if (args.statusShort) patchData.statusShort = args.statusShort;
    if (args.status === "IN_PLAY" || args.status === "LIVE") {
      patchData.elapsedSecondsUpdatedAt = Date.now();
    }
    await ctx.db.patch(args.matchId, patchData);
  },
});

export const syncLiveFromSofascore = action({
  args: {
    targetDate: v.optional(v.string()), // ex: "2026-09-25" ou vazio para jogos ao vivo agora
  },
  handler: async (ctx, args): Promise<any> => {
    let rawEvents: any[] = [];
    let source = "sofascore";

    // 1. Tenta Sofascore
    const sofascoreUrl = args.targetDate
      ? `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${args.targetDate}`
      : `https://api.sofascore.com/api/v1/sport/football/events/live`;

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://www.sofascore.com/",
      Origin: "https://www.sofascore.com",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "Cache-Control": "max-age=0",
    };

    try {
      const res = await fetch(sofascoreUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        rawEvents = data.events || [];
      }
    } catch {
      // Ignora e tenta o fallback aberto da ESPN
    }

    // 2. Se Sofascore estiver bloqueado por Cloudflare 403 em servidores cloud, usa ESPN Scoreboard (aberto e gratuito)
    if (rawEvents.length === 0) {
      source = "espn";
      try {
        const now = new Date();
        const yyyy = now.getUTCFullYear();
        const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(now.getUTCDate()).padStart(2, "0");
        const todayParam = `${yyyy}${mm}${dd}`;

        const dateParam = args.targetDate ? args.targetDate.replace(/-/g, "") : todayParam;
        const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.nations/scoreboard?dates=${dateParam}`;

        const espnRes = await fetch(espnUrl);
        if (espnRes.ok) {
          const espnData = await espnRes.json();
          rawEvents = espnData.events || [];
        }
      } catch (err: any) {
        console.error("Falha ao consultar ESPN:", err);
      }
    }

    if (rawEvents.length === 0) {
      return { success: true, updated: 0, source, message: "Nenhum jogo retornado no momento." };
    }

    const localMatches: any = await ctx.runQuery(internal.syncSofascore.getScheduledMatches);
    let updatedCount = 0;
    const updatedMatches: Array<{ match: string; score: string; status: string }> = [];

    type ValidStatus =
      | "SCHEDULED"
      | "IN_PLAY"
      | "LIVE"
      | "HALFTIME"
      | "PAUSED"
      | "EXTRA_TIME"
      | "PENALTY_SHOOTOUT"
      | "FINISHED"
      | "POSTPONED";

    // 3A. Processamento específico para ESPN (respeitando homeAway: "home" e "away")
    if (source === "espn") {
      for (const ev of rawEvents) {
        const competition = ev.competitions?.[0];
        if (!competition) continue;

        const competitors = competition.competitors || [];
        const homeComp = competitors.find((c: any) => c.homeAway === "home");
        const awayComp = competitors.find((c: any) => c.homeAway === "away");

        if (!homeComp || !awayComp) continue;

        const espnHomeName = (homeComp.team?.name || homeComp.team?.displayName || "").toLowerCase();
        const espnAwayName = (awayComp.team?.name || awayComp.team?.displayName || "").toLowerCase();

        const homeScore = parseInt(homeComp.score ?? "0", 10);
        const awayScore = parseInt(awayComp.score ?? "0", 10);

        // Status e Minuto
        const state = ev.status?.type?.state; // "in", "post", "pre"
        const detail = ev.status?.type?.shortDetail || ""; // "85'", "FT", "HT"
        const minuteMatch = detail.match(/\d+/);
        const minute = minuteMatch ? parseInt(minuteMatch[0], 10) : undefined;

        let status: ValidStatus = "SCHEDULED";
        let statusShort = detail || "15:45";

        if (state === "in") {
          if (detail.includes("HT") || detail.toLowerCase().includes("halftime")) {
            status = "HALFTIME";
            statusShort = "INT";
          } else {
            status = "IN_PLAY";
            statusShort = minute ? `${minute}'` : detail || "AO VIVO";
          }
        } else if (state === "post") {
          status = "FINISHED";
          statusShort = "FIM";
        }

        // Localiza no banco de dados local
        for (const lm of localMatches) {
          const normLocalHome = normalize(lm.homeName);
          const normLocalAway = normalize(lm.awayName);

          const matchHome = espnHomeName.includes(normLocalHome) || normLocalHome.includes(espnHomeName);
          const matchAway = espnAwayName.includes(normLocalAway) || normLocalAway.includes(espnAwayName);

          if (matchHome && matchAway) {
            await ctx.runMutation(internal.syncSofascore.patchScore, {
              matchId: lm.matchId,
              homeScore,
              awayScore,
              status,
              minute,
              statusShort,
            });
            updatedCount++;
            updatedMatches.push({
              match: `${lm.homeName} ${homeScore} x ${awayScore} ${lm.awayName}`,
              score: `${homeScore} x ${awayScore}`,
              status: statusShort,
            });
            break;
          }
        }
      }
    } else {
      // 3B. Processamento padrão Sofascore
      for (const lm of localMatches) {
        const normHome = normalize(lm.homeName);
        const normAway = normalize(lm.awayName);

        const ev = rawEvents.find((e) => {
          const h = (e.homeTeam?.name || "").toLowerCase();
          const a = (e.awayTeam?.name || "").toLowerCase();
          return (
            (h.includes(normHome) || normHome.includes(h)) &&
            (a.includes(normAway) || normAway.includes(a))
          );
        });

        if (ev) {
          const homeScore = ev.homeScore?.current ?? 0;
          const awayScore = ev.awayScore?.current ?? 0;
          const statusType = ev.status?.type; // "inprogress", "finished", "notstarted"
          const statusDesc = (ev.status?.description || "").toLowerCase();
          const minute = ev.statusTime?.minute;

          let status: ValidStatus = "SCHEDULED";
          let statusShort = "15:45";

          if (statusType === "inprogress") {
            if (statusDesc.includes("halftime") || statusDesc.includes("intervalo")) {
              status = "HALFTIME";
              statusShort = "INT";
            } else if (statusDesc.includes("extra") || statusDesc.includes("prorrogação")) {
              status = "EXTRA_TIME";
              statusShort = "PR";
            } else if (statusDesc.includes("penalt")) {
              status = "PENALTY_SHOOTOUT";
              statusShort = "PEN";
            } else {
              status = "IN_PLAY";
              statusShort = minute ? `${minute}'` : "AO VIVO";
            }
          } else if (statusType === "finished") {
            status = "FINISHED";
            statusShort = "FIM";
          } else if (statusType === "postponed") {
            status = "POSTPONED";
            statusShort = "ADIADO";
          }

          await ctx.runMutation(internal.syncSofascore.patchScore, {
            matchId: lm.matchId,
            homeScore,
            awayScore,
            status,
            statusShort,
            minute,
          });

          updatedCount++;
          updatedMatches.push({
            match: `${lm.homeName} ${homeScore} x ${awayScore} ${lm.awayName}`,
            score: `${homeScore} x ${awayScore}`,
            status: statusShort,
          });
        }
      }
    }

    return {
      success: true,
      updated: updatedCount,
      source,
      totalEvents: rawEvents.length,
      updatedMatches,
    };
  },
});
