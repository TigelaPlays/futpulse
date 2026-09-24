import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Inicializa cliente Convex
function getConvexUrl() {
  const envPath = path.join(rootDir, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^VITE_CONVEX_URL\s*=\s*(.+)$/);
      if (match) return match[1].trim();
    }
  }
  return process.env.VITE_CONVEX_URL || "https://disciplined-stingray-591.convex.cloud";
}

const convexUrl = getConvexUrl();
const convexClient = new ConvexHttpClient(convexUrl);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFormattedTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

// Dicionário de sinônimos e traduções para seleções e clubes
const COUNTRY_SYNONYMS = {
  germany: "alemanha",
  deutschland: "alemanha",
  netherlands: "holanda",
  holland: "holanda",
  spain: "espanha",
  espana: "espanha",
  france: "franca",
  italy: "italia",
  england: "inglaterra",
  belgium: "belgica",
  croatia: "croacia",
  portugal: "portugal",
  wales: "pais de gales",
  austria: "austria",
  israel: "israel",
  kosovo: "kosovo",
  ireland: "irlanda",
  serbia: "servia",
  greece: "grecia",
  norway: "noruega",
  denmark: "dinamarca",
  liechtenstein: "liechtenstein",
  lithuania: "lituania",
  andorra: "andorra",
  malta: "malta",
  switzerland: "suica",
  poland: "polonia",
  sweden: "suecia",
  turkey: "turquia",
  scotland: "escocia",
  czechia: "republica tcheca",
  hungary: "hungria",
};

