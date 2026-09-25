// Dados locais e tipados para desacoplamento completo do frontend FutPulse

export interface MockLeague {
  _id: string;
  name: string;
  code?: string;
  country: string;
  logoUrl: string;
  season: number;
  type: "league" | "cup";
  priority: number;
  format?: string;
}

export interface MockTeam {
  _id: string;
  name: string;
  shortName?: string;
  code?: string;
  logoUrl: string;
}

export interface MockMatchEvent {
  _id: string;
  minute: number;
  extraMinute?: number;
  playerName: string;
  assistPlayerName?: string;
  type: "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "VAR";
  detail?: string;
  teamId: string;
}

export interface MockMatchStatistics {
  homePossession: number;
  awayPossession: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeTotalShots: number;
  awayTotalShots: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
  homePasses?: number;
  awayPasses?: number;
  homePassAccuracy?: number;
  awayPassAccuracy?: number;
}

export interface MockMatch {
  _id: string;
  leagueId: string;
  round: string;
  stage?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: MockTeam;
  awayTeam: MockTeam;
  league?: MockLeague;
  stadium?: {
    name: string;
    city: string;
    imageUrl?: string;
  };
  status: "SCHEDULED" | "IN_PLAY" | "LIVE" | "HALFTIME" | "PAUSED" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | "FINISHED" | "POSTPONED";
  statusShort: string;
  minute?: number;
  homeScore: number;
  awayScore: number;
  homeHalftimeScore?: number;
  awayHalftimeScore?: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
  homeExtraTimeScore?: number;
  awayExtraTimeScore?: number;
  externalId?: number;
  startTime: number;
  events?: MockMatchEvent[];
  statistics?: MockMatchStatistics;
}

export interface MockStandingRow {
  _id: string;
  rank: number;
  previousRank?: number;
  team: {
    name: string;
    logoUrl?: string;
    code?: string;
  };
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  points: number;
  form?: string;
  description?: string;
  zoneDescription?: string;
}

export interface MockNationsStandingRow {
  _id: string;
  teamName: string;
  teamFlag?: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string[];
  zone?: "QUARTER_FINALS" | "PROMOTION" | "PROMOTION_PLAYOFF" | "RELEGATION_PLAYOFF" | "RELEGATION" | "NONE";
}

export interface MockTopScorer {
  _id: string;
  rank: number;
  playerName: string;
  teamName: string;
  teamCode?: string;
  teamLogoUrl?: string;
  goals: number;
  assists?: number;
  matches?: number;
  penalties?: number;
}

// 1. Campeonatos
export const MOCK_LEAGUES: MockLeague[] = [
  {
    _id: "league_brasileirao_a",
    name: "Brasileirão Série A",
    code: "BSA",
    country: "Brasil",
    logoUrl: "https://crests.football-data.org/bsa.png",
    season: 2026,
    type: "league",
    priority: 1,
  },
  {
    _id: "league_brasileirao_b",
    name: "Brasileirão Série B",
    code: "BSB",
    country: "Brasil",
    logoUrl: "https://media.api-sports.io/football/leagues/72.png",
    season: 2026,
    type: "league",
    priority: 2,
  },
  {
    _id: "league_ucl",
    name: "UEFA Champions League",
    code: "UCL",
    country: "Europa",
    logoUrl: "https://media.api-sports.io/football/leagues/2.png",
    season: 2026,
    type: "cup",
    priority: 3,
    format: "league_phase",
  },
  {
    _id: "league_nations",
    name: "UEFA Nations League",
    code: "UNL",
    country: "Europa",
    logoUrl: "https://media.api-sports.io/football/leagues/5.png",
    season: 2026,
    type: "cup",
    priority: 4,
    format: "group_knockout",
  },
  {
    _id: "league_premier",
    name: "Premier League",
    code: "PL",
    country: "Inglaterra",
    logoUrl: "https://crests.football-data.org/PL.png",
    season: 2026,
    type: "league",
    priority: 5,
  },
  {
    _id: "league_laliga",
    name: "La Liga",
    code: "PD",
    country: "Espanha",
    logoUrl: "https://crests.football-data.org/laliga.png",
    season: 2026,
    type: "league",
    priority: 6,
  },
];

