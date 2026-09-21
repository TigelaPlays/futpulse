import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Calendar, Clock, ChevronRight } from "lucide-react";

interface RoundMatchesListProps {
  leagueId: Id<"leagues">;
  round: string;
}

export function RoundMatchesList({ leagueId, round }: RoundMatchesListProps) {
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

      {/* Lista de Partidas */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[700px] no-scrollbar flex-1">
        {matches === undefined ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Carregando rodada...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-14 px-4 space-y-2">
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
            const isLive = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
              m.status
            );
            const isFinished = m.status === "FINISHED";
            const homeWon = isFinished && m.homeScore > m.awayScore;
            const awayWon = isFinished && m.awayScore > m.homeScore;

            return (
              <div
                key={m._id}
                className="p-3 hover:bg-slate-50/90 transition-colors group cursor-pointer bg-white"
              >
                {/* Linha de Status / Horário */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <div className="flex items-center gap-1.5">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                        {m.minute ? `${m.minute}'` : m.statusShort || "AO VIVO"}
                      </span>
                    ) : isFinished ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        FIM
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/80">
                        {m.statusShort || "AGENDADO"}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>

                {/* Times e Placares */}
                <div className="space-y-1.5">
                  {/* Mandante */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.homeTeam?.logoUrl ? (
                        <div className="w-4 h-4 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 border border-slate-200">
                          <img
                            src={m.homeTeam.logoUrl}
                            alt=""
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                          {m.homeTeam?.name?.charAt(0) || "M"}
                        </div>
                      )}
                      <span
                        className={`text-xs truncate transition-colors ${
                          homeWon
                            ? "font-bold text-slate-950"
                            : "font-medium text-slate-700 group-hover:text-slate-900"
                        }`}
                      >
                        {m.homeTeam?.name ?? "Mandante"}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 tabular-nums ${
                        isLive
                          ? "text-emerald-700"
                          : homeWon
                          ? "text-slate-950"
                          : "text-slate-500"
                      }`}
                    >
                      {isFinished || isLive ? m.homeScore : "-"}
                    </span>
                  </div>

                  {/* Visitante */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.awayTeam?.logoUrl ? (
                        <div className="w-4 h-4 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 border border-slate-200">
                          <img
                            src={m.awayTeam.logoUrl}
                            alt=""
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                          {m.awayTeam?.name?.charAt(0) || "V"}
                        </div>
                      )}
                      <span
                        className={`text-xs truncate transition-colors ${
                          awayWon
                            ? "font-bold text-slate-950"
                            : "font-medium text-slate-700 group-hover:text-slate-900"
                        }`}
                      >
                        {m.awayTeam?.name ?? "Visitante"}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 tabular-nums ${
                        isLive
                          ? "text-emerald-700"
                          : awayWon
                          ? "text-slate-950"
                          : "text-slate-500"
                      }`}
                    >
                      {isFinished || isLive ? m.awayScore : "-"}
                    </span>
                  </div>
                </div>

                {/* Eventos da Partida (Gols e Cartões Vermelhos) */}
                {m.events && m.events.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                    {m.events.map((ev, idx) => {
                      const isHomeEvent = ev.teamId === m.homeTeamId;
                      const isRedCard = ev.type === "RED_CARD";
                      const isPenalty = ev.detail?.toLowerCase().includes("pen");
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[10px] text-slate-500"
                        >
                          <span className="text-[10px] shrink-0">
                            {isRedCard ? "🟥" : "⚽"}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {ev.playerName}
                            {isPenalty && (
                              <span className="text-slate-400 font-normal"> (P)</span>
                            )}
                          </span>
                          <span className="text-slate-400 font-medium shrink-0">
                            ({ev.minute}
                            {ev.extraMinute ? `+${ev.extraMinute}` : ""}
                            ')
                          </span>
                          <span className="text-[9px] text-slate-500 ml-auto truncate max-w-[90px]">
                            {isHomeEvent ? m.homeTeam?.name : m.awayTeam?.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