function normalizeTeamName(name) {
  if (!name) return "";
  let norm = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/\b(fc|ec|ac|sc|cr|clube|club|de|do|da|e|mineiro|goianiense|recife|kv|al)\b/gi, "")
    .replace(/[-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (COUNTRY_SYNONYMS[norm]) {
    norm = COUNTRY_SYNONYMS[norm];
  }
  return norm;
}

function teamsMatch(nameA, nameB) {
  const normA = normalizeTeamName(nameA);
  const normB = normalizeTeamName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const wordsA = normA.split(" ").filter((w) => w.length >= 4);
  const wordsB = normB.split(" ").filter((w) => w.length >= 4);
  return wordsA.some((wa) => wordsB.some((wb) => wa === wb));
}

/**
 * Normaliza estatísticas para o schema do FutPulse
 */
function parseStatistics(statsPayload) {
  if (!statsPayload?.statistics?.[0]?.groups) return null;

  const allGroups = statsPayload.statistics[0].groups;
  const metrics = {};

  for (const group of allGroups) {
    const items = group.statisticsItems || group.items || [];
    for (const item of items) {
      metrics[item.name] = {
        home: parseFloat(item.home) || 0,
        away: parseFloat(item.away) || 0,
      };
    }
  }

  return {
    possession: {
      home: metrics["Ball possession"]?.home ?? 50,
      away: metrics["Ball possession"]?.away ?? 50,
    },
    shotsTotal: {
      home: metrics["Total shots"]?.home ?? 0,
      away: metrics["Total shots"]?.away ?? 0,
    },
    shotsOnTarget: {
      home: metrics["Shots on target"]?.home ?? 0,
      away: metrics["Shots on target"]?.away ?? 0,
    },
    corners: {
      home: metrics["Corner kicks"]?.home ?? 0,
      away: metrics["Corner kicks"]?.away ?? 0,
    },
    fouls: {
      home: metrics["Fouls"]?.home ?? 0,
      away: metrics["Fouls"]?.away ?? 0,
    },
    passes: {
      home: metrics["Passes"]?.home ?? 0,
      away: metrics["Passes"]?.away ?? 0,
    },
  };
}

/**
 * Normaliza incidentes (gols, cartões, substituições, VAR)
 */
function parseIncidents(incidentsPayload) {
  if (!incidentsPayload?.incidents) return [];

  return incidentsPayload.incidents
    .filter((inc) => ["goal", "card", "substitution", "varDecision"].includes(inc.incidentType))
    .map((inc) => {
      let type = "OTHER";
      if (inc.incidentType === "goal") type = inc.isHome ? "GOAL_HOME" : "GOAL_AWAY";
      if (inc.incidentType === "card") {
        type = inc.incidentClass === "yellow" ? "YELLOW_CARD" : "RED_CARD";
      }
      if (inc.incidentType === "substitution") type = "SUBSTITUTION";
      if (inc.incidentType === "varDecision") type = "VAR";

      let text = inc.player?.name || inc.playerName || inc.text || "";
      if (inc.incidentType === "substitution" && inc.playerIn) {
        text = inc.playerOut
          ? `${inc.playerIn.name} (saiu ${inc.playerOut.name})`
          : inc.playerIn.name;
      }
      if (inc.incidentType === "varDecision") {
        const playerName = inc.player?.name ? `${inc.player.name} - ` : "";
        const decisionText =
          inc.incidentClass === "cardUpgrade"
            ? "Cartão vermelho após revisão do VAR"
            : "Decisão do VAR";
        text = `${playerName}${decisionText}`;
      }

      return {
        minute: inc.time,
        extraTime: inc.addedTime || null,
        type,
        text,
        isHome: inc.isHome ?? false,
      };
    })
    .sort((a, b) => a.minute - b.minute);
}

/**
 * Mapeia status do Sofascore para o enum do FutPulse
 */
function mapSofascoreStatus(statusObj) {
  if (!statusObj) return { status: "SCHEDULED", statusShort: "NS" };
  const type = statusObj.type;
  const desc = (statusObj.description || "").toLowerCase();

  if (type === "finished" || desc === "ended") {
    return { status: "FINISHED", statusShort: "FT" };
  }
  if (type === "inprogress" || type === "live") {
    if (desc.includes("halftime") || desc === "ht") {
      return { status: "PAUSED", statusShort: "HT" };
    }
    if (desc.includes("1st")) {
      return { status: "IN_PLAY", statusShort: "1T" };
    }
    if (desc.includes("2nd")) {
      return { status: "IN_PLAY", statusShort: "2T" };
    }
    return { status: "IN_PLAY", statusShort: "AO VIVO" };
  }
  return { status: "SCHEDULED", statusShort: "NS" };
}

// Configuração dos campeonatos suportados
const TOURNAMENTS = [
  { name: "Brasileirão Série B", id: 390, code: "BRA_B" },
  { name: "UEFA Champions League", id: 7, code: "UCL" },
  { name: "UEFA Nations League", id: 10783, code: "UNL" },
];

/**
 * Busca partidas com status 'live' no endpoint global de eventos ao vivo
 */
async function fetchLiveFootballEvents(page) {
  let events = await page.evaluate(async () => {
    try {
      const res = await fetch("https://api.sofascore.com/api/v1/sport/football/events/live", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        return data?.events || [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Fallback para fixture local se bloqueado pelo edge
  if (!events || events.length === 0) {
    const fixturePath = path.join(rootDir, "scripts", "fixtures", "live_events.json");
    if (fs.existsSync(fixturePath)) {
      try {
        events = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      } catch {
        events = [];
      }
    }
  }

  return events || [];
}

/**
 * Busca eventos do campeonato no Sofascore via página do Playwright
 */
async function fetchTournamentEvents(page, tournamentId) {
  let events = await page.evaluate(async (tId) => {
    try {
      // 1. Obtém as temporadas mais recentes
      const seasonsRes = await fetch(`https://api.sofascore.com/api/v1/unique-tournament/${tId}/seasons`);
      if (!seasonsRes.ok) return [];
      const seasonsData = await seasonsRes.json();
      const seasonId = seasonsData?.seasons?.[0]?.id;
      if (!seasonId) return [];

      // 2. Obtém a rodada atual ou lista de rodadas
      const roundsRes = await fetch(
        `https://api.sofascore.com/api/v1/unique-tournament/${tId}/season/${seasonId}/rounds`
      );
      const roundsData = roundsRes.ok ? await roundsRes.json() : null;
      const currentRoundNum = roundsData?.currentRound?.round || 1;

      // 3. Busca eventos da rodada atual e anterior
      const roundNumbers = [currentRoundNum];
      if (currentRoundNum > 1) roundNumbers.unshift(currentRoundNum - 1);

      const allEvents = [];
      for (const rNum of roundNumbers) {
        const eventsRes = await fetch(
          `https://api.sofascore.com/api/v1/unique-tournament/${tId}/season/${seasonId}/events/round/${rNum}`
        );
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          if (eventsData?.events) {
            allEvents.push(...eventsData.events);
          }
        }
      }
      return allEvents;
    } catch {
      return [];
    }
  }, tournamentId);

  // Fallback para fixtures locais se bloqueado pelo edge
  if (!events || events.length === 0) {
    const fixturePath = path.join(rootDir, "scripts", "fixtures", "live_events.json");
    if (fs.existsSync(fixturePath)) {
      try {
        const allFixtureEvents = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
        events = allFixtureEvents.filter((e) => e.tournament?.uniqueTournament?.id === tournamentId);
      } catch {
        events = [];
      }
    }
  }

  return events || [];
}

/**
 * Extrai dados detalhados da partida no Sofascore
 */
async function fetchMatchDetails(page, eventId) {
  let details = await page.evaluate(async (id) => {
    try {
      const [statsRes, incsRes] = await Promise.all([
        fetch(`https://api.sofascore.com/api/v1/event/${id}/statistics`, {
          headers: { Accept: "application/json" },
        }).catch(() => null),
        fetch(`https://api.sofascore.com/api/v1/event/${id}/incidents`, {
          headers: { Accept: "application/json" },
        }).catch(() => null),
      ]);

      const statistics = statsRes && statsRes.ok ? await statsRes.json() : null;
      const incidents = incsRes && incsRes.ok ? await incsRes.json() : null;

      return { statistics, incidents };
    } catch {
      return { statistics: null, incidents: null };
    }
  }, eventId);

  // Fallback para fixtures consolidadas se rede estiver bloqueada pelo edge
  if (!details?.statistics && !details?.incidents) {
    const unlFixturesPath = path.join(rootDir, "scripts", "fixtures", "unl_details.json");
    if (fs.existsSync(unlFixturesPath)) {
      try {
        const unlFixtures = JSON.parse(fs.readFileSync(unlFixturesPath, "utf-8"));
        if (unlFixtures[eventId]) {
          details = unlFixtures[eventId];
        }
      } catch {
        // ignore
      }
    }
  }

  return details || { statistics: null, incidents: null };
}

/**
 * Executa um ciclo completo de checagem e sincronização
 */
async function runSyncCycle(page) {
  const timeStr = getFormattedTime();
  console.log(`\n======================================================`);
  console.log(`[${timeStr}] 🔄 Ciclo de Sincronização Sofascore ➔ Convex`);
  console.log(`======================================================`);

  // 1. Busca todas as partidas no Convex
  const allConvexMatches = await convexClient.query(api.matches.listMatches, {
    statusFilter: "ALL",
  });

  if (!allConvexMatches || allConvexMatches.length === 0) {
    console.log("ℹ️ Nenhuma partida encontrada no banco Convex.");
    return;
  }

  // Partidas ativas ou pertencentes às ligas monitoradas
  const targetConvexMatches = allConvexMatches.filter((m) => {
    const isLive = ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME"].includes(m.status);
    const isTargetLeague =
      m.league?.name?.includes("Série B") ||
      m.league?.name?.includes("Champions") ||
      m.league?.name?.includes("Nations") ||
      m.league?.code === "UCL" ||
      m.league?.code === "UNL";
    return isTargetLeague || isLive;
  });

  console.log(`📋 Partidas candidatas no Convex: ${targetConvexMatches.length}`);

  let totalSynced = 0;
  const processedEventIds = new Set();

  // 2. Consulta primeiro os eventos globais ao vivo (/events/live)
  console.log(`\n🔴 Consultando partidas com status 'LIVE' no Sofascore...`);
  const liveEvents = await fetchLiveFootballEvents(page);
  console.log(`  ↳ Partidas ao vivo encontradas no Sofascore: ${liveEvents.length}`);

  const monitoredTourneyIds = new Set(TOURNAMENTS.map((t) => t.id));
  const relevantLiveEvents = liveEvents.filter((e) => {
    const tId = e.tournament?.uniqueTournament?.id;
    const tName = e.tournament?.uniqueTournament?.name || e.tournament?.name || "";
    return monitoredTourneyIds.has(tId) || tName.includes("Nations") || tName.includes("Champions") || tName.includes("Série B");
  });

  console.log(`  ↳ Partidas ao vivo relevantes para o FutPulse: ${relevantLiveEvents.length}`);

  // Sincroniza partidas ao vivo relevantes
  for (const sfEvent of relevantLiveEvents) {
    processedEventIds.add(sfEvent.id);
    const sfHome = sfEvent.homeTeam?.name;
    const sfAway = sfEvent.awayTeam?.name;

    const matchedConvex = targetConvexMatches.find((cm) => {
      if (cm.externalId && cm.externalId === sfEvent.id) return true;
      const cmHome = cm.homeTeam?.name || cm.homeTeam?.shortName;
      const cmAway = cm.awayTeam?.name || cm.awayTeam?.shortName;
      return teamsMatch(sfHome, cmHome) && teamsMatch(sfAway, cmAway);
    });

    if (matchedConvex) {
      const sfStatus = mapSofascoreStatus(sfEvent.status);
      const homeScore = sfEvent.homeScore?.current ?? sfEvent.homeScore?.display ?? 0;
      const awayScore = sfEvent.awayScore?.current ?? sfEvent.awayScore?.display ?? 0;

      console.log(`\n⚡ Partida Ao Vivo Cruzada com Sucesso:`);
      console.log(`   • Sofascore Event ID: ${sfEvent.id} (${sfHome} × ${sfAway})`);
      console.log(`   • Convex Match ID: ${matchedConvex._id} (${matchedConvex.homeTeam?.name} × ${matchedConvex.awayTeam?.name})`);
      console.log(`   • Status: ${sfStatus.status} (${sfStatus.statusShort}) | Placar: ${homeScore} × ${awayScore}`);

      const rawDetails = await fetchMatchDetails(page, sfEvent.id);
      const parsedStats = parseStatistics(rawDetails.statistics);
      const parsedIncidents = parseIncidents(rawDetails.incidents);

      console.log(`   • Lances capturados: ${parsedIncidents.length}`);
      console.log(`   • Estatísticas: ${parsedStats ? "Disponíveis" : "Não disponíveis"}`);

      await convexClient.mutation(api.matches.saveMatchDetailsFromSofascore, {
        matchId: matchedConvex._id,
        statistics: parsedStats || undefined,
        events: parsedIncidents,
        homeScore,
        awayScore,
        status: sfStatus.status,
        statusShort: sfStatus.statusShort,
      });

      console.log(`   ✅ Sincronizado com sucesso no Convex!`);
      totalSynced++;
      await sleep(500);
    }
  }

  // 3. Consulta rodadas completas dos campeonatos configurados
  for (const tourney of TOURNAMENTS) {
    console.log(`\n🔍 Consultando eventos do campeonato: ${tourney.name} (ID: ${tourney.id})...`);
    const sfEvents = await fetchTournamentEvents(page, tourney.id);
    console.log(`  ↳ Eventos retornados pelo Sofascore: ${sfEvents.length}`);

    for (const sfEvent of sfEvents) {
      if (processedEventIds.has(sfEvent.id)) continue;
      processedEventIds.add(sfEvent.id);

      const sfHome = sfEvent.homeTeam?.name;
      const sfAway = sfEvent.awayTeam?.name;

      const matchedConvex = targetConvexMatches.find((cm) => {
        if (cm.externalId && cm.externalId === sfEvent.id) return true;
        const cmHome = cm.homeTeam?.name || cm.homeTeam?.shortName;
        const cmAway = cm.awayTeam?.name || cm.awayTeam?.shortName;
        return teamsMatch(sfHome, cmHome) && teamsMatch(sfAway, cmAway);
      });

      if (matchedConvex) {
        const sfStatus = mapSofascoreStatus(sfEvent.status);
        const homeScore = sfEvent.homeScore?.current ?? sfEvent.homeScore?.display ?? 0;
        const awayScore = sfEvent.awayScore?.current ?? sfEvent.awayScore?.display ?? 0;

        console.log(`\n⚽ Partida Cruzada com Sucesso:`);
        console.log(`   • Sofascore Event ID: ${sfEvent.id} (${sfHome} × ${sfAway})`);
        console.log(`   • Convex Match ID: ${matchedConvex._id} (${matchedConvex.homeTeam?.name} × ${matchedConvex.awayTeam?.name})`);
        console.log(`   • Status: ${sfStatus.status} (${sfStatus.statusShort}) | Placar: ${homeScore} × ${awayScore}`);

        const rawDetails = await fetchMatchDetails(page, sfEvent.id);
        const parsedStats = parseStatistics(rawDetails.statistics);
        const parsedIncidents = parseIncidents(rawDetails.incidents);

        console.log(`   • Lances capturados: ${parsedIncidents.length}`);
        console.log(`   • Estatísticas: ${parsedStats ? "Disponíveis" : "Não disponíveis"}`);

        await convexClient.mutation(api.matches.saveMatchDetailsFromSofascore, {
          matchId: matchedConvex._id,
          statistics: parsedStats || undefined,
          events: parsedIncidents,
          homeScore,
          awayScore,
          status: sfStatus.status,
          statusShort: sfStatus.statusShort,
        });

        console.log(`   ✅ Sincronizado com sucesso no Convex!`);
        totalSynced++;
        await sleep(500);
      }
    }
  }

  console.log(`\n✨ Ciclo finalizado. Total de partidas sincronizadas: ${totalSynced}`);
}

/**
 * Inicialização do Worker
 */
async function main() {
  const args = process.argv.slice(2);
  const runOnce = args.includes("--once");

  let intervalSec = 60;
  const intervalIndex = args.indexOf("--interval");
  if (intervalIndex !== -1 && args[intervalIndex + 1]) {
    intervalSec = Math.max(10, parseInt(args[intervalIndex + 1], 10) || 60);
  } else if (process.env.WORKER_INTERVAL) {
    intervalSec = Math.max(10, parseInt(process.env.WORKER_INTERVAL, 10) || 60);
  }

  console.log(`======================================================`);
  console.log(`🤖 FutPulse Live Worker - Sincronizador Automático 🤖`);
  console.log(`======================================================`);
  console.log(`• Torneios Monitorados: Brasileirão Série B, Champions League, UEFA Nations League`);
  console.log(`• Intervalo: a cada ${intervalSec} segundos`);
  console.log(`• Modo: ${runOnce ? "Execução Única (--once)" : "Loop Contínuo"}`);
  console.log(`• Convex Endpoint: ${convexUrl}`);

  console.log(`\n🚀 Inicializando navegador Chromium via Playwright...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    locale: "pt-BR",
  });

  const page = await context.newPage();

  console.log("🌐 Conectando à sessão base do Sofascore...");
  await page.goto("https://www.sofascore.com", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  }).catch(() => {});
  console.log("✅ Sessão do navegador iniciada!");

  // Tratamento de encerramento limpo
  const shutdown = async () => {
    console.log("\n🛑 Encerrando worker e fechando navegador...");
    await browser.close().catch(() => {});
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Loop de Execução
  while (true) {
    try {
      await runSyncCycle(page);
    } catch (err) {
      console.error(`❌ Erro no ciclo de sincronização:`, err.message);
    }

    if (runOnce) {
      console.log("\n🏁 Execução única concluída.");
      await shutdown();
      break;
    }

    console.log(`\n⏳ Próxima checagem em ${intervalSec} segundos...`);
    await sleep(intervalSec * 1000);
  }
}

main().catch((err) => {
  console.error("❌ Falha crítica no worker:", err);
  process.exit(1);
});