// Times Mock
const TEAMS: Record<string, MockTeam> = {
  palmeiras: { _id: "t_palmeiras", name: "Palmeiras", shortName: "Palmeiras", code: "PAL", logoUrl: "https://media.api-sports.io/football/teams/121.png" },
  flamengo: { _id: "t_flamengo", name: "Flamengo", shortName: "Flamengo", code: "FLA", logoUrl: "https://media.api-sports.io/football/teams/127.png" },
  sao_paulo: { _id: "t_sao_paulo", name: "São Paulo", shortName: "São Paulo", code: "SAO", logoUrl: "https://media.api-sports.io/football/teams/126.png" },
  corinthians: { _id: "t_corinthians", name: "Corinthians", shortName: "Corinthians", code: "COR", logoUrl: "https://media.api-sports.io/football/teams/131.png" },
  botafogo: { _id: "t_botafogo", name: "Botafogo", shortName: "Botafogo", code: "BOT", logoUrl: "https://media.api-sports.io/football/teams/120.png" },
  gremio: { _id: "t_gremio", name: "Grêmio", shortName: "Grêmio", code: "GRE", logoUrl: "https://media.api-sports.io/football/teams/130.png" },
  real_madrid: { _id: "t_real_madrid", name: "Real Madrid", shortName: "Real Madrid", code: "RMA", logoUrl: "https://crests.football-data.org/86.png" },
  man_city: { _id: "t_man_city", name: "Manchester City", shortName: "Man City", code: "MCI", logoUrl: "https://crests.football-data.org/65.png" },
  arsenal: { _id: "t_arsenal", name: "Arsenal", shortName: "Arsenal", code: "ARS", logoUrl: "https://crests.football-data.org/57.png" },
  bayern: { _id: "t_bayern", name: "Bayern de Munique", shortName: "Bayern", code: "BAY", logoUrl: "https://crests.football-data.org/5.png" },
  psg: { _id: "t_psg", name: "Paris Saint-Germain", shortName: "PSG", code: "PSG", logoUrl: "https://media.api-sports.io/football/teams/85.png" },
  barcelona: { _id: "t_barcelona", name: "Barcelona", shortName: "Barcelona", code: "BAR", logoUrl: "https://crests.football-data.org/81.png" },
  novorizontino: { _id: "t_novorizontino", name: "Novorizontino", shortName: "Novorizontino", code: "NOV", logoUrl: "https://media.api-sports.io/football/teams/7841.png" },
  goias: { _id: "t_goias", name: "Goiás", shortName: "Goiás", code: "GOI", logoUrl: "https://media.api-sports.io/football/teams/144.png" },
  sport: { _id: "t_sport", name: "Sport Recife", shortName: "Sport", code: "SPO", logoUrl: "https://media.api-sports.io/football/teams/139.png" },
  vila_nova: { _id: "t_vila_nova", name: "Vila Nova", shortName: "Vila Nova", code: "VIL", logoUrl: "https://media.api-sports.io/football/teams/223.png" },
};

// 2. Partidas Mock
const now = Date.now();
const todayHour = (hours: number, minutes: number = 0) => {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
};

