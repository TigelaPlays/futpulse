import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const isForce = process.argv.includes("--force");

// 1. Carrega URL do Convex do .env.local
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

const CONVEX_URL = getConvexUrl();
const client = new ConvexHttpClient(CONVEX_URL);

// Mapeamento de extensões para MIME Types
const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

// Dicionário de Aliases para Clubes
const TEAM_ALIASES = {
  // Clubes Série B
  "america mineiro": "america mg",
  "america-mg": "america mg",
  "athletic club": "athletic",
  "atletico goianiense": "atletico go",
  "atletico-go": "atletico go",
  "botafogo sp": "botafogo sp",
  "botafogo-sp": "botafogo sp",
  "operario pr": "operario pr",
  "operario-pr": "operario pr",
  "operario ferroviario": "operario pr",
  "goias": "goias",

  // Clubes Champions League e Europeus
  "fc barcelona": "barcelona",
  "barcelona": "barcelona",
  "real madrid": "real madrid",
  "real madrid cf": "real madrid",
  "bayern munich": "bayern munchen",
  "bayern de munique": "bayern munchen",
  "bayern munchen": "bayern munchen",
  "fc bayern munchen": "bayern munchen",
  "manchester city": "manchester city",
  "man city": "manchester city",
  "manchester united": "manchester united",
  "man united": "manchester united",
  "arsenal": "arsenal",
  "arsenal fc": "arsenal",
  "liverpool": "liverpool",
  "liverpool fc": "liverpool",
  "paris saint germain": "paris saint germain",
  "paris saint-germain": "paris saint germain",
  "psg": "paris saint germain",
  "psg copia": "paris saint germain",
  "inter milan": "inter de milao",
  "inter de milao": "inter de milao",
  "internazionale": "inter de milao",
  "inter": "inter de milao",
  "ac milan": "ac milan",
  "milan": "ac milan",
  "borussia dortmund": "borussia dortmund",
  "dortmund": "borussia dortmund",
  "atletico de madrid": "atletico de madrid",
  "atletico madrid": "atletico de madrid",
  "rb leipzig": "rb leipzig",
  "rb leipzig copia": "rb leipzig",
  "leipzig": "rb leipzig",
  "bayer leverkusen": "bayer leverkusen",
  "leverkusen": "bayer leverkusen",
  "juventus": "juventus",
  "atalanta": "atalanta",
  "aston villa": "aston villa",
  "sporting cp": "sporting cp",
  "sporting lisboa": "sporting cp",
  "sporting": "sporting cp",
  "benfica": "benfica",
  "sl benfica": "benfica",
  "porto": "porto",
  "porto copia": "porto",
  "fc porto": "porto",
  "feyenoord": "feyenoord",
  "feyenoord rotterdam": "feyenoord",
  "psv": "psv eindhoven",
  "psv copia": "psv eindhoven",
  "psv eindhoven": "psv eindhoven",
  "club brugge": "club brugge",
  "brugge": "club brugge",
  "shakhtar donetsk": "shakhtar donetsk",
  "shakhtar": "shakhtar donetsk",
  "lille": "lille",
  "lille osc": "lille",
  "stuttgart": "stuttgart",
  "vfb stuttgart": "stuttgart",
  "slovan bratislava": "slovan bratislava",
  "celtic": "celtic",
  "monaco": "monaco",
  "as monaco": "monaco",
  "bologna": "bologna",
  "girona": "girona",
  "sparta praha": "sparta praha",
  "sparta praga": "sparta praha",
  "slavia praha": "slavia praha",
  "slavia praga": "slavia praha",
  "crvena zvezda": "crvena zvezda",
  "estrela vermelha": "crvena zvezda",
  "dinamo zagreb": "dinamo zagreb",
  "red bull salzburg": "red bull salzburg",
  "salzburg": "red bull salzburg",
  "young boys": "young boys",
  "sturm graz": "sturm graz",
  "brest": "brest",
  "stade brestois": "brest",
  "como": "como",
  "napoli": "napoli",
  "roma": "roma",
  "villarreal": "villarreal",
  "real betis": "real betis",
  "real betis copia": "real betis",
  "lens": "lens",
  "galatasaray": "galatasaray",
  "galatasaray sk": "galatasaray",
  "fenerbahce": "fenerbahce",
  "fenerbahce sk": "fenerbahce",
  "fk bodo glimt": "fk bodo glimt",
  "aek athens": "aek athens",
  "lask": "lask",
  "viking stavanger": "viking stavanger",
  "sabah": "sabah",
};

