import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Calendar, Clock } from "lucide-react";

interface RoundMatchesListProps {
  leagueId: Id<"leagues">;
  round: string;
  onNavigateToMatches?: () => void;
}

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const CLUB_STADIUMS: Record<string, string> = {
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
  "Coritiba": "Couto Pereira",
  "Santos": "Vila Belmiro",
  "Paysandu": "Curuzu",
  "Amazonas": "Arena da Amazônia",
  "Chapecoense": "Arena Condá",
  "Brusque": "Augusto Bauer",
  "Ituano": "Novelli Júnior",
  "Guarani": "Brinco de Ouro",
  "Mirassol": "Maião",
  "Flamengo": "Maracanã",
  "Palmeiras": "Allianz Parque",
};

const CLUB_CODES: Record<string, string> = {
  "Vila Nova": "VNO",
  "América-MG": "AME",
  "América Mineiro": "AME",
  "Operário-PR": "OPE",
  "Operário": "OPE",
  "Botafogo-SP": "BOT",
  "Cuiabá": "CUI",
  "Avaí": "AVA",
  "Náutico": "NAU",
  "Athletic": "ATH",
  "Athletic Club": "ATH",
  "Novorizontino": "NOV",
  "Ceará": "CEA",
  "Goiás": "GOI",
  "Fortaleza": "FOR",
  "Juventude": "JUV",
  "Criciúma": "CRI",
  "Atlético-GO": "ACG",
  "Sport": "SPO",
  "Sport Recife": "SPO",
  "CRB": "CRB",
  "São Bernardo": "SBE",
  "Londrina": "LON",
  "Ponte Preta": "PON",
  "Coritiba": "CFC",
  "Santos": "SAN",
  "Paysandu": "PAY",
  "Amazonas": "AMA",
  "Chapecoense": "CHA",
  "Brusque": "BRU",
  "Ituano": "ITU",
  "Guarani": "GUA",
  "Mirassol": "MIR",
  "Flamengo": "FLA",
  "Palmeiras": "PAL",
};

function getTeamCode(team?: { name?: string; code?: string } | null): string {
  if (!team?.name) return "TIM";
  if (CLUB_CODES[team.name]) return CLUB_CODES[team.name];
  if (team.code && team.code.length <= 4) return team.code.toUpperCase();
  const words = team.name.replace(/[-_]/g, " ").split(" ").filter(Boolean);
  if (words.length >= 2) {
    return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
  }
  return team.name.slice(0, 3).toUpperCase();
}

function getStadiumLabel(match: any): string {
  if (match.stadium?.name) return match.stadium.name;
  if (match.homeTeam?.name && CLUB_STADIUMS[match.homeTeam.name]) {
    return CLUB_STADIUMS[match.homeTeam.name];
  }
  return getTeamCode(match.homeTeam);
}