export const MOCK_MATCHES: MockMatch[] = [
  {
    _id: "match_1",
    leagueId: "league_brasileirao_a",
    round: "Rodada 28",
    stage: "Turno Único",
    homeTeamId: TEAMS.palmeiras._id,
    awayTeamId: TEAMS.flamengo._id,
    homeTeam: TEAMS.palmeiras,
    awayTeam: TEAMS.flamengo,
    league: MOCK_LEAGUES[0],
    stadium: { name: "Allianz Parque", city: "São Paulo (SP)" },
    status: "IN_PLAY",
    statusShort: "68'",
    minute: 68,
    homeScore: 2,
    awayScore: 1,
    homeHalftimeScore: 1,
    awayHalftimeScore: 1,
    startTime: now - 68 * 60 * 1000,
    events: [
      { _id: "e1", minute: 23, playerName: "Raphael Veiga", type: "GOAL", teamId: TEAMS.palmeiras._id, detail: "Pênalti" },
      { _id: "e2", minute: 41, playerName: "Pedro", type: "GOAL", teamId: TEAMS.flamengo._id, detail: "Cabeceio" },
      { _id: "e3", minute: 57, playerName: "Estêvão", type: "GOAL", teamId: TEAMS.palmeiras._id, detail: "Chute de fora" },
      { _id: "e4", minute: 62, playerName: "Gerson", type: "YELLOW_CARD", teamId: TEAMS.flamengo._id },
    ],
    statistics: {
      homePossession: 53,
      awayPossession: 47,
      homeShotsOnTarget: 6,
      awayShotsOnTarget: 4,
      homeTotalShots: 13,
      awayTotalShots: 9,
      homeCorners: 5,
      awayCorners: 3,
      homeFouls: 11,
      awayFouls: 14,
      homeYellowCards: 1,
      awayYellowCards: 2,
      homeRedCards: 0,
      awayRedCards: 0,
      homePasses: 342,
      awayPasses: 298,
      homePassAccuracy: 84,
      awayPassAccuracy: 81,
    },
  },
  {
    _id: "match_2",
    leagueId: "league_brasileirao_a",
    round: "Rodada 28",
    stage: "Turno Único",
    homeTeamId: TEAMS.sao_paulo._id,
    awayTeamId: TEAMS.corinthians._id,
    homeTeam: TEAMS.sao_paulo,
    awayTeam: TEAMS.corinthians,
    league: MOCK_LEAGUES[0],
    stadium: { name: "MorumBIS", city: "São Paulo (SP)" },
    status: "FINISHED",
    statusShort: "FT",
    minute: 90,
    homeScore: 3,
    awayScore: 1,
    homeHalftimeScore: 1,
    awayHalftimeScore: 0,
    startTime: todayHour(16, 0),
    events: [
      { _id: "e5", minute: 15, playerName: "Lucas Moura", type: "GOAL", teamId: TEAMS.sao_paulo._id },
      { _id: "e6", minute: 52, playerName: "Jonathan Calleri", type: "GOAL", teamId: TEAMS.sao_paulo._id },
      { _id: "e7", minute: 73, playerName: "Yuri Alberto", type: "GOAL", teamId: TEAMS.corinthians._id },
      { _id: "e8", minute: 88, playerName: "Luciano", type: "GOAL", teamId: TEAMS.sao_paulo._id },
    ],
    statistics: {
      homePossession: 58,
      awayPossession: 42,
      homeShotsOnTarget: 7,
      awayShotsOnTarget: 3,
      homeTotalShots: 15,
      awayTotalShots: 8,
      homeCorners: 6,
      awayCorners: 2,
      homeFouls: 13,
      awayFouls: 16,
      homeYellowCards: 2,
      awayYellowCards: 3,
      homeRedCards: 0,
      awayRedCards: 0,
    },
  },
  {
    _id: "match_3",
    leagueId: "league_brasileirao_a",
    round: "Rodada 28",
    stage: "Turno Único",
    homeTeamId: TEAMS.botafogo._id,
    awayTeamId: TEAMS.gremio._id,
    homeTeam: TEAMS.botafogo,
    awayTeam: TEAMS.gremio,
    league: MOCK_LEAGUES[0],
    stadium: { name: "Nilton Santos", city: "Rio de Janeiro (RJ)" },
    status: "SCHEDULED",
    statusShort: "20:00",
    homeScore: 0,
    awayScore: 0,
    startTime: todayHour(20, 0),
    events: [],
  },
  {
    _id: "match_4",
    leagueId: "league_ucl",
    round: "Rodada 2",
    stage: "Fase de Liga",
    homeTeamId: TEAMS.real_madrid._id,
    awayTeamId: TEAMS.man_city._id,
    homeTeam: TEAMS.real_madrid,
    awayTeam: TEAMS.man_city,
    league: MOCK_LEAGUES[2],
    stadium: { name: "Santiago Bernabéu", city: "Madri (ESP)" },
    status: "FINISHED",
    statusShort: "FT",
    minute: 90,
    homeScore: 3,
    awayScore: 3,
    homeHalftimeScore: 2,
    awayHalftimeScore: 1,
    startTime: todayHour(16, 0),
    events: [
      { _id: "e9", minute: 12, playerName: "Bernardo Silva", type: "GOAL", teamId: TEAMS.man_city._id },
      { _id: "e10", minute: 20, playerName: "Eduardo Camavinga", type: "GOAL", teamId: TEAMS.real_madrid._id },
      { _id: "e11", minute: 34, playerName: "Vinícius Júnior", type: "GOAL", teamId: TEAMS.real_madrid._id },
      { _id: "e12", minute: 66, playerName: "Phil Foden", type: "GOAL", teamId: TEAMS.man_city._id },
      { _id: "e13", minute: 71, playerName: "Josko Gvardiol", type: "GOAL", teamId: TEAMS.man_city._id },
      { _id: "e14", minute: 79, playerName: "Federico Valverde", type: "GOAL", teamId: TEAMS.real_madrid._id },
    ],
    statistics: {
      homePossession: 46,
      awayPossession: 54,
      homeShotsOnTarget: 8,
      awayShotsOnTarget: 7,
      homeTotalShots: 16,
      awayTotalShots: 14,
      homeCorners: 4,
      awayCorners: 6,
      homeFouls: 9,
      awayFouls: 10,
    },
  },
  {
    _id: "match_5",
    leagueId: "league_ucl",
    round: "Rodada 2",
    stage: "Fase de Liga",
    homeTeamId: TEAMS.arsenal._id,
    awayTeamId: TEAMS.bayern._id,
    homeTeam: TEAMS.arsenal,
    awayTeam: TEAMS.bayern,
    league: MOCK_LEAGUES[2],
    stadium: { name: "Emirates Stadium", city: "Londres (ING)" },
    status: "SCHEDULED",
    statusShort: "16:00",
    homeScore: 0,
    awayScore: 0,
    startTime: todayHour(16, 0) + 86400000,
    events: [],
  },
  {
    _id: "match_6",
    leagueId: "league_brasileirao_b",
    round: "Rodada 29",
    stage: "Turno Único",
    homeTeamId: TEAMS.novorizontino._id,
    awayTeamId: TEAMS.goias._id,
    homeTeam: TEAMS.novorizontino,
    awayTeam: TEAMS.goias,
    league: MOCK_LEAGUES[1],
    stadium: { name: "Jorge Ismael de Biasi", city: "Novo Horizonte (SP)" },
    status: "FINISHED",
    statusShort: "FT",
    minute: 90,
    homeScore: 2,
    awayScore: 1,
    homeHalftimeScore: 1,
    awayHalftimeScore: 0,
    startTime: todayHour(19, 0) - 86400000,
    events: [
      { _id: "e15", minute: 32, playerName: "Neto Pessoa", type: "GOAL", teamId: TEAMS.novorizontino._id },
      { _id: "e16", minute: 61, playerName: "Thiago Galhardo", type: "GOAL", teamId: TEAMS.goias._id },
      { _id: "e17", minute: 84, playerName: "Rodolfo", type: "GOAL", teamId: TEAMS.novorizontino._id },
    ],
  },
  {
    _id: "match_7",
    leagueId: "league_brasileirao_b",
    round: "Rodada 29",
    stage: "Turno Único",
    homeTeamId: TEAMS.sport._id,
    awayTeamId: TEAMS.vila_nova._id,
    homeTeam: TEAMS.sport,
    awayTeam: TEAMS.vila_nova,
    league: MOCK_LEAGUES[1],
    stadium: { name: "Ilha do Retiro", city: "Recife (PE)" },
    status: "SCHEDULED",
    statusShort: "21:30",
    homeScore: 0,
    awayScore: 0,
    startTime: todayHour(21, 30),
    events: [],
  },
];

