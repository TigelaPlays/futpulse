import { getNationStadiumImageUrl } from "./stadiumNationsAssets";

export interface StadiumInfo {
  name: string;
  city?: string;
  capacity?: number;
  imageUrl?: string;
}

export const CLUB_STADIUMS: Record<string, string> = {
  // Série A
  "Atlético-MG": "Arena MRV",
  "Atlético Mineiro": "Arena MRV",
  "Palmeiras": "Allianz Parque",
  "Coritiba": "Couto Pereira",
  "RB Bragantino": "Nabi Abi Chedid",
  "Red Bull Bragantino": "Nabi Abi Chedid",
  "Bragantino": "Nabi Abi Chedid",
  "Internacional": "Beira-Rio",
  "Athletico": "Ligga Arena",
  "Athletico-PR": "Ligga Arena",
  "Athletico Paranaense": "Ligga Arena",
  "Vitória": "Barradão",
  "Remo": "Baenão",
  "Fluminense": "Maracanã",
  "Grêmio": "Arena do Grêmio",
  "Chapecoense": "Arena Condá",
  "Santos": "Vila Belmiro",
  "Corinthians": "Neo Química Arena",
  "Bahia": "Arena Fonte Nova",
  "São Paulo": "MorumBIS",
  "Flamengo": "Maracanã",
  "Mirassol": "Maião",
  "Vasco": "São Januário",
  "Vasco da Gama": "São Januário",
  "Botafogo": "Nilton Santos",
  "Cruzeiro": "Mineirão",

  // Série B e outros clubes
  "Vila Nova": "OBA",
  "América-MG": "Independência",
  "América Mineiro": "Independência",
  "Operário-PR": "Germano Krüger",
  "Operário": "Germano Krüger",
  "Botafogo-SP": "Santa Cruz",
  "Cuiabá": "Arena Pantanal",
  "Avaí": "Ressacada",
  "Náutico": "Aflitos",
  "Athletic": "Arena Sicredi",
  "Athletic Club": "Arena Sicredi",
  "Novorizontino": "Jorjão",
  "Ceará": "Castelão",
  "Goiás": "Serrinha",
  "Fortaleza": "Castelão",
  "Juventude": "Alfredo Jaconi",
  "Criciúma": "Heriberto Hülse",
  "Atlético-GO": "Antônio Accioly",
  "Sport": "Ilha do Retiro",
  "Sport Recife": "Ilha do Retiro",
  "CRB": "Rei Pelé",
  "São Bernardo": "Primeiro de Maio",
  "Londrina": "Estádio do Café",
  "Ponte Preta": "Moisés Lucarelli",
  "Paysandu": "Curuzu",
  "Amazonas": "Arena da Amazônia",
  "Brusque": "Augusto Bauer",
  "Ituano": "Novelli Júnior",
  "Guarani": "Brinco de Ouro",
};

export const STADIUM_CITIES: Record<string, string> = {
  "Arena MRV": "Belo Horizonte (MG)",
  "Allianz Parque": "São Paulo (SP)",
  "Couto Pereira": "Curitiba (PR)",
  "Nabi Abi Chedid": "Bragança Paulista (SP)",
  "Beira-Rio": "Porto Alegre (RS)",
  "Ligga Arena": "Curitiba (PR)",
  "Arena da Baixada": "Curitiba (PR)",
  "Barradão": "Salvador (BA)",
  "Baenão": "Belém (PA)",
  "Maracanã": "Rio de Janeiro (RJ)",
  "Arena do Grêmio": "Porto Alegre (RS)",
  "Arena Condá": "Chapecó (SC)",
  "Vila Belmiro": "Santos (SP)",
  "Neo Química Arena": "São Paulo (SP)",
  "Arena Fonte Nova": "Salvador (BA)",
  "MorumBIS": "São Paulo (SP)",
  "Morumbi": "São Paulo (SP)",
  "Maião": "Mirassol (SP)",
  "São Januário": "Rio de Janeiro (RJ)",
  "Nilton Santos": "Rio de Janeiro (RJ)",
  "Nilton Santos (Engenhão)": "Rio de Janeiro (RJ)",
  "Mineirão": "Belo Horizonte (MG)",
  "Heriberto Hülse": "Criciúma (SC)",
  "Arena Pantanal": "Cuiabá (MT)",
  "Independência": "Belo Horizonte (MG)",
  "Arena Independência": "Belo Horizonte (MG)",
  "Alfredo Jaconi": "Caxias do Sul (RS)",
  "Antônio Accioly": "Goiânia (GO)",
  "Ressacada": "Florianópolis (SC)",
  "Estádio da Ressacada": "Florianópolis (SC)",
  "Hailé Pinheiro (Serrinha)": "Goiânia (GO)",
  "Estádio da Serrinha": "Goiânia (GO)",
  "Serrinha": "Goiânia (GO)",
  "Aflitos": "Recife (PE)",
  "Estádio dos Aflitos": "Recife (PE)",
  "Jorge Ismael de Biasi": "Novo Horizonte (SP)",
  "Jorjão": "Novo Horizonte (SP)",
  "Germano Krüger": "Ponta Grossa (PR)",
  "Castelão": "Fortaleza (CE)",
  "Castelão (CE)": "Fortaleza (CE)",
  "Arena Castelão": "Fortaleza (CE)",
  "Estádio do Café": "Londrina (PR)",
  "VGD": "Londrina (PR)",
  "Arena Sicredi": "São João del-Rei (MG)",
  "OBA": "Goiânia (GO)",
  "Onésio Brasileiro Alvarenga": "Goiânia (GO)",
  "Primeiro de Maio": "São Bernardo do Campo (SP)",
  "Rei Pelé": "Maceió (AL)",
  "Rei Pelé (AL)": "Maceió (AL)",
  "Santa Cruz": "Ribeirão Preto (SP)",
  "Arena Nicnet (Santa Cruz)": "Ribeirão Preto (SP)",
  "Arena Nicnet": "Ribeirão Preto (SP)",
  "Ilha do Retiro": "Recife (PE)",
  "Moisés Lucarelli": "Campinas (SP)",
  "Curuzu": "Belém (PA)",
  "Mangueirão": "Belém (PA)",
  "Arena da Amazônia": "Manaus (AM)",
  "Augusto Bauer": "Brusque (SC)",
  "Novelli Júnior": "Itu (SP)",
  "Brinco de Ouro": "Campinas (SP)",
};