function normalizeTeamName(str) {
  const cleanStr = str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .trim();
  return TEAM_ALIASES[cleanStr] || cleanStr;
}

// Dicionário de Aliases e Normalização para Estádios da Série B
const STADIUM_ALIASES = {
  // Arena Independência
  "arena independencia": "Arena Independência",
  "independencia": "Arena Independência",

  // Arena Pantanal
  "arena pantanal": "Arena Pantanal",

  // Estádio Alfredo Jaconi
  "estadio alfredo jaconi": "Estádio Alfredo Jaconi",
  "alfredo jaconi": "Estádio Alfredo Jaconi",

  // Estádio Antônio Accioly
  "estadio antonio accioly": "Antônio Accioly",
  "antonio accioly": "Antônio Accioly",

  // Estádio da Ressacada
  "estadio da ressacada": "Estádio da Ressacada",
  "ressacada": "Estádio da Ressacada",

  // Estádio da Serrinha / Hailé Pinheiro
  "estadio da serrinha": "Estádio da Serrinha",
  "serrinha": "Estádio da Serrinha",
  "haile pinheiro": "Estádio da Serrinha",
  "haile pinheiro (serrinha)": "Estádio da Serrinha",
  "haile pinheiro serrinha": "Estádio da Serrinha",

  // Estádio dos Aflitos
  "estadio dos aflitos": "Estádio dos Aflitos",
  "aflitos": "Estádio dos Aflitos",

  // Estádio Dr. Jorge Ismael de Biasi
  "estadio dr jorge ismael de biasi": "Jorge Ismael de Biasi",
  "estadio dr. jorge ismael de biasi": "Jorge Ismael de Biasi",
  "estadio jorge ismael de biasi": "Jorge Ismael de Biasi",
  "jorge ismael de biasi": "Jorge Ismael de Biasi",
  "jorjao": "Jorge Ismael de Biasi",

  // Estádio Germano Krüger
  "estadio germano kruger": "Estádio Germano Krüger",
  "germano kruger": "Estádio Germano Krüger",

  // Estádio Governador Plácido Castelo / Castelão
  "estadio governador placido castelo": "Arena Castelão",
  "governador placido castelo": "Arena Castelão",
  "castelao": "Arena Castelão",
  "castelao (ce)": "Arena Castelão",
  "castelao ce": "Arena Castelão",
  "arena castelao": "Arena Castelão",

  // Estádio Heriberto Hülse
  "estadio heriberto hulse": "Estádio Heriberto Hülse",
  "heriberto hulse": "Estádio Heriberto Hülse",

  // Estádio Jacy Scaff / Estádio do Café / VGD
  "estadio jacy scaff": "Estádio do Café",
  "jacy scaff": "Estádio do Café",
  "estadio do cafe": "Estádio do Café",
  "vgd": "Estádio do Café",

  // Estádio Joaquim Portugal / Arena Sicredi
  "estadio joaquim portugal": "Arena Sicredi",
  "joaquim portugal": "Arena Sicredi",
  "arena sicredi": "Arena Sicredi",

  // Estádio Onésio Brasileiro Alvarenga / OBA
  "estadio onesio brasileiro alvarenga": "Onésio Brasileiro Alvarenga",
  "onesio brasileiro alvarenga": "Onésio Brasileiro Alvarenga",
  "oba": "Onésio Brasileiro Alvarenga",

  // Estádio Primeiro de Maio
  "estadio primeiro de maio": "Estádio Primeiro de Maio",
  "primeiro de maio": "Estádio Primeiro de Maio",

  // Estádio Rei Pelé
  "estadio rei pele": "Estádio Rei Pelé",
  "rei pele": "Estádio Rei Pelé",

  // Estádio Santa Cruz / Arena Nicnet
  "estadio santa cruz": "Estádio Santa Cruz",
  "santa cruz": "Estádio Santa Cruz",
  "arena nicnet": "Estádio Santa Cruz",

  // Ilha do Retiro / Adelmar da Costa Carvalho
  "ilha do retiro": "Ilha do Retiro",
  "adelmar da costa carvalho": "Ilha do Retiro",
  "estadio adelmar da costa carvalho": "Ilha do Retiro",

  // Moisés Lucarelli / Majestoso
  "moises lucarelli": "Moisés Lucarelli",
  "majestoso": "Moisés Lucarelli",
  "estadio moises lucarelli": "Moisés Lucarelli",

  // Champions League e Estádios Europeus
  "allianz arena": "Allianz Arena",
  "anfield": "Anfield",
  "anfield road": "Anfield",
  "emirates stadium": "Emirates Stadium",
  "emirates": "Emirates Stadium",
  "etihad stadium": "Etihad Stadium",
  "etihad": "Etihad Stadium",
  "city of manchester stadium": "Etihad Stadium",
  "san siro": "San Siro",
  "giuseppe meazza": "San Siro",
  "estadio giuseppe meazza": "San Siro",
  "stadio giuseppe meazza": "San Siro",
  "santiago bernabeu": "Santiago Bernabéu",
  "estadio santiago bernabeu": "Santiago Bernabéu",
  "bernabeu": "Santiago Bernabéu",
  "parc des princes": "Parc des Princes",
  "parque dos principes": "Parc des Princes",
  "signal iduna park": "Signal Iduna Park",
  "westfalenstadion": "Signal Iduna Park",
  "spotify camp nou": "Spotify Camp Nou",
  "camp nou": "Spotify Camp Nou",
  "estadio camp nou": "Spotify Camp Nou",
  "riyadh air metropolitano": "Riyadh Air Metropolitano",
  "civitas metropolitano": "Riyadh Air Metropolitano",
  "wanda metropolitano": "Riyadh Air Metropolitano",
  "metropolitano": "Riyadh Air Metropolitano",
  "estadio metropolitano": "Riyadh Air Metropolitano",
  "stadion feijenoord": "Stadion Feijenoord",
  "de kuip": "Stadion Feijenoord",
  "feijenoord": "Stadion Feijenoord",
  "jan breydelstadion": "Jan Breydelstadion",
  "jan breydel stadium": "Jan Breydelstadion",
  "jan breydel": "Jan Breydelstadion",
  "jose alvalade": "José Alvalade",
  "estadio jose alvalade": "José Alvalade",
  "alvalade": "José Alvalade",
  "mhparena": "MHPArena",
  "mhp arena": "MHPArena",
  "mercedes benz arena": "MHPArena",
  "villa park": "Villa Park",
  "decathlon arena - stade pierre mauroy": "Decathlon Arena - Stade Pierre-Mauroy",
  "decathlon arena stade pierre mauroy": "Decathlon Arena - Stade Pierre-Mauroy",
  "stade pierre mauroy": "Decathlon Arena - Stade Pierre-Mauroy",
  "pierre mauroy": "Decathlon Arena - Stade Pierre-Mauroy",
  "philips stadion": "Philips Stadion",
  "philips stadium": "Philips Stadion",
  "red bull arena": "Red Bull Arena",
  "stadio olimpico": "Stadio Olimpico",
  "stadio olimpico di roma": "Stadio Olimpico",
  "olimpico di roma": "Stadio Olimpico",
  "olimpico": "Stadio Olimpico",
  "stadio diego armando maradona": "Stadio Diego Armando Maradona",
  "diego armando maradona": "Stadio Diego Armando Maradona",
  "san paolo": "Stadio Diego Armando Maradona",
  "old trafford": "Old Trafford",
  "estadio do dragao": "Estádio do Dragão",
  "do dragao": "Estádio do Dragão",
  "dragao": "Estádio do Dragão",
  "benito villamarin": "Estadio Benito Villamarín",
  "estadio benito villamarin": "Estadio Benito Villamarín",
  "estadio de la ceramica": "Estadio de la Cerámica",
  "de la ceramica": "Estadio de la Cerámica",
  "el madrigal": "Estadio de la Cerámica",
  "stade bollaert delelis": "Stade Bollaert-Delelis",
  "bollaert delelis": "Stade Bollaert-Delelis",
  "stadio giuseppe sinigaglia": "Stadio Giuseppe Sinigaglia",
  "giuseppe sinigaglia": "Stadio Giuseppe Sinigaglia",
  "rams park": "RAMS Park",
  "ali sami yen": "RAMS Park",
  "fortuna arena": "Fortuna Arena",
  "eden arena": "Fortuna Arena",
  "stadion tehelne pole": "Štadión Tehelné pole",
  "tehelne pole": "Štadión Tehelné pole",
  "oblasny sportkomplex metalist": "Metalist Stadium",
  "metalist stadium": "Metalist Stadium",
  "opap arena": "OPAP Arena",
  "agia sophia stadium": "OPAP Arena",
  "raiffeisen arena": "Raiffeisen Arena",
  "aspmyra stadion": "Aspmyra Stadion",
  "bank respublika arena": "Bank Respublika Arena",
  "chobani stadium": "Chobani Stadium",
  "lyse arena": "Lyse Arena",
  "allianz stadium": "Allianz Stadium",
  "wankdorf stadium": "Wankdorf Stadium",
  "wankdorf": "Wankdorf Stadium",
  "epet arena": "epet ARENA",
  "renato dall ara": "Renato Dall'Ara",
  "renato dallara": "Renato Dall'Ara",
  "celtic park": "Celtic Park",
  "rajko mitic stadium": "Rajko Mitić Stadium",
  "rajko mitic": "Rajko Mitić Stadium",
  "marakana de belgrado": "Rajko Mitić Stadium",
  "stade louis ii": "Stade Louis-II",
  "stade louis 2": "Stade Louis-II",
  "gewiss stadium": "Gewiss Stadium",
  "stade de roudourou": "Stade de Roudourou",
  "roudourou": "Stade de Roudourou",
};