// 3. Tabela de Classificação Padrão (Série A)
export const MOCK_STANDINGS: MockStandingRow[] = [
  { _id: "st_1", rank: 1, previousRank: 1, team: { name: "Botafogo" }, points: 57, played: 28, win: 17, draw: 6, lose: 5, goalsFor: 47, goalsAgainst: 26, goalsDiff: 21, form: "WWDWW", description: "Fase de Grupos da Libertadores", zoneDescription: "Fase de Grupos da Libertadores" },
  { _id: "st_2", rank: 2, previousRank: 2, team: { name: "Palmeiras" }, points: 56, played: 28, win: 17, draw: 5, lose: 6, goalsFor: 46, goalsAgainst: 20, goalsDiff: 26, form: "WWWWD", description: "Fase de Grupos da Libertadores", zoneDescription: "Fase de Grupos da Libertadores" },
  { _id: "st_3", rank: 3, previousRank: 4, team: { name: "Fortaleza" }, points: 55, played: 28, win: 16, draw: 7, lose: 5, goalsFor: 38, goalsAgainst: 26, goalsDiff: 12, form: "LWWLW", description: "Fase de Grupos da Libertadores", zoneDescription: "Fase de Grupos da Libertadores" },
  { _id: "st_4", rank: 4, previousRank: 3, team: { name: "Flamengo" }, points: 51, played: 28, win: 15, draw: 6, lose: 7, goalsFor: 45, goalsAgainst: 32, goalsDiff: 13, form: "LWDLW", description: "Fase de Grupos da Libertadores", zoneDescription: "Fase de Grupos da Libertadores" },
  { _id: "st_5", rank: 5, previousRank: 5, team: { name: "São Paulo" }, points: 47, played: 28, win: 14, draw: 5, lose: 9, goalsFor: 38, goalsAgainst: 29, goalsDiff: 9, form: "WLWLW", description: "Qualificação Libertadores", zoneDescription: "Qualificação Libertadores" },
  { _id: "st_6", rank: 6, previousRank: 6, team: { name: "Internacional" }, points: 45, played: 28, win: 12, draw: 9, lose: 7, goalsFor: 36, goalsAgainst: 26, goalsDiff: 10, form: "WWWDW", description: "Qualificação Libertadores", zoneDescription: "Qualificação Libertadores" },
  { _id: "st_7", rank: 7, previousRank: 7, team: { name: "Bahia" }, points: 45, played: 28, win: 13, draw: 6, lose: 9, goalsFor: 39, goalsAgainst: 31, goalsDiff: 8, form: "WLWLD", description: "Fase de Grupos Sul-Americana", zoneDescription: "Fase de Grupos Sul-Americana" },
  { _id: "st_8", rank: 8, previousRank: 8, team: { name: "Cruzeiro" }, points: 43, played: 28, win: 12, draw: 7, lose: 9, goalsFor: 35, goalsAgainst: 28, goalsDiff: 7, form: "DDLDW", description: "Fase de Grupos Sul-Americana", zoneDescription: "Fase de Grupos Sul-Americana" },
  { _id: "st_9", rank: 9, previousRank: 9, team: { name: "Atlético-MG" }, points: 37, played: 27, win: 9, draw: 10, lose: 8, goalsFor: 36, goalsAgainst: 36, goalsDiff: 0, form: "LWD LW", description: "Fase de Grupos Sul-Americana", zoneDescription: "Fase de Grupos Sul-Americana" },
  { _id: "st_10", rank: 10, previousRank: 10, team: { name: "Vasco da Gama" }, points: 36, played: 28, win: 10, draw: 6, lose: 12, goalsFor: 32, goalsAgainst: 38, goalsDiff: -6, form: "DLDLW", description: "Fase de Grupos Sul-Americana", zoneDescription: "Fase de Grupos Sul-Americana" },
  { _id: "st_11", rank: 11, previousRank: 11, team: { name: "Grêmio" }, points: 35, played: 28, win: 10, draw: 5, lose: 13, goalsFor: 31, goalsAgainst: 37, goalsDiff: -6, form: "DLWDL", description: "Fase de Grupos Sul-Americana", zoneDescription: "Fase de Grupos Sul-Americana" },
  { _id: "st_12", rank: 12, previousRank: 13, team: { name: "Criciúma" }, points: 35, played: 28, win: 9, draw: 8, lose: 11, goalsFor: 34, goalsAgainst: 40, goalsDiff: -6, form: "WLDWL", description: "Fase de Grupos Sul-Americana", zoneDescription: "Fase de Grupos Sul-Americana" },
  { _id: "st_13", rank: 13, previousRank: 12, team: { name: "Red Bull Bragantino" }, points: 34, played: 28, win: 8, draw: 10, lose: 10, goalsFor: 34, goalsAgainst: 38, goalsDiff: -4, form: "DDLDL" },
  { _id: "st_14", rank: 14, previousRank: 14, team: { name: "Juventude" }, points: 33, played: 28, win: 8, draw: 9, lose: 11, goalsFor: 32, goalsAgainst: 41, goalsDiff: -9, form: "DLWLD" },
  { _id: "st_15", rank: 15, previousRank: 15, team: { name: "Athletico-PR" }, points: 31, played: 27, win: 8, draw: 7, lose: 12, goalsFor: 27, goalsAgainst: 31, goalsDiff: -4, form: "LDLLD" },
  { _id: "st_16", rank: 16, previousRank: 17, team: { name: "Fluminense" }, points: 30, played: 28, win: 8, draw: 6, lose: 14, goalsFor: 22, goalsAgainst: 30, goalsDiff: -8, form: "WLLLW" },
  { _id: "st_17", rank: 17, previousRank: 18, team: { name: "Vitória" }, points: 28, played: 28, win: 8, draw: 4, lose: 16, goalsFor: 30, goalsAgainst: 42, goalsDiff: -12, form: "LWWLL", description: "Rebaixamento", zoneDescription: "Rebaixamento" },
  { _id: "st_18", rank: 18, previousRank: 16, team: { name: "Corinthians" }, points: 28, played: 28, win: 6, draw: 10, lose: 12, goalsFor: 27, goalsAgainst: 36, goalsDiff: -9, form: "LWLWL", description: "Rebaixamento", zoneDescription: "Rebaixamento" },
  { _id: "st_19", rank: 19, previousRank: 19, team: { name: "Cuiabá" }, points: 26, played: 27, win: 6, draw: 8, lose: 13, goalsFor: 23, goalsAgainst: 35, goalsDiff: -12, form: "DLDDW", description: "Rebaixamento", zoneDescription: "Rebaixamento" },
  { _id: "st_20", rank: 20, previousRank: 20, team: { name: "Atlético-GO" }, points: 21, played: 28, win: 5, draw: 6, lose: 17, goalsFor: 22, goalsAgainst: 47, goalsDiff: -25, form: "LLLWW", description: "Rebaixamento", zoneDescription: "Rebaixamento" },
];

