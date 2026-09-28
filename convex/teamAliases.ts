/**
 * Biblioteca Compartilhada de Aliases e Normalização de Clubes do Brasileirão Série A 2026.
 * Utilizada para reconhecimento inteligente de arquivos de imagem, scraping e APIs esportivas.
 */

export interface TeamAliasEntry {
  canonicalName: string;
  shortName: string;
  code: string;
  aliases: string[];
}

export const SERIE_A_CLUBS_ALIASES: TeamAliasEntry[] = [
  {
    canonicalName: "Atlético-MG",
    shortName: "Atlético-MG",
    code: "CAM",
    aliases: [
      "atletico-mg",
      "atleticomg",
      "atletico_mg",
      "cam",
      "atletico mineiro",
      "atletico-mineiro",
      "galo",
      "clube atletico mineiro",
      "atletico",
    ],
  },
  {
    canonicalName: "Athletico",
    shortName: "Athletico-PR",
    code: "CAP",
    aliases: [
      "athletico",
      "athletico-pr",
      "athleticopr",
      "athletico_pr",
      "cap",
      "athletico paranaense",
      "athletico-paranaense",
      "atletico paranaense",
      "atletico-pr",
      "furacao",
      "club athletico paranaense",
    ],
  },
  {
    canonicalName: "Bahia",
    shortName: "Bahia",
    code: "BAH",
    aliases: [
      "bahia",
      "bah",
      "ecb",
      "esporte clube bahia",
      "tricolor de aco",
      "bahea",
      "ec bahia",
    ],
  },
  {
    canonicalName: "Botafogo",
    shortName: "Botafogo",
    code: "BOT",
    aliases: [
      "botafogo",
      "bot",
      "bfr",
      "botafogo fr",
      "botafogo-rj",
      "botafogorj",
      "glorioso",
      "fogao",
      "estrela solitaria",
    ],
  },
  {
    canonicalName: "Chapecoense",
    shortName: "Chapecoense",
    code: "CHA",
    aliases: [
      "chapecoense",
      "cha",
      "chape",
      "acf",
      "associacao chapecoense de futebol",
      "verdao do oeste",
    ],
  },
  {
    canonicalName: "Corinthians",
    shortName: "Corinthians",
    code: "COR",
    aliases: [
      "corinthians",
      "cor",
      "sccp",
      "timao",
      "sport club corinthians paulista",
      "coringao",
    ],
  },
  {
    canonicalName: "Coritiba",
    shortName: "Coritiba",
    code: "CFC",
    aliases: [
      "coritiba",
      "cfc",
      "coxa",
      "coritiba fbc",
      "coritiba foot ball club",
      "coxa-branca",
      "coxabranca",
    ],
  },
  {
    canonicalName: "Cruzeiro",
    shortName: "Cruzeiro",
    code: "CRU",
    aliases: [
      "cruzeiro",
      "cru",
      "cec",
      "cruzeiro ec",
      "cruzeiro esporte clube",
      "raposa",
      "cabuloso",
    ],
  },
  {
    canonicalName: "Flamengo",
    shortName: "Flamengo",
    code: "FLA",
    aliases: [
      "flamengo",
      "fla",
      "crf",
      "mengao",
      "mengo",
      "clube de regatas do flamengo",
      "rubro-negro",
      "rubronegro",
    ],
  },
  {
    canonicalName: "Fluminense",
    shortName: "Fluminense",
    code: "FLU",
    aliases: [
      "fluminense",
      "flu",
      "ffc",
      "fluminense fc",
      "fluminense football club",
      "tricolor das laranjeiras",
      "fluzao",
    ],
  },
  {
    canonicalName: "Grêmio",
    shortName: "Grêmio",
    code: "GRE",
    aliases: [
      "gremio",
      "gre",
      "fbpa",
      "gremio fbpa",
      "gremio foot-ball porto alegrense",
      "imortal",
      "imortal tricolor",
      "tricolor gaucho",
    ],
  },
  {
    canonicalName: "Internacional",
    shortName: "Inter",
    code: "INT",
    aliases: [
      "internacional",
      "inter",
      "sci",
      "sc internacional",
      "sport club internacional",
      "colorado",
      "inter de porto alegre",
      "inter-rs",
    ],
  },
  {
    canonicalName: "Mirassol",
    shortName: "Mirassol",
    code: "MIR",
    aliases: [
      "mirassol",
      "mir",
      "mfc",
      "mirassol fc",
      "mirassol futebol clube",
      "leao da alta araraquarense",
      "leao",
    ],
  },
  {
    canonicalName: "Palmeiras",
    shortName: "Palmeiras",
    code: "PAL",
    aliases: [
      "palmeiras",
      "pal",
      "sep",
      "verdao",
      "sociedade esportiva palmeiras",
      "palestra italia",
      "alviverde",
    ],
  },
  {
    canonicalName: "RB Bragantino",
    shortName: "Bragantino",
    code: "RBB",
    aliases: [
      "rb-bragantino",
      "rbbragantino",
      "bragantino",
      "rbb",
      "red bull bragantino",
      "red-bull-bragantino",
      "massa bruta",
      "braga",
      "red bull",
    ],
  },
  {
    canonicalName: "Remo",
    shortName: "Remo",
    code: "REM",
    aliases: [
      "remo",
      "rem",
      "cr",
      "clube do remo",
      "leao azul",
      "filho da gloria e do triunfo",
    ],
  },
  {
    canonicalName: "Santos",
    shortName: "Santos",
    code: "SAN",
    aliases: [
      "santos",
      "san",
      "sfc",
      "santos fc",
      "santos futebol clube",
      "peixe",
      "alvinegro praiano",
    ],
  },
  {
    canonicalName: "São Paulo",
    shortName: "São Paulo",
    code: "SAO",
    aliases: [
      "sao-paulo",
      "saopaulo",
      "sao_paulo",
      "spfc",
      "sao",
      "sao paulo fc",
      "tricolor paulista",
      "soberano",
      "tricolor",
    ],
  },
  {
    canonicalName: "Vasco",
    shortName: "Vasco",
    code: "VAS",
    aliases: [
      "vasco",
      "vas",
      "crvg",
      "vasco-da-gama",
      "vascodagama",
      "vasco da gama",
      "clube de regatas vasco da gama",
      "gigante da colina",
      "cruzmaltino",
    ],
  },
  {
    canonicalName: "Vitória",
    shortName: "Vitória",
    code: "VIT",
    aliases: [
      "vitoria",
      "vit",
      "ecv",
      "ec vitoria",
      "esporte clube vitoria",
      "leao da barra",
      "rubro-negro baiano",
    ],
  },
];

