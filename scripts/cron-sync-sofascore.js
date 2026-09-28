import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// 1. Identificação do Endpoint Convex
function getConvexUrl() {
  if (process.env.CONVEX_URL && process.env.CONVEX_URL.trim() !== "") {
    return process.env.CONVEX_URL.trim();
  }
  if (process.env.VITE_CONVEX_URL && process.env.VITE_CONVEX_URL.trim() !== "") {
    return process.env.VITE_CONVEX_URL.trim();
  }

  const envPath = path.join(rootDir, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^(?:VITE_)?CONVEX_URL\s*=\s*(.+)$/);
      if (match && match[1].trim() !== "") return match[1].trim();
    }
  }
  return "https://kindly-hamster-661.convex.cloud";
}

const CONVEX_URL = getConvexUrl();
const client = new ConvexHttpClient(CONVEX_URL);

// Flags de execução
const isRunOnce = process.argv.includes("--once");
const LOOP_INTERVAL_MS = 60 * 1000; // 60 segundos
const MAX_RUN_TIME_MS = 50 * 60 * 1000; // 50 minutos máx por execução no GitHub Actions

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTimestamp() {
  return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

// Normalizador de nomes de seleções e clubes
const TEAM_ALIASES = {
  // Seleções europeias (Sofascore/ESPN -> FutPulse)
  germany: "alemanha",
  deutschland: "alemanha",
  france: "frança",
  franca: "frança",
  italy: "itália",
  italia: "itália",
  spain: "espanha",
  espana: "espanha",
  netherlands: "países baixos",
  holland: "países baixos",
  holanda: "países baixos",
  portugal: "portugal",
  england: "inglaterra",
  belgium: "bélgica",
  belgica: "bélgica",
  croatia: "croácia",
  croacia: "croácia",
  denmark: "dinamarca",
  norway: "noruega",
  serbia: "sérvia",
  servia: "sérvia",
  czechia: "tchéquia",
  "czech republic": "tchéquia",
  poland: "polônia",
  polonia: "polônia",
  austria: "áustria",
  turkey: "turquia",
  türkiye: "turquia",

  // Clubes Brasileiros
  "santos fc": "santos",
  "novorizontino sp": "novorizontino",
  "gremio novorizontino": "novorizontino",
  "sport recife": "sport",
  "ceara sc": "ceará",
  "ceara": "ceará",
  "coritiba fbc": "coritiba",
  "vila nova fc": "vila nova",
  "america mg": "américa-mg",
  "america mineiro": "américa-mg",
  "goias ec": "goiás",
  "goias": "goiás",
  "avai fc": "avaí",
  "avai": "avaí",
  "operario pr": "operário",
  "operario ferroviario": "operário",
  "amazonas fc": "amazonas",
  "aa ponte preta": "ponte preta",
  "botafogo sp": "botafogo-sp",
  "botafogo de ribeirao preto": "botafogo-sp",
  "paysandu sc": "paysandu",
  "chapecoense af": "chapecoense",
  "crb al": "crb",
  "ituano fc": "ituano",
  "brusque fc": "brusque",
  "guarani fc": "guarani",
  "mirassol fc": "mirassol",
  "vasco da gama": "vasco",
  "cr vasco da gama": "vasco",
};

function normalizeName(name) {
  if (!name) return "";
  const clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|ec|sc|cr|ac|fbc|clube|club|de|da|do|af)\b/gi, "")
    .replace(/[-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return TEAM_ALIASES[clean] || clean;
}

function matchTeams(nameA, nameB) {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const wordsA = normA.split(" ").filter((w) => w.length >= 4);
  const wordsB = normB.split(" ").filter((w) => w.length >= 4);
  return wordsA.some((w) => wordsB.includes(w));
}

// 2. Consulta à API Sofascore com headers realistas
async function fetchSofascoreLiveEvents() {
  const url = "https://api.sofascore.com/api/v1/sport/football/events/live";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "https://www.sofascore.com",
        Referer: "https://www.sofascore.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data?.events || [];
    }
  } catch {
    // Falha silenciosa para ativar fallback
  }
  return [];
}

// 3. Consulta de fallback via ESPN Scoreboards (aberto e livre de Cloudflare)
async function fetchEspnLiveEvents() {
  const endpoints = [
    "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.nations/scoreboard",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.2/scoreboard",
  ];

  const results = [];
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          results.push(...data.events);
        }
      }
    } catch {
      // Ignora falha de endpoint específico
    }
  }
  return results;
}

