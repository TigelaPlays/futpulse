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
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-lg animate-fade-in flex flex-col h-full">
      {/* Cabeçalho do Painel */}
      <div className="p-3.5 border-b border-[#30363d] bg-gradient-to-r from-[#1c2128] to-[#161b22] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              {round}
            </h3>
            <p className="text-[11px] text-slate-400">
              {matches === undefined
                ? "Carregando jogos..."
                : `${matches.length} ${matches.length === 1 ? "partida" : "partidas"}`}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Partidas */}
      <div className="divide-y divide-[#21262d]/70 overflow-y-auto max-h-[700px] no-scrollbar flex-1">
        {matches === undefined ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Carregando rodada...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-14 px-4 space-y-2">
            <Clock className="w-7 h-7 text-slate-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">
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
                className="p-3 hover:bg-[#21262d]/40 transition-colors group cursor-pointer"
              >
                {/* Linha de Status / Horário */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <div className="flex items-center gap-1.5">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        {m.minute ? `${m.minute}'` : m.statusShort || "AO VIVO"}
                      </span>
                    ) : isFinished ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                        FIM
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800/60 text-slate-400 border border-slate-700/40">
                        {m.statusShort || "AGENDADO"}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>

                {/* Times e Placares */}
                <div className="space-y-1.5">
                  {/* Mandante */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.homeTeam?.logoUrl ? (
                        <div className="w-4 h-4 rounded-full bg-white/90 p-0.5 flex items-center justify-center shrink-0 shadow-2xs">
                          <img
                            src={m.homeTeam.logoUrl}
                            alt=""
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                          {m.homeTeam?.name?.charAt(0) || "M"}
                        </div>
                      )}
                      <span
                        className={`text-xs truncate transition-colors ${
                          homeWon
                            ? "font-bold text-slate-100"
                            : "font-medium text-slate-300 group-hover:text-slate-100"
                        }`}
                      >
                        {m.homeTeam?.name ?? "Mandante"}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 tabular-nums ${
                        isLive
                          ? "text-emerald-400"
                          : homeWon
                          ? "text-slate-100"
                          : "text-slate-400"
                      }`}
                    >
                      {isFinished || isLive ? m.homeScore : "-"}
                    </span>
                  </div>

                  {/* Visitante */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.awayTeam?.logoUrl ? (
                        <div className="w-4 h-4 rounded-full bg-white/90 p-0.5 flex items-center justify-center shrink-0 shadow-2xs">
                          <img
                            src={m.awayTeam.logoUrl}
                            alt=""
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                          {m.awayTeam?.name?.charAt(0) || "V"}
                        </div>
                      )}
                      <span
                        className={`text-xs truncate transition-colors ${
                          awayWon
                            ? "font-bold text-slate-100"
                            : "font-medium text-slate-300 group-hover:text-slate-100"
                        }`}
                      >
                        {m.awayTeam?.name ?? "Visitante"}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 tabular-nums ${
                        isLive
                          ? "text-emerald-400"
                          : awayWon
                          ? "text-slate-100"
                          : "text-slate-400"
                      }`}
                    >
                      {isFinished || isLive ? m.awayScore : "-"}
                    </span>
                  </div>
                </div>

                {/* Eventos de Gol (se houver) */}
                {m.events && m.events.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#30363d]/40 space-y-1">
                    {m.events.map((ev, idx) => {
                      const isHomeGoal = ev.teamId === m.homeTeamId;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[10px] text-slate-400"
                        >
                          <span className="text-[10px]">⚽</span>
                          <span className="font-semibold text-slate-300 truncate">
                            {ev.playerName}
                          </span>
                          <span className="text-slate-500 font-medium">({ev.minute}')</span>
                          <span className="text-[9px] text-slate-500 ml-auto truncate max-w-[90px]">
                            {isHomeGoal ? m.homeTeam?.name : m.awayTeam?.name}
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

