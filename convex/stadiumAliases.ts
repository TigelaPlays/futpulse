/**
 * Biblioteca Compartilhada de Aliases e Normalização de Estádios do Futebol Brasileiro (Série A 2026).
 * Utilizada para reconhecimento inteligente de arquivos de imagem, scraping e APIs esportivas.
 */

export interface StadiumAliasEntry {
  canonicalName: string;
  aliases: string[];
}

export const SERIE_A_STADIUMS_ALIASES: StadiumAliasEntry[] = [
  {
    canonicalName: "Allianz Parque",
    aliases: [
      "allianz-parque",
      "allianz",
      "parque-antarctica",
      "palestra-italia",
      "allianzparque",
      "allianz parque",
      "parque antarctica",
      "palestra italia",
      "arena palmeiras",
      "nubank parque",
      "nubank-parque",
      "nubankparque",
    ],
  },
  {
    canonicalName: "Neo Química Arena",
    aliases: [
      "neo-quimica-arena",
      "itaquerao",
      "arena-corinthians",
      "neo-quimica",
      "itaquera",
      "neo quimica arena",
      "arena corinthians",
      "neoquimicaarena",
      "neoquimica",
    ],
  },
  {
    canonicalName: "MorumBIS",
    aliases: [
      "morumbis",
      "morumbi",
      "cicero-pompeu-de-toledo",
      "morum-bis",
      "cicero pompeu de toledo",
      "estadio do morumbi",
      "estadio morumbis",
    ],
  },
  {
    canonicalName: "Maracanã",
    aliases: [
      "maracana",
      "mario-filho",
      "maraca",
      "mario filho",
      "estadio do maracana",
      "jornalista mario filho",
      "complexo do maracana",
    ],
  },
  {
    canonicalName: "Nilton Santos (Engenhão)",
    aliases: [
      "nilton-santos",
      "engenhao",
      "olimpico-nilton-santos",
      "nilton santos",
      "olimpico nilton santos",
      "estadio nilton santos",
      "estadio olimpico nilton santos",
      "nilton santos engenhao",
    ],
  },
  {
    canonicalName: "Arena MRV",
    aliases: [
      "arena-mrv",
      "mrv",
      "arena-galo",
      "arena mrv",
      "arena galo",
      "arenamrv",
    ],
  },
  {
    canonicalName: "Beira-Rio",
    aliases: [
      "beira-rio",
      "beirario",
      "jose-pinheiro-borda",
      "beira rio",
      "jose pinheiro borda",
      "gigante da beira-rio",
      "estadio beira-rio",
    ],
  },
  {
    canonicalName: "Arena Condá",
    aliases: [
      "arena-conda",
      "arenaconda",
      "regional-indio-conda",
      "arena conda",
      "regional indio conda",
      "indio conda",
      "estadio regional indio conda",
    ],
  },
  {
    canonicalName: "Barradão",
    aliases: [
      "barradao",
      "manoel-barradas",
      "manoel barradas",
      "estadio manoel barradas",
      "complexo benedito dourado da silva",
    ],
  },
  {
    canonicalName: "Couto Pereira",
    aliases: [
      "couto-pereira",
      "coutopereira",
      "alto-da-gloria",
      "couto pereira",
      "alto da gloria",
      "major antonio couto pereira",
      "estadio major antonio couto pereira",
    ],
  },
  {
    canonicalName: "Vila Belmiro",
    aliases: [
      "vila-belmiro",
      "vilabelmiro",
      "urbano-caldeira",
      "vila belmiro",
      "urbano caldeira",
      "estadio urbano caldeira",
      "alçapao da vila",
    ],
  },
  {
    canonicalName: "Maião",
    aliases: [
      "maiao",
      "jose-maria-de-campos-maia",
      "jose maria de campos maia",
      "estadio municipal jose maria de campos maia",
    ],
  },
  {
    canonicalName: "Mineirão",
    aliases: [
      "mineirao",
      "estadio do mineirao",
      "governador magalhaes pinto",
      "mineirao-bh",
      "toca da raposa 3",
      "gigante da pampulha",
      "estadio governador magalhaes pinto",
    ],
  },
  {
    canonicalName: "Arena do Grêmio",
    aliases: [
      "arena-do-gremio",
      "arena do gremio",
      "arenadogremio",
      "arena gremio",
      "arena-gremio",
      "estadio arena do gremio",
    ],
  },
  {
    canonicalName: "Ligga Arena",
    aliases: [
      "arena-da-baixada",
      "arena da baixada",
      "arenadabaixada",
      "ligga-arena",
      "ligga arena",
      "liggaarena",
      "joaquim-americo-guimaraes",
      "joaquim americo guimaraes",
      "estadio joaquim americo guimaraes",
      "caldeirao",
    ],
  },
  {
    canonicalName: "Arena Fonte Nova",
    aliases: [
      "arena-fonte-nova",
      "arena fonte nova",
      "fonte-nova",
      "fonte nova",
      "fontenova",
      "itaipava arena fonte nova",
      "casa de apostas arena fonte nova",
      "octavio mangabeira",
      "complexo esportivo cultural octavio mangabeira",
    ],
  },
  {
    canonicalName: "São Januário",
    aliases: [
      "sao-januario",
      "sao januario",
      "saojanuario",
      "estadio sao januario",
      "estadio de sao januario",
      "colina historica",
      "vasco da gama",
      "estadio vasco da gama",
    ],
  },
  {
    canonicalName: "Cícero de Souza Marques",
    aliases: [
      "cicero-de-souza-marques",
      "cicero de souza marques",
      "cicerodesouzamarques",
      "estadio municipal cicero de souza marques",
      "nabi-abi-chedid",
      "nabi abi chedid",
      "nabizao",
      "estadio nabi abi chedid",
      "bragantino arena",
    ],
  },
  {
    canonicalName: "Mangueirão",
    aliases: [
      "mangueirao",
      "mangueirao-belem",
      "estadio estadual jornalista edgar augusto proenca",
      "edgar proenca",
      "baenao",
      "evandro almeida",
      "estadio evandro almeida",
      "baenão",
      "estadio do baenao",
    ],
  },
];