// 4. Execução de uma rodada de sincronização
async function runSyncRound(convexMatches) {
  let updatedCount = 0;
  const liveMatches = convexMatches.filter((m) =>
    ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
  );

  // A. Dispara ação nativa do backend Convex (Sofascore + Fallback ESPN)
  try {
    const convexResult = await client.action(api.syncSofascore.syncLiveFromSofascore, {});
    if (convexResult?.updated > 0) {
      updatedCount += convexResult.updated;
      for (const item of convexResult.updatedMatches || []) {
        console.log(`[LIVE SYNC] [${getTimestamp()}] 🔄 ${item.match} (${item.status})`);
      }
    }
  } catch (err) {
    console.warn(`[LIVE SYNC] [${getTimestamp()}] ⚠️ Aviso ao executar syncLiveFromSofascore: ${err.message}`);
  }

  // B. Tenta captura direta no Sofascore / ESPN para enriquecer estatísticas de partidas ao vivo
  if (liveMatches.length > 0) {
    let sofascoreEvents = await fetchSofascoreLiveEvents();
    const isSofascoreAvailable = sofascoreEvents.length > 0;

    if (!isSofascoreAvailable) {
      // Fallback para ESPN
      const espnEvents = await fetchEspnLiveEvents();
      for (const ev of espnEvents) {
        const competition = ev.competitions?.[0];
        if (!competition) continue;
        const competitors = competition.competitors || [];
        const homeComp = competitors.find((c) => c.homeAway === "home");
        const awayComp = competitors.find((c) => c.homeAway === "away");
        if (!homeComp || !awayComp) continue;

        const homeName = homeComp.team?.name || homeComp.team?.displayName || "";
        const awayName = awayComp.team?.name || awayComp.team?.displayName || "";
        const homeScore = parseInt(homeComp.score ?? "0", 10);
        const awayScore = parseInt(awayComp.score ?? "0", 10);

        const state = ev.status?.type?.state;
        const detail = ev.status?.type?.shortDetail || "";
        const minuteMatch = detail.match(/\d+/);
        const minute = minuteMatch ? parseInt(minuteMatch[0], 10) : undefined;

        let status = "IN_PLAY";
        let statusShort = detail || "AO VIVO";

        if (state === "post") {
          status = "FINISHED";
          statusShort = "FIM";
        } else if (state === "in" && (detail.includes("HT") || detail.toLowerCase().includes("halftime"))) {
          status = "HALFTIME";
          statusShort = "INT";
        }

        const targetMatch = liveMatches.find(
          (m) =>
            matchTeams(m.homeTeam?.name, homeName) &&
            matchTeams(m.awayTeam?.name, awayName)
        );

        if (targetMatch) {
          try {
            await client.mutation(api.matches.saveMatchDetailsFromSofascore, {
              matchId: targetMatch._id,
              homeScore,
              awayScore,
              status,
              statusShort,
              minute,
            });
            updatedCount++;
            console.log(
              `[LIVE SYNC] [${getTimestamp()}] ⚽ ${targetMatch.homeTeam.name} ${homeScore} x ${awayScore} ${targetMatch.awayTeam.name} [${statusShort}]`
            );
          } catch (err) {
            console.warn(`[LIVE SYNC] [${getTimestamp()}] Falha ao salvar partida ${targetMatch._id}: ${err.message}`);
          }
        }
      }
    } else {
      // Processa partidas ativas do Sofascore
      for (const ev of sofascoreEvents) {
        const evHome = ev.homeTeam?.name || "";
        const evAway = ev.awayTeam?.name || "";
        const homeScore = ev.homeScore?.current ?? 0;
        const awayScore = ev.awayScore?.current ?? 0;
        const statusType = ev.status?.type;
        const minute = ev.statusTime?.minute;

        let status = "IN_PLAY";
        let statusShort = minute ? `${minute}'` : "AO VIVO";

        if (statusType === "finished") {
          status = "FINISHED";
          statusShort = "FT";
        }

        const targetMatch = liveMatches.find(
          (m) =>
            matchTeams(m.homeTeam?.name, evHome) &&
            matchTeams(m.awayTeam?.name, evAway)
        );

        if (targetMatch) {
          try {
            await client.mutation(api.matches.saveMatchDetailsFromSofascore, {
              matchId: targetMatch._id,
              homeScore,
              awayScore,
              status,
              statusShort,
              minute,
            });
            updatedCount++;
            console.log(
              `[LIVE SYNC] [${getTimestamp()}] ⚽ ${targetMatch.homeTeam.name} ${homeScore} x ${awayScore} ${targetMatch.awayTeam.name} [${statusShort}]`
            );
          } catch (err) {
            console.warn(`[LIVE SYNC] [${getTimestamp()}] Falha ao salvar partida ${targetMatch._id}: ${err.message}`);
          }
        }
      }
    }

    // C. Atualização suave de relógio para partidas ao vivo sem evento externo imediato
    for (const m of liveMatches) {
      if (m.status === "IN_PLAY") {
        const currentMinute = m.minute || 1;
        if (currentMinute < 90) {
          const nextMinute = Math.min(90, currentMinute + 1);
          try {
            await client.mutation(api.matches.saveMatchDetailsFromSofascore, {
              matchId: m._id,
              minute: nextMinute,
              status: "IN_PLAY",
              statusShort: `${nextMinute}'`,
            });
          } catch {
            // Continua
          }
        }
      }
    }
  }

  return updatedCount;
}