function cleanStadiumString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStadiumName(str) {
  const clean = cleanStadiumString(str);
  return STADIUM_ALIASES[clean] || str;
}

function findMatchingStadium(allStadiums, rawQuery) {
  const cleanQuery = cleanStadiumString(rawQuery);
  const canonicalTarget = normalizeStadiumName(rawQuery);
  const cleanCanonical = cleanStadiumString(canonicalTarget);

  let match = allStadiums.find(
    (s) =>
      s.name.toLowerCase() === rawQuery.toLowerCase() ||
      s.name.toLowerCase() === canonicalTarget.toLowerCase()
  );
  if (match) return match;

  match = allStadiums.find((s) => {
    const sClean = cleanStadiumString(s.name);
    const sCanonical = cleanStadiumString(STADIUM_ALIASES[sClean] || s.name);
    return (
      sCanonical === cleanCanonical ||
      sClean === cleanQuery ||
      sClean === cleanCanonical ||
      sCanonical === cleanQuery
    );
  });
  if (match) return match;

  match = allStadiums.find((s) => {
    const sClean = cleanStadiumString(s.name);
    const sCore = sClean.replace(/^(estadio|arena)\s+(da|do|dos|de)?\s*/i, "").trim();
    const queryCore = cleanQuery.replace(/^(estadio|arena)\s+(da|do|dos|de)?\s*/i, "").trim();
    const canonicalCore = cleanCanonical.replace(/^(estadio|arena)\s+(da|do|dos|de)?\s*/i, "").trim();

    return (
      (sCore.length >= 3 && queryCore.includes(sCore)) ||
      (queryCore.length >= 3 && sCore.includes(queryCore)) ||
      (sCore.length >= 3 && canonicalCore.includes(sCore)) ||
      (canonicalCore.length >= 3 && sCore.includes(canonicalCore))
    );
  });

  return match || null;
}