// 4. Classificação UEFA Nations League (por Divisões e Grupos)
export const MOCK_NATIONS_LEAGUE_STANDINGS: Record<string, Record<string, MockNationsStandingRow[]>> = {
  A: {
    "A1": [
      { _id: "n_a1_1", teamName: "Portugal", points: 10, played: 4, won: 3, drawn: 1, lost: 0, goalsFor: 7, goalsAgainst: 3, goalDifference: 4, form: ["W", "W", "W", "D"], zone: "QUARTER_FINALS" },
      { _id: "n_a1_2", teamName: "Croácia", points: 7, played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 7, goalsAgainst: 6, goalDifference: 1, form: ["L", "W", "W", "D"], zone: "QUARTER_FINALS" },
      { _id: "n_a1_3", teamName: "Polônia", points: 4, played: 4, won: 1, drawn: 1, lost: 2, goalsFor: 7, goalsAgainst: 9, goalDifference: -2, form: ["W", "L", "L", "D"], zone: "RELEGATION_PLAYOFF" },
      { _id: "n_a1_4", teamName: "Escócia", points: 1, played: 4, won: 0, drawn: 1, lost: 3, goalsFor: 4, goalsAgainst: 7, goalDifference: -3, form: ["L", "L", "L", "D"], zone: "RELEGATION" },
    ],
    "A2": [
      { _id: "n_a2_1", teamName: "Itália", points: 10, played: 4, won: 3, drawn: 1, lost: 0, goalsFor: 11, goalsAgainst: 5, goalDifference: 6, form: ["W", "W", "D", "W"], zone: "QUARTER_FINALS" },
      { _id: "n_a2_2", teamName: "França", points: 9, played: 4, won: 3, drawn: 0, lost: 1, goalsFor: 9, goalsAgainst: 5, goalDifference: 4, form: ["L", "W", "W", "W"], zone: "QUARTER_FINALS" },
      { _id: "n_a2_3", teamName: "Bélgica", points: 4, played: 4, won: 1, drawn: 1, lost: 2, goalsFor: 6, goalsAgainst: 7, goalDifference: -1, form: ["W", "L", "D", "L"], zone: "RELEGATION_PLAYOFF" },
      { _id: "n_a2_4", teamName: "Israel", points: 0, played: 4, won: 0, drawn: 0, lost: 4, goalsFor: 4, goalsAgainst: 13, goalDifference: -9, form: ["L", "L", "L", "L"], zone: "RELEGATION" },
    ],
    "A3": [
      { _id: "n_a3_1", teamName: "Alemanha", points: 10, played: 4, won: 3, drawn: 1, lost: 0, goalsFor: 10, goalsAgainst: 3, goalDifference: 7, form: ["W", "D", "W", "W"], zone: "QUARTER_FINALS" },
      { _id: "n_a3_2", teamName: "Holanda", points: 5, played: 4, won: 1, drawn: 2, lost: 1, goalsFor: 8, goalsAgainst: 6, goalDifference: 2, form: ["W", "D", "D", "L"], zone: "QUARTER_FINALS" },
      { _id: "n_a3_3", teamName: "Hungria", points: 5, played: 4, won: 1, drawn: 2, lost: 1, goalsFor: 3, goalsAgainst: 6, goalDifference: -3, form: ["L", "D", "D", "W"], zone: "RELEGATION_PLAYOFF" },
      { _id: "n_a3_4", teamName: "Bósnia e Herzegovina", points: 1, played: 4, won: 0, drawn: 1, lost: 3, goalsFor: 3, goalsAgainst: 9, goalDifference: -6, form: ["L", "D", "L", "L"], zone: "RELEGATION" },
    ],
    "A4": [
      { _id: "n_a4_1", teamName: "Espanha", points: 10, played: 4, won: 3, drawn: 1, lost: 0, goalsFor: 8, goalsAgainst: 1, goalDifference: 7, form: ["D", "W", "W", "W"], zone: "QUARTER_FINALS" },
      { _id: "n_a4_2", teamName: "Dinamarca", points: 7, played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 6, goalsAgainst: 3, goalDifference: 3, form: ["W", "W", "L", "D"], zone: "QUARTER_FINALS" },
      { _id: "n_a4_3", teamName: "Sérvia", points: 4, played: 4, won: 1, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3, form: ["D", "L", "W", "L"], zone: "RELEGATION_PLAYOFF" },
      { _id: "n_a4_4", teamName: "Suíça", points: 1, played: 4, won: 0, drawn: 1, lost: 3, goalsFor: 3, goalsAgainst: 10, goalDifference: -7, form: ["L", "L", "L", "D"], zone: "RELEGATION" },
    ],
  },
  B: {
    "B1": [
      { _id: "n_b1_1", teamName: "República Tcheca", points: 7, played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 7, goalsAgainst: 7, goalDifference: 0, form: ["L", "W", "W", "D"], zone: "PROMOTION" },
      { _id: "n_b1_2", teamName: "Geórgia", points: 6, played: 4, won: 2, drawn: 0, lost: 2, goalsFor: 5, goalsAgainst: 3, goalDifference: 2, form: ["W", "W", "L", "L"], zone: "PROMOTION_PLAYOFF" },
      { _id: "n_b1_3", teamName: "Albânia", points: 6, played: 4, won: 2, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, form: ["W", "L", "L", "W"], zone: "RELEGATION_PLAYOFF" },
      { _id: "n_b1_4", teamName: "Ucrânia", points: 4, played: 4, won: 1, drawn: 1, lost: 2, goalsFor: 5, goalsAgainst: 6, goalDifference: -1, form: ["L", "L", "W", "D"], zone: "RELEGATION" },
    ],
    "B2": [
      { _id: "n_b2_1", teamName: "Grécia", points: 12, played: 4, won: 4, drawn: 0, lost: 0, goalsFor: 9, goalsAgainst: 1, goalDifference: 8, form: ["W", "W", "W", "W"], zone: "PROMOTION" },
      { _id: "n_b2_2", teamName: "Inglaterra", points: 9, played: 4, won: 3, drawn: 0, lost: 1, goalsFor: 8, goalsAgainst: 3, goalDifference: 5, form: ["W", "W", "L", "W"], zone: "PROMOTION_PLAYOFF" },
      { _id: "n_b2_3", teamName: "Irlanda", points: 3, played: 4, won: 1, drawn: 0, lost: 3, goalsFor: 2, goalsAgainst: 7, goalDifference: -5, form: ["L", "L", "W", "L"], zone: "RELEGATION_PLAYOFF" },
      { _id: "n_b2_4", teamName: "Finlândia", points: 0, played: 4, won: 0, drawn: 0, lost: 4, goalsFor: 2, goalsAgainst: 10, goalDifference: -8, form: ["L", "L", "L", "L"], zone: "RELEGATION" },
    ],
  },
  C: {
    "C1": [
      { _id: "n_c1_1", teamName: "Suécia", points: 10, played: 4, won: 3, drawn: 1, lost: 0, goalsFor: 11, goalsAgainst: 3, goalDifference: 8, form: ["W", "W", "D", "W"], zone: "PROMOTION" },
      { _id: "n_c1_2", teamName: "Eslováquia", points: 10, played: 4, won: 3, drawn: 1, lost: 0, goalsFor: 8, goalsAgainst: 3, goalDifference: 5, form: ["W", "W", "D", "W"], zone: "PROMOTION_PLAYOFF" },
      { _id: "n_c1_3", teamName: "Estônia", points: 3, played: 4, won: 1, drawn: 0, lost: 3, goalsFor: 3, goalsAgainst: 8, goalDifference: -5, form: ["L", "L", "W", "L"], zone: "NONE" },
      { _id: "n_c1_4", teamName: "Azerbaijão", points: 0, played: 4, won: 0, drawn: 0, lost: 4, goalsFor: 2, goalsAgainst: 10, goalDifference: -8, form: ["L", "L", "L", "L"], zone: "RELEGATION" },
    ],
  },
  D: {
    "D1": [
      { _id: "n_d1_1", teamName: "Gibraltar", points: 5, played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 3, goalsAgainst: 2, goalDifference: 1, form: ["D", "W", "D"], zone: "PROMOTION" },
      { _id: "n_d1_2", teamName: "San Marino", points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 1, goalDifference: 0, form: ["W", "L"], zone: "PROMOTION_PLAYOFF" },
      { _id: "n_d1_3", teamName: "Liechtenstein", points: 2, played: 3, won: 0, drawn: 2, lost: 1, goalsFor: 2, goalsAgainst: 3, goalDifference: -1, form: ["L", "D", "D"], zone: "NONE" },
    ],
  },
};