function formatMatchHeader(match: any): { stadium: string; dateStr: string; weekday: string; timeStr: string } {
  const stadium = getStadiumLabel(match);
  const dateObj = new Date(match.startTime);
  const now = new Date();

  const isToday =
    dateObj.getDate() === now.getDate() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getFullYear() === now.getFullYear();

  const isYesterday =
    new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === dateObj.toDateString();

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dateStr = isToday ? "Hoje" : `${day}/${month}`;

  const weekday = isToday ? "" : isYesterday ? "Ontem" : WEEKDAYS[dateObj.getDay()];

  let timeStr = "";
  if (match.status === "FINISHED") {
    timeStr = "FIM";
  } else if (["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(match.status)) {
    timeStr = match.minute ? `${match.minute}'` : match.statusShort || "AO VIVO";
  } else {
    timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return { stadium, dateStr, weekday, timeStr };
}

export function RoundMatchesList({
  leagueId,
  round,
  onNavigateToMatches,
}: RoundMatchesListProps) {
  const matches = useQuery(api.matches.listMatchesByRound, {
    leagueId,
    round,
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-fade-in flex flex-col h-full">
      {/* Cabeçalho do Painel */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {round}
            </h3>
            <p className="text-[11px] text-slate-500">
              {matches === undefined
                ? "Carregando jogos..."
                : `${matches.length} ${matches.length === 1 ? "partida" : "partidas"}`}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Partidas com a estrutura oficial do Print */}
      <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {matches === undefined ? (
          <div className="flex-1 flex items-center justify-center py-16 text-slate-500 gap-2">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Carregando rodada...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center text-center py-14 px-4 space-y-2">
            <Clock className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              Nenhum jogo cadastrado para a {round}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Esta rodada ainda não possui partidas registradas no banco do campeonato.
            </p>
          </div>
        ) : (
          matches.map((m) => {
            const isFinished = m.status === "FINISHED";
            const isLive = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status);
            const { stadium, dateStr, weekday, timeStr } = formatMatchHeader(m);
            const homeCode = getTeamCode(m.homeTeam);
            const awayCode = getTeamCode(m.awayTeam);

            return (
              <div
                key={m._id}
                className="px-3.5 py-2.5 sm:py-3 hover:bg-slate-50/70 transition-colors bg-white flex-1 flex flex-col justify-center space-y-1.5"
              >
                {/* Cabeçalho do Card: Estádio em cima, Data/Hora embaixo */}
                <div className="text-center space-y-0.5">
                  <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase truncate px-2 font-mono">
                    {stadium}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-600">
                    <span className="font-semibold text-slate-700">{dateStr}</span>
                    {weekday && (
                      <>
                        <span className="text-slate-300 select-none">•</span>
                        <span>{weekday}</span>
                      </>
                    )}
                    <span className="text-slate-300 select-none">•</span>
                    <span
                      className={
                        isLive
                          ? "text-emerald-600 font-bold"
                          : isFinished
                          ? "text-slate-900 font-bold"
                          : "text-slate-700 font-semibold"
                      }
                    >
                      {timeStr}
                    </span>
                  </div>
                </div>

                {/* Confronto: [CODE] [Escudo]  1 × 0  [Escudo] [CODE] */}
                <div className="flex items-center justify-center gap-3 py-0.5">
                  {/* Mandante */}
                  <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">
                      {homeCode}
                    </span>
                    {m.homeTeam?.logoUrl ? (
                      <div className="w-7 h-7 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
                        <img
                          src={m.homeTeam.logoUrl}
                          alt={m.homeTeam?.name ?? homeCode}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                        {homeCode.slice(0, 1)}
                      </div>
                    )}
                  </div>

                  {/* Placar Central */}
                  <div className="shrink-0 flex items-center justify-center gap-1 px-1 min-w-[56px]">
                    {m.status === "SCHEDULED" ? (
                      <div className="flex items-center justify-center font-bold text-slate-300 text-sm">
                        <span>×</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-black text-lg tabular-nums text-slate-950 font-sans">
                        <span>{m.homeScore}</span>
                        <span className="text-slate-300 font-normal text-base select-none">×</span>
                        <span>{m.awayScore}</span>
                      </div>
                    )}
                  </div>

                  {/* Visitante */}
                  <div className="flex items-center justify-start gap-2 flex-1 min-w-0">
                    {m.awayTeam?.logoUrl ? (
                      <div className="w-7 h-7 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
                        <img
                          src={m.awayTeam.logoUrl}
                          alt={m.awayTeam?.name ?? awayCode}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                        {awayCode.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-500 tracking-wider">
                      {awayCode}
                    </span>
                  </div>
                </div>

                {/* Linha 3: SAIBA COMO FOI / FIQUE POR DENTRO */}
                <div className="text-center pt-0.5">
                  <button
                    onClick={onNavigateToMatches}
                    className="text-[#00a651] hover:text-emerald-700 font-extrabold text-[10.5px] uppercase tracking-wider transition-colors cursor-pointer hover:underline inline-block"
                  >
                    {m.status === "FINISHED" ? "SAIBA COMO FOI" : "FIQUE POR DENTRO"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