// 5. Função Principal / Ciclo de Execução
async function main() {
  console.log("===============================================================================");
  console.log(" 🌐 FUTPULSE — Sincronizador Autônomo Sofascore (GitHub Actions / Cloud)");
  console.log("===============================================================================");
  console.log(`[LIVE SYNC] [${getTimestamp()}] 🔗 Endpoint Convex: ${CONVEX_URL}`);
  if (isRunOnce) {
    console.log(`[LIVE SYNC] [${getTimestamp()}] ⚙️ Modo: Execução única (--once)`);
  }

  const startTime = Date.now();

  // Consulta inicial de partidas cadastradas no Convex
  let matches = await client.query(api.matches.listMatches, {});
  const totalMatches = matches.length;
  let liveMatches = matches.filter((m) =>
    ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
  );

  console.log(
    `[LIVE SYNC] [${getTimestamp()}] 📋 Total de partidas no banco: ${totalMatches} | Ao vivo agora: ${liveMatches.length}`
  );

  // Primeira rodada de sincronização
  console.log(`[LIVE SYNC] [${getTimestamp()}] 🚀 Executando rodada inicial de sincronização...`);
  const initialUpdates = await runSyncRound(matches);
  console.log(
    `[LIVE SYNC] [${getTimestamp()}] ✅ Rodada inicial finalizada com ${initialUpdates} atualizações aplicadas.`
  );

  // Re-consulta para avaliar partidas ao vivo
  matches = await client.query(api.matches.listMatches, {});
  liveMatches = matches.filter((m) =>
    ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
  );

  // Se não houver jogos ao vivo ou for modo --once, finaliza
  if (liveMatches.length === 0 || isRunOnce) {
    if (liveMatches.length === 0) {
      console.log(
        `[LIVE SYNC] [${getTimestamp()}] ℹ️ Nenhuma partida em andamento (IN_PLAY / LIVE). Sincronização pontual concluída com sucesso.`
      );
    } else {
      console.log(
        `[LIVE SYNC] [${getTimestamp()}] ℹ️ Modo --once ativado. Sincronização pontual finalizada.`
      );
    }
    console.log("===============================================================================");
    process.exit(0);
  }

  // Loop minuto a minuto para jogos ao vivo
  console.log(
    `[LIVE SYNC] [${getTimestamp()}] 🔴 ${liveMatches.length} partida(s) ao vivo em andamento. Iniciando loop minuto a minuto (máx. 50min)...`
  );

  for (const m of liveMatches) {
    console.log(`   • ${m.homeTeam?.name || "Mandante"} vs ${m.awayTeam?.name || "Visitante"} [${m.status}]`);
  }

  let cycle = 1;
  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= MAX_RUN_TIME_MS) {
      console.log(
        `[LIVE SYNC] [${getTimestamp()}] ⏱️ Limite da janela de execução alcançado (50min). Encerrando ciclo para agendamento seguinte.`
      );
      break;
    }

    console.log(`[LIVE SYNC] [${getTimestamp()}] ⏳ Aguardando próximo ciclo de 60 segundos...`);
    await sleep(LOOP_INTERVAL_MS);

    cycle++;
    console.log(`\n[LIVE SYNC] [${getTimestamp()}] 🔄 Ciclo #${cycle} de sincronização ao vivo...`);

    matches = await client.query(api.matches.listMatches, {});
    liveMatches = matches.filter((m) =>
      ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
    );

    if (liveMatches.length === 0) {
      console.log(
        `[LIVE SYNC] [${getTimestamp()}] 🏁 Todas as partidas ao vivo foram encerradas. Finalizando processo.`
      );
      break;
    }

    const updates = await runSyncRound(matches);
    console.log(
      `[LIVE SYNC] [${getTimestamp()}] Partidas ao vivo ativas: ${liveMatches.length} | Atualizações no ciclo: ${updates}`
    );
  }

  console.log(`[LIVE SYNC] [${getTimestamp()}] 🎉 Sincronização autônoma concluída com sucesso.`);
  console.log("===============================================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error(`[LIVE SYNC] [${getTimestamp()}] ❌ Erro fatal no sincronizador:`, err);
  process.exit(1);
});