// 5. Artilharia Mock
export const MOCK_TOP_SCORERS: MockTopScorer[] = [
  { _id: "sc_1", rank: 1, playerName: "Pedro", teamName: "Flamengo", goals: 11, assists: 4, matches: 21, penalties: 2 },
  { _id: "sc_2", rank: 2, playerName: "Estêvão", teamName: "Palmeiras", goals: 10, assists: 7, matches: 24, penalties: 1 },
  { _id: "sc_3", rank: 3, playerName: "Hulk", teamName: "Atlético-MG", goals: 9, assists: 3, matches: 20, penalties: 4 },
  { _id: "sc_4", rank: 4, playerName: "Luciano", teamName: "São Paulo", goals: 9, assists: 1, matches: 23, penalties: 2 },
  { _id: "sc_5", rank: 5, playerName: "Yuri Alberto", teamName: "Corinthians", goals: 8, assists: 3, matches: 22, penalties: 0 },
  { _id: "sc_6", rank: 6, playerName: "Pablo Vegetti", teamName: "Vasco da Gama", goals: 8, assists: 2, matches: 24, penalties: 3 },
  { _id: "sc_7", rank: 7, playerName: "Flaco López", teamName: "Palmeiras", goals: 8, assists: 2, matches: 23, penalties: 0 },
];

export function getMockMatchById(matchId: string): MockMatch | null {
  return MOCK_MATCHES.find((m) => m._id === matchId) || null;
}
