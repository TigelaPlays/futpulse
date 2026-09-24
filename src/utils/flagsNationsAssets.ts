/**
 * Utilitário de mapeamento e resolução de escudos/bandeiras das seleções nacionais da UEFA
 * Origem dos arquivos estáticos: public/assets/flags_nations/
 */

const NATION_FLAGS_MAP: Record<string, string> = {
  // Liga A
  "itália": "Itália.jpg",
  "italia": "Itália.jpg",
  "bélgica": "Bélgica.jpg",
  "belgica": "Bélgica.jpg",
  "frança": "França.jpg",
  "franca": "França.jpg",
  "turquia": "Turquia.jpg",

  "holanda": "Países Baixos.jpg",
  "países baixos": "Países Baixos.jpg",
  "paises baixos": "Países Baixos.jpg",
  "netherlands": "Países Baixos.jpg",
  "alemanha": "Alemanha.jpg",
  "germany": "Alemanha.jpg",
  "sérvia": "Sérvia.jpg",
  "servia": "Sérvia.jpg",
  "serbia": "Sérvia.jpg",
  "grécia": "Grécia.jpg",
  "grecia": "Grécia.jpg",
  "greece": "Grécia.jpg",

  "espanha": "Espanha.jpg",
  "spain": "Espanha.jpg",
  "inglaterra": "Inglaterra.jpg",
  "england": "Inglaterra.jpg",
  "croácia": "Croácia.jpg",
  "croacia": "Croácia.jpg",
  "croatia": "Croácia.jpg",
  "república checa": "República Tcheca.jpg",
  "republica checa": "República Tcheca.jpg",
  "república tcheca": "República Tcheca.jpg",
  "republica tcheca": "República Tcheca.jpg",
  "rep. checa": "República Tcheca.jpg",
  "rep. tcheca": "República Tcheca.jpg",
  "tchéquia": "República Tcheca.jpg",
  "tchequia": "República Tcheca.jpg",
  "czechia": "República Tcheca.jpg",
  "czech republic": "República Tcheca.jpg",

  "noruega": "Noruega.jpg",
  "norway": "Noruega.jpg",
  "portugal": "Portugal.jpg",
  "dinamarca": "Dinamarca.jpg",
  "denmark": "Dinamarca.jpg",
  "país de gales": "País de Gales.jpg",
  "pais de gales": "País de Gales.jpg",
  "gales": "País de Gales.jpg",
  "wales": "País de Gales.jpg",

  // Liga B
  "escócia": "Escócia.jpg",
  "escocia": "Escócia.jpg",
  "scotland": "Escócia.jpg",
  "suíça": "Suíça.jpg",
  "suica": "Suíça.jpg",
  "switzerland": "Suíça.jpg",
  "eslovênia": "Eslovênia.jpg",
  "eslovenia": "Eslovênia.jpg",
  "slovenia": "Eslovênia.jpg",
  "macedônia do norte": "Macedônia.jpg",
  "macedonia do norte": "Macedônia.jpg",
  "macedônia": "Macedônia.jpg",
  "macedonia": "Macedônia.jpg",
  "north macedonia": "Macedônia.jpg",

  "hungria": "Hungria.jpg",
  "hungary": "Hungria.jpg",
  "geórgia": "Geórgia.jpg",
  "georgia": "Geórgia.jpg",
  "ucrânia": "Ucrânia.jpg",
  "ucrania": "Ucrânia.jpg",
  "ukraine": "Ucrânia.jpg",
  "irlanda do norte": "Irlanda do Norte.jpg",
  "northern ireland": "Irlanda do Norte.jpg",

  "áustria": "Áustria.jpg",
  "austria": "Áustria.jpg",
  "kosovo": "Kosovo.jpg",
  "israel": "Israel.jpg",
  "irlanda": "Irlanda.jpg",
  "ireland": "Irlanda.jpg",

  "suécia": "Suécia.jpg",
  "suecia": "Suécia.jpg",
  "sweden": "Suécia.jpg",
  "polônia": "Polônia.jpg",
  "polonia": "Polônia.jpg",
  "poland": "Polônia.jpg",
  "romênia": "Romênia.jpg",
  "romenia": "Romênia.jpg",
  "romania": "Romênia.jpg",
  "bósnia": "Bósnia e Herzegovina.jpg",
  "bosnia": "Bósnia e Herzegovina.jpg",
  "bósnia e herzegovina": "Bósnia e Herzegovina.jpg",
  "bosnia e herzegovina": "Bósnia e Herzegovina.jpg",
  "bosnia & herzegovina": "Bósnia e Herzegovina.jpg",

  // Liga C
  "albânia": "Albânia.jpg",
  "albania": "Albânia.jpg",
  "finlândia": "Finlândia.jpg",
  "finlandia": "Finlândia.jpg",
  "finland": "Finlândia.jpg",
  "belarus": "Bielorrúsia.jpg",
  "bielorrússia": "Bielorrúsia.jpg",
  "bielorrusia": "Bielorrúsia.jpg",
  "san marino": "San Marino.jpg",

  "montenegro": "Montenegro.jpg",
  "armênia": "Armênia.jpg",
  "armenia": "Armênia.jpg",
  "chipre": "Chipre.jpg",
  "cyprus": "Chipre.jpg",
  "letônia": "Letônia.jpg",
  "letonia": "Letônia.jpg",
  "latvia": "Letônia.jpg",

  "eslováquia": "Eslováquia.jpg",
  "eslovaquia": "Eslováquia.jpg",
  "slovakia": "Eslováquia.jpg",
  "cazaquistão": "Cazaquistão.jpg",
  "cazaquistao": "Cazaquistão.jpg",
  "kazakhstan": "Cazaquistão.jpg",
  "ilhas faroé": "Ilhas Faróe.jpg",
  "ilhas faroe": "Ilhas Faróe.jpg",
  "ilhas faróe": "Ilhas Faróe.jpg",
  "faroe islands": "Ilhas Faróe.jpg",
  "moldávia": "Moldávia.jpg",
  "moldavia": "Moldávia.jpg",
  "moldova": "Moldávia.jpg",

  "bulgária": "Bulgária.jpg",
  "bulgaria": "Bulgária.jpg",
  "islândia": "Islândia.jpg",
  "islandia": "Islândia.jpg",
  "iceland": "Islândia.jpg",
  "luxemburgo": "Luxemburgo.jpg",
  "luxembourg": "Luxemburgo.jpg",
  "estônia": "Estônia.jpg",
  "estonia": "Estônia.jpg",
  "estonia ": "Estônia.jpg",

  // Liga D
  "malta": "Malta.jpg",
  "gibraltar": "Gibraltar.jpg",
  "andorra": "Andorra.jpg",

  "lituânia": "Lituânia.jpg",
  "lituania": "Lituânia.jpg",
  "lithuania": "Lituânia.jpg",
  "azerbaijão": "Azerbaijão.jpg",
  "azerbaijao": "Azerbaijão.jpg",
  "azerbaijan": "Azerbaijão.jpg",
  "liechtenstein": "Liechtenstein.jpg",
};

/**
 * Retorna a URL pública do arquivo de bandeira/escudo da seleção.
 * Exemplo: "/assets/flags_nations/Itália.jpg"
 * Se não for encontrada correspondência direta, aplica fallback seguro.
 */
export function getNationFlagUrl(teamName: string, fallbackUrl?: string): string {
  if (!teamName) return fallbackUrl || "/favicon.svg";

  const key = teamName.trim().toLowerCase();
  const fileName = NATION_FLAGS_MAP[key];

  if (fileName) {
    return `/assets/flags_nations/${fileName}`;
  }

  // Se já for uma URL externa ou storage
  if (teamName.startsWith("http://") || teamName.startsWith("https://") || teamName.startsWith("/")) {
    return teamName;
  }

  return fallbackUrl || "/favicon.svg";
}