/**
 * Sanitiza uma string de arquivo ou texto para comparação fonética e alfanumérica pura.
 * Remove extensão de imagem (.png, .webp, .svg, etc.), acentuações, caracteres especiais e pontuações.
 */
export function sanitizeTeamString(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\.(png|jpe?g|webp|svg|gif|avif)$/i, "") // remove extensão de arquivo
    .replace(/[-_.,()/\\]/g, " ") // substitui pontuações e delimitadores por espaços
    .replace(/\s+/g, " ") // unifica espaços contínuos
    .trim();
}

/**
 * Resolve o time correspondente a partir de um nome de arquivo ou texto,
 * consultando a lista de times cadastrados no Convex com tolerância alta a variações.
 */
export function resolveTeamByAlias<T extends { name: string; shortName?: string; code?: string }>(
  filenameOrText: string,
  teamsList: T[]
): { team: T; matchedAlias: string } | null {
  const cleanInput = sanitizeTeamString(filenameOrText);
  if (!cleanInput) return null;

  // 1. Match direto por nome exato sanitizado
  for (const t of teamsList) {
    const cleanName = sanitizeTeamString(t.name);
    const cleanShort = sanitizeTeamString(t.shortName || "");
    const cleanCode = sanitizeTeamString(t.code || "");

    if (
      cleanInput === cleanName ||
      cleanInput === cleanShort ||
      cleanInput === cleanCode
    ) {
      return { team: t, matchedAlias: t.name };
    }
  }

  // 2. Match através do dicionário de aliases
  for (const entry of SERIE_A_CLUBS_ALIASES) {
    const isAliasMatch = entry.aliases.some((alias) => {
      const cleanAlias = sanitizeTeamString(alias);
      return cleanInput === cleanAlias;
    });

    if (isAliasMatch) {
      // Localiza o time na lista do banco pelo nome canônico, shortName ou código
      const found = teamsList.find((t) => {
        const cName = sanitizeTeamString(t.name);
        const cShort = sanitizeTeamString(t.shortName || "");
        const cCode = sanitizeTeamString(t.code || "");
        const targetCan = sanitizeTeamString(entry.canonicalName);
        const targetShort = sanitizeTeamString(entry.shortName);
        const targetCode = sanitizeTeamString(entry.code);

        return (
          cName === targetCan ||
          cShort === targetShort ||
          cCode === targetCode ||
          cName === targetShort
        );
      });

      if (found) {
        return { team: found, matchedAlias: entry.canonicalName };
      }
    }
  }

  // 3. Match por inclusão/subtermo com tamanho mínimo relevante (>= 4 caracteres)
  for (const entry of SERIE_A_CLUBS_ALIASES) {
    for (const alias of entry.aliases) {
      const cleanAlias = sanitizeTeamString(alias);
      if (cleanAlias.length >= 4) {
        const wordRegex = new RegExp(`\\b${cleanAlias}\\b`, "i");
        if (wordRegex.test(cleanInput) || cleanInput.includes(cleanAlias)) {
          const found = teamsList.find((t) => {
            const cName = sanitizeTeamString(t.name);
            const targetCan = sanitizeTeamString(entry.canonicalName);
            return cName === targetCan || cName.includes(targetCan);
          });
          if (found) {
            return { team: found, matchedAlias: alias };
          }
        }
      }
    }
  }

  // 4. Match direto por conter o nome de algum time da lista
  for (const t of teamsList) {
    const cleanName = sanitizeTeamString(t.name);
    if (cleanName.length >= 4 && cleanInput.includes(cleanName)) {
      return { team: t, matchedAlias: t.name };
    }
  }

  return null;
}