/**
 * Sanitiza uma string de arquivo ou texto para comparação fonética e alfanumérica pura.
 * Remove extensão de imagem (.png, .webp, .svg, etc.), acentuações, caracteres especiais e pontuações.
 */
export function sanitizeStadiumString(input: string): string {
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
 * Resolve o estádio correspondente a partir de um nome de arquivo ou texto,
 * consultando a lista de estádios cadastrados no Convex com tolerância alta a variações.
 */
export function resolveStadiumByAlias<T extends { name: string; city?: string }>(
  filenameOrText: string,
  stadiumsList: T[]
): { stadium: T; matchedAlias: string } | null {
  const cleanInput = sanitizeStadiumString(filenameOrText);
  if (!cleanInput) return null;

  // 1. Match direto por nome exato sanitizado
  for (const s of stadiumsList) {
    const cleanName = sanitizeStadiumString(s.name);
    if (cleanInput === cleanName) {
      return { stadium: s, matchedAlias: s.name };
    }
  }

  // 2. Match através do dicionário de aliases
  for (const entry of SERIE_A_STADIUMS_ALIASES) {
    const isAliasMatch = entry.aliases.some((alias) => {
      const cleanAlias = sanitizeStadiumString(alias);
      return cleanInput === cleanAlias;
    });

    const isCanonicalMatch = cleanInput === sanitizeStadiumString(entry.canonicalName);

    if (isAliasMatch || isCanonicalMatch) {
      // Localiza o estádio na lista do banco pelo nome canônico ou variações
      const found = stadiumsList.find((s) => {
        const cName = sanitizeStadiumString(s.name);
        const targetCan = sanitizeStadiumString(entry.canonicalName);

        // Match direto do nome com o canonicalName do alias
        if (cName === targetCan) return true;

        // Match se o nome do banco contiver ou for contido pelo canonicalName
        if (cName.includes(targetCan) || targetCan.includes(cName)) return true;

        // Match com qualquer um dos aliases associados ao estádio
        return entry.aliases.some((alias) => {
          const cAlias = sanitizeStadiumString(alias);
          return cName === cAlias;
        });
      });

      if (found) {
        return { stadium: found, matchedAlias: entry.canonicalName };
      }
    }
  }

  // 3. Match por inclusão/subtermo com tamanho mínimo relevante (>= 4 caracteres)
  for (const entry of SERIE_A_STADIUMS_ALIASES) {
    for (const alias of entry.aliases) {
      const cleanAlias = sanitizeStadiumString(alias);
      if (cleanAlias.length >= 4) {
        const wordRegex = new RegExp(`\\b${cleanAlias}\\b`, "i");
        if (wordRegex.test(cleanInput) || cleanInput.includes(cleanAlias)) {
          const found = stadiumsList.find((s) => {
            const cName = sanitizeStadiumString(s.name);
            const targetCan = sanitizeStadiumString(entry.canonicalName);
            return (
              cName === targetCan ||
              cName.includes(targetCan) ||
              targetCan.includes(cName) ||
              entry.aliases.some((a) => cName === sanitizeStadiumString(a))
            );
          });
          if (found) {
            return { stadium: found, matchedAlias: alias };
          }
        }
      }
    }
  }

  // 4. Match direto por conter o nome de algum estádio da lista (ou vice-versa)
  for (const s of stadiumsList) {
    const cleanName = sanitizeStadiumString(s.name);
    if (cleanName.length >= 4 && (cleanInput.includes(cleanName) || cleanName.includes(cleanInput))) {
      return { stadium: s, matchedAlias: s.name };
    }
  }

  return null;
}