// Converte nome de arquivo (ex: "Arena Independência.webp" ou "vila-nova.png") para nome legível
function formatName(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return base.replace(/[-_]/g, " ").trim();
}

function checkAlreadySynced(rawName, category, uploadTargets) {
  if (category === "teams") {
    const norm = normalizeTeamName(rawName);
    const matchingTeams = uploadTargets.teams.filter((t) => normalizeTeamName(t.name) === norm);
    const matchedWithLogo = matchingTeams.find((t) => t.hasCustomLogo);
    const matched = matchedWithLogo || matchingTeams[0];
    if (matched && matched.hasCustomLogo) {
      return { isSynced: true, name: matched.name, type: "Time" };
    }
    return { isSynced: false, name: rawName, type: "Time" };
  }

  if (category === "leagues") {
    const clean = (str) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-_]/g, " ").trim();
    const norm = clean(rawName);
    const matchingLeagues = uploadTargets.leagues.filter((l) => clean(l.name) === norm);
    const matchedWithLogo = matchingLeagues.find((l) => l.hasCustomLogo);
    const matched = matchedWithLogo || matchingLeagues[0];
    if (matched && matched.hasCustomLogo) {
      return { isSynced: true, name: matched.name, type: "Liga" };
    }
    return { isSynced: false, name: rawName, type: "Liga" };
  }

  if (category === "stadiums") {
    const allMatches = uploadTargets.stadiums.filter((s) => {
      const match = findMatchingStadium([s], rawName);
      return !!match;
    });
    const matchedWithImage = allMatches.find((s) => s.hasCustomImage);
    const matched = matchedWithImage || allMatches[0] || findMatchingStadium(uploadTargets.stadiums, rawName);
    if (matched && matched.hasCustomImage) {
      return { isSynced: true, name: matched.name, type: "Estádio" };
    }
    return { isSynced: false, name: rawName, type: "Estádio" };
  }

  return { isSynced: false, name: rawName, type: "Ativo" };
}

