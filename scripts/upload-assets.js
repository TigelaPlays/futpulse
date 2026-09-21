import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

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

// Converte nome de arquivo (ex: "vila-nova.png" ou "Vila Nova.png") para nome legível
function formatName(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return base.replace(/[-_]/g, " ").trim();
}

async function uploadSingleFile(filePath, category) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    return null; // ignora arquivos que não são imagens (ex: .gitkeep)
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
  console.log("==================================================");

  const folders = [
    { dir: path.join(rootDir, "assets", "teams"), category: "teams", label: "Times" },
    { dir: path.join(rootDir, "assets", "leagues"), category: "leagues", label: "Ligas" },
    { dir: path.join(rootDir, "assets", "stadiums"), category: "stadiums", label: "Estádios" },
  ];

  let totalUploaded = 0;

  for (const f of folders) {
    if (!fs.existsSync(f.dir)) continue;

    const files = fs.readdirSync(f.dir).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return Object.keys(MIME_TYPES).includes(ext);
    });

    if (files.length === 0) {
      console.log(`\n📁 [${f.label}] Nenhum arquivo de imagem encontrado em "assets/${f.category}/".`);
      continue;
    }

    console.log(`\n📁 [${f.label}] Encontrados ${files.length} arquivo(s) para sincronizar:`);

    for (const file of files) {
      const filePath = path.join(f.dir, file);
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
  if (totalUploaded > 0) {
    console.log(`🎉 Concluído! ${totalUploaded} imagem(ns) enviada(s) e vinculada(s) à CDN do Convex.`);
  } else {
    console.log("💡 Nenhuma imagem enviada.");
    console.log("👉 Dica: Adicione arquivos .png, .jpg ou .webp nas pastas:");
    console.log("   - assets/teams/       (ex: vila-nova.png)");
    console.log("   - assets/leagues/     (ex: brasileirao-serie-b.png)");
    console.log("   - assets/stadiums/    (ex: maracana.jpg)");
  }
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});

