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

function extractEventId(input) {
  if (!input) return null;
  const urlMatch = input.match(/\/(\d+)(?:#|$|\?)/) || input.match(/id:(\d+)/);
  if (urlMatch) return urlMatch[1];
  const digitsMatch = input.match(/\b\d{6,12}\b/);
  if (digitsMatch) return digitsMatch[0];
  return input;
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
 * Extrai placar e status final oficial a partir dos incidentes
 */
function extractMatchResult(incidentsPayload) {
  if (!incidentsPayload?.incidents) return null;
  const ftIncident = incidentsPayload.incidents.find(
    (i) => i.incidentType === "period" && i.text === "FT"
  );
  if (ftIncident && ftIncident.homeScore !== undefined && ftIncident.awayScore !== undefined) {
    return {
      homeScore: ftIncident.homeScore,
      awayScore: ftIncident.awayScore,
      status: "FINISHED",
      statusShort: "FT",
    };
  }
  return null;
}

/**
 * Coleta os dados de uma única partida via sessão ativa do Playwright
 */
async function scrapeEventWithBrowser(page, eventId) {
  console.log(`\n🌐 Navegando para o evento Sofascore: ${eventId}...`);
  const targetUrl = `https://www.sofascore.com/event/${eventId}`;

  let interceptedStats = null;
  let interceptedIncidents = null;

  // Interceptador de rede em tempo real
  const responseHandler = async (response) => {
    try {
      const url = response.url();
      if (url.includes(`/event/${eventId}/statistics`) && response.status() === 200) {
        interceptedStats = await response.json();
      }
      if (url.includes(`/event/${eventId}/incidents`) && response.status() === 200) {
        interceptedIncidents = await response.json();
      }
    } catch {
      // Ignora respostas abortadas ou não-json
    }
  };

  page.on("response", responseHandler);

  try {
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Aguarda 3 segundos para as requisições AJAX iniciais carregarem
    await sleep(3000);

    // Se o Sofascore requerer clicar na aba de estatísticas
    if (!interceptedStats) {
      try {
        const statsTab = page.locator('text="Statistics", text="Estatísticas"').first();
        if (await statsTab.isVisible()) {
          await statsTab.click();
          await sleep(2000);
        }
      } catch {
        // Aba não encontrada ou já na tela
      }
    }

    // Fallback: se a interceptação passiva não pegou, dispara fetch de dentro do contexto do browser autenticado
    if (!interceptedStats) {
      console.log("  ↳ Disparando fetch contextual interno para /statistics...");
      interceptedStats = await page.evaluate(async (id) => {
        try {
          const res = await fetch(`https://api.sofascore.com/api/v1/event/${id}/statistics`, {
            headers: { Accept: "application/json" },
          });
          if (res.ok) return await res.json();
        } catch {
          return null;
        }
      }, eventId);
    }

    if (!interceptedIncidents) {
      console.log("  ↳ Disparando fetch contextual interno para /incidents...");
      interceptedIncidents = await page.evaluate(async (id) => {
        try {
          const res = await fetch(`https://api.sofascore.com/api/v1/event/${id}/incidents`, {
            headers: { Accept: "application/json" },
          });
          if (res.ok) return await res.json();
        } catch {
          return null;
        }
      }, eventId);
    }
  } finally {
    page.off("response", responseHandler);
  }

  return {
    statistics: interceptedStats,
    incidents: interceptedIncidents,
  };
}

/**
 * Processa a sincronização de uma partida individual
 */
async function syncSingleMatch(page, eventId, matchId) {
  console.log(`\n========================================`);
  console.log(`⚽ Processando Partida Sofascore ⚽`);
  console.log(`• Event ID: ${eventId}`);
  console.log(`• Convex Match ID: ${matchId}`);
  console.log(`========================================`);

  try {
    const rawData = await scrapeEventWithBrowser(page, eventId);

    const parsedStats = parseStatistics(rawData.statistics);
    const parsedIncidents = parseIncidents(rawData.incidents);
    const matchResult = extractMatchResult(rawData.incidents);

    console.log("📊 Estatísticas capturadas:", parsedStats ? "OK" : "Não disponíveis");
    console.log(`📋 Total de lances capturados: ${parsedIncidents.length}`);
    if (matchResult) {
      console.log(`🏆 Placar da súmula: ${matchResult.homeScore} × ${matchResult.awayScore} (${matchResult.statusShort})`);
    }

    if (matchId) {
      console.log(`🚀 Persistindo no Convex (partida: ${matchId})...`);
      const result = await convexClient.mutation(api.matches.saveMatchDetailsFromSofascore, {
        matchId,
        statistics: parsedStats || undefined,
        events: parsedIncidents,
        homeScore: matchResult?.homeScore,
        awayScore: matchResult?.awayScore,
        status: matchResult?.status,
        statusShort: matchResult?.statusShort,
      });

      console.log(`✅ Sucesso! Partida sincronizada:`);
      console.log(`   • Match ID: ${result.matchId}`);
      console.log(`   • Lances salvos: ${result.insertedEventsCount}`);
      console.log(`   • Estatísticas salvas: ${result.updatedStats ? "Sim" : "Não"}`);
    }
    return true;
  } catch (err) {
    console.error(`❌ Erro ao sincronizar evento ${eventId}:`, err.message);
    return false;
  }
}

/**
 * Fluxo Principal
 */
async function main() {
  const args = process.argv.slice(2);

  let itemsToSync = [];
  let isHeadless = true;

  if (args.includes("--headed")) {
    isHeadless = false;
  }

  const batchIndex = args.indexOf("--batch");
  if (batchIndex !== -1 && args[batchIndex + 1]) {
    const batchFilePath = path.resolve(process.cwd(), args[batchIndex + 1]);
    if (!fs.existsSync(batchFilePath)) {
      console.error(`❌ Arquivo de lote não encontrado: ${batchFilePath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(batchFilePath, "utf-8");
    itemsToSync = JSON.parse(raw);
    console.log(`📂 Lote carregado com ${itemsToSync.length} partida(s) de: ${batchFilePath}`);
  } else if (args[0] && !args[0].startsWith("--")) {
    const eventId = extractEventId(args[0]);
    const matchId = args[1];
    itemsToSync.push({ eventId, matchId });
  } else {
    console.log("Uso do Coletor Automatizado (Playwright):");
    console.log("  1. Partida Individual:");
    console.log("     node scripts/scrape-sofascore-batch.js <EVENT_ID_OU_URL> <CONVEX_MATCH_ID>");
    console.log("  2. Lote com Arquivo JSON:");
    console.log("     node scripts/scrape-sofascore-batch.js --batch scripts/fixtures/matches_to_sync.json");
    console.log("  Opcional: adicione --headed para visualizar a janela do navegador.");
    process.exit(0);
  }

  console.log(`\n🚀 Iniciando navegador Chromium via Playwright (Headless: ${isHeadless})...`);
  const browser = await chromium.launch({
    headless: isHeadless,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    locale: "pt-BR",
  });

  const page = await context.newPage();

  let successCount = 0;
  let failCount = 0;

  try {
    for (let i = 0; i < itemsToSync.length; i++) {
      const item = itemsToSync[i];
      const eventId = extractEventId(String(item.eventId));
      const matchId = item.matchId;

      console.log(`\n[${i + 1}/${itemsToSync.length}] Iniciando processamento...`);
      const ok = await syncSingleMatch(page, eventId, matchId);
      if (ok) successCount++;
      else failCount++;

      // Pausa defensiva entre requisições em lote (2 a 3 segundos)
      if (i < itemsToSync.length - 1) {
        console.log("⏳ Aguardando pausa defensiva (2.5s)...");
        await sleep(2500);
      }
    }
  } finally {
    console.log("\n🧹 Encerrando sessão do navegador...");
    await browser.close();
  }

  console.log(`\n🏁 Sincronização em lote concluída:`);
  console.log(`   • Sucessos: ${successCount}`);
  console.log(`   • Falhas: ${failCount}\n`);
}

main().catch((err) => {
  console.error("❌ Falha fatal no coletor:", err);
  process.exit(1);
});