async function uploadSingleFile(filePath, category) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    return null;
  }

  const rawName = formatName(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  console.log(`\n⏳ Enviando [${category}] "${rawName}" (${(fileBuffer.length / 1024).toFixed(1)} KB)...`);

  // 1. Gera URL de upload segura no Convex
  const uploadUrl = await client.mutation(api.assets.generateUploadUrl, {});

  // 2. Faz o POST do binário para o File Storage do Convex
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Falha no upload HTTP: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  const { storageId } = await uploadRes.json();

  // 3. Vincula ao banco no Convex
  if (category === "teams") {
    const result = await client.mutation(api.assets.linkTeamLogo, {
      teamName: rawName,
      storageId,
    });
    return { name: result.name, url: result.url, type: "Time" };
  }

  if (category === "leagues") {
    const result = await client.mutation(api.assets.linkLeagueLogo, {
      leagueName: rawName,
      storageId,
    });
    if (result.success) {
      return { name: result.name, url: result.url, type: "Liga" };
    } else {
      console.warn(`⚠️ Liga "${rawName}" não encontrada no banco. Cadastre-a primeiro.`);
      return null;
    }
  }

  if (category === "stadiums") {
    const result = await client.mutation(api.assets.linkStadiumImage, {
      stadiumName: rawName,
      storageId,
    });
    return { name: result.name, url: result.url, type: "Estádio" };
  }

  return null;
}