export const STADIUM_CAPACITIES: Record<string, number> = {
  "Maracanã": 78838,
  "MorumBIS": 66795,
  "Mineirão": 61846,
  "Arena do Grêmio": 55662,
  "Beira-Rio": 50842,
  "Arena Fonte Nova": 50025,
  "Neo Química Arena": 49205,
  "Arena MRV": 44892,
  "Allianz Parque": 43713,
  "Nilton Santos": 44661,
  "Nilton Santos (Engenhão)": 44661,
  "Ligga Arena": 42372,
  "Arena da Baixada": 42372,
  "Couto Pereira": 40502,
  "Castelão": 63903,
  "Arena Castelão": 63903,
  "Barradão": 35000,
  "São Januário": 21880,
  "Vila Belmiro": 16068,
  "Arena Pantanal": 44097,
  "Arena da Amazônia": 44300,
  "Mangueirão": 45007,
  "Ilha do Retiro": 32983,
  "Estádio do Café": 30000,
  "Santa Cruz": 29292,
  "Independência": 23018,
  "Arena Independência": 23018,
  "Aflitos": 22856,
  "Alfredo Jaconi": 19924,
  "Heriberto Hülse": 19225,
  "Ressacada": 17800,
  "Moisés Lucarelli": 17728,
  "Rei Pelé": 17126,
  "Curuzu": 16200,
  "Primeiro de Maio": 15759,
  "Maião": 15000,
  "Arena Condá": 20089,
  "Serrinha": 14525,
  "Antônio Accioly": 12500,
  "OBA": 11788,
  "Germano Krüger": 10632,
  "Baenão": 13792,
  "Nabi Abi Chedid": 15010,
  // Seleções / Internacionais
  "Wembley Stadium": 90000,
  "Stadio Olimpico di Roma": 70634,
  "Puskás Aréna": 67215,
  "PGE Narodowy": 58580,
  "Johan Cruyff Arena": 55865,
  "José Alvalade": 50095,
  "Strawberry Arena": 50000,
  "Stožice Stadium": 16038,
};

/**
 * Resolve o objeto completo de estádio (nome, cidade, capacidade e imagem) a partir da partida.
 */
export function getStadiumInfo(match: any): StadiumInfo | null {
  if (!match) return null;

  // 1. Identifica o nome do estádio
  let name = match.stadium?.name?.trim();
  if (!name && match.homeTeam?.name && CLUB_STADIUMS[match.homeTeam.name]) {
    name = CLUB_STADIUMS[match.homeTeam.name];
  }
  if (!name && typeof match.stadiumName === "string" && match.stadiumName.trim()) {
    name = match.stadiumName.trim();
  }

  if (!name) return null;

  // 2. Identifica a cidade
  let city = match.stadium?.city?.trim();
  if (!city || city.toLowerCase() === "brasil") {
    city = STADIUM_CITIES[name];
  }

  // 3. Identifica a capacidade
  const capacity = match.stadium?.capacity || STADIUM_CAPACITIES[name];

  // 4. Identifica a URL da imagem
  let imageUrl: string | undefined = match.stadium?.imageUrl || match.stadium?.image;
  if (!imageUrl) {
    const nationImg = getNationStadiumImageUrl(name) || (match.stadium?.name ? getNationStadiumImageUrl(match.stadium.name) : null);
    if (nationImg) {
      imageUrl = nationImg;
    }
  }

  return {
    name,
    city,
    capacity,
    imageUrl: imageUrl || undefined,
  };
}