async function run() {
  console.log("==================================================");
  console.log("🚀 FutPulse — Upload de Ativos para o Convex CDN");
  console.log(`🌐 Convex Deployment: ${CONVEX_URL}`);
  if (isForce) {
    console.log("⚡ Modo --force ativado: reenviando e sobrescrevendo todos os ativos");
  } else {
    console.log("🛡️ Modo Inteligente: pulando ativos já sincronizados");
  }
  console.log("==================================================");

  console.log("🔍 Consultando estado atual dos ativos no Convex...");
  let uploadTargets = { teams: [], leagues: [], stadiums: [] };
  try {
    uploadTargets = await client.query(api.assets.listUploadTargets, {});
    console.log(
      `📊 Cadastrados: ${uploadTargets.teams.length} times (${uploadTargets.teams.filter((t) => t.hasCustomLogo).length} com escudo), ` +
      `${uploadTargets.stadiums.length} estádios (${uploadTargets.stadiums.filter((s) => s.hasCustomImage).length} com foto)`
    );
  } catch (err) {
    console.warn("⚠️ Não foi possível obter o cache inicial do Convex. Prosseguindo sem cache:", err.message);
  }

  const folders = [
    { dir: path.join(rootDir, "assets", "teams"), category: "teams", label: "Times" },
    { dir: path.join(rootDir, "assets", "leagues"), category: "leagues", label: "Ligas" },
    { dir: path.join(rootDir, "assets", "stadiums"), category: "stadiums", label: "Estádios" },
  ];

  let totalUploaded = 0;
  let totalSkipped = 0;

  for (const f of folders) {
    if (!fs.existsSync(f.dir)) continue;

    const files = fs.readdirSync(f.dir).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      const isCopy = / - copi?a/i.test(file) || / - copy/i.test(file);
      return !isCopy && Object.keys(MIME_TYPES).includes(ext);
    });

    if (files.length === 0) {
      console.log(`\n📁 [${f.label}] Nenhum arquivo de imagem encontrado em "assets/${f.category}/".`);
      if (f.category === "stadiums") {
        console.log(`   💡 Salve os arquivos de estádio (.webp / .png) na pasta:`);
        console.log(`   👉 ${f.dir}`);
      }
      continue;
    }

    console.log(`\n📁 [${f.label}] Encontrados ${files.length} arquivo(s) para verificar:`);

    for (const file of files) {
      const filePath = path.join(f.dir, file);
      const rawName = formatName(file);

      // Checa se já possui imagem vinculada na CDN
      if (!isForce) {
        const syncStatus = checkAlreadySynced(rawName, f.category, uploadTargets);
        if (syncStatus.isSynced) {
          console.log(`⏭️ [${syncStatus.type}] "${syncStatus.name}" já possui imagem sincronizada na CDN. Pulando...`);
          totalSkipped++;
          continue;
        }
      }

      try {
        const res = await uploadSingleFile(filePath, f.category);
        if (res) {
          console.log(`✅ [${res.type}] "${res.name}" atualizado com sucesso!`);
          console.log(`   🔗 CDN URL: ${res.url}`);
          totalUploaded++;
        }
      } catch (err) {
        console.error(`❌ Erro ao enviar "${file}":`, err.message);
      }
    }
  }

  console.log("\n==================================================");
  if (totalUploaded > 0 || totalSkipped > 0) {
    console.log(`🎉 Resumo da sincronização:`);
    console.log(`   - ${totalUploaded} imagem(ns) enviada(s) com sucesso`);
    console.log(`   - ${totalSkipped} imagem(ns) já sincronizada(s) (puladas)`);
    if (totalSkipped > 0) {
      console.log(`   💡 Dica: Use "node scripts/upload-assets.js --force" para re-enviar todos os arquivos.`);
    }
  } else {
    console.log("💡 Nenhuma imagem enviada.");
    console.log("👉 Dica: Adicione arquivos .png, .jpg ou .webp nas pastas:");
    console.log("   - assets/teams/       (ex: vila-nova.webp)");
    console.log("   - assets/leagues/     (ex: brasileirao-serie-b.webp)");
    console.log("   - assets/stadiums/    (ex: Arena Independência.webp)");
  }
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
