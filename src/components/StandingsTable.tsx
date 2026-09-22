import { useState, Fragment } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Trophy } from "lucide-react";

interface StandingsTableProps {
  leagueId: Id<"leagues">;
  leagueName: string;
  currentRound: number;
}

interface ZoneInfo {
  label?: string;
  borderColor: string;
}

function getZoneInfo(
  rank: number,
  totalTeams: number,
  leagueName: string,
  description?: string
): ZoneInfo {
  const isSerieB =
    leagueName.toLowerCase().includes("série b") ||
    leagueName.toLowerCase().includes("serie b");

  if (isSerieB) {
    if (rank <= 2) {
      return {
        label: rank === 1 ? "Promoção (Série A)" : undefined,
        borderColor: "border-l-emerald-600",
      };
    }
    if (rank <= 6) {
      return {
        label: rank === 3 ? "Play-off para Promoção" : undefined,
        borderColor: "border-l-teal-400",
      };
    }
    if (rank > totalTeams - 4) {
      return {
        label: rank === totalTeams - 3 ? "Rebaixamento (Série C)" : undefined,
        borderColor: "border-l-rose-600",
      };
    }
    return { borderColor: "border-l-transparent" };
  }

  // Série A e ligas gerais
  const desc = description?.toLowerCase() || "";
  if (desc.includes("libertadores") || rank <= 4) {
    return {
      label: rank === 1 ? "Fase de Grupos (Libertadores)" : undefined,
      borderColor: "border-l-emerald-600",
    };
  }
  if (desc.includes("qualif") || (rank > 4 && rank <= 6)) {
    return {
      label: rank === 5 ? "Qualificação (Libertadores)" : undefined,
      borderColor: "border-l-teal-400",
    };
  }
  if (desc.includes("sudamericana") || (rank > 6 && rank <= 12)) {
    return {
      label: rank === 7 ? "Copa Sul-Americana" : undefined,
      borderColor: "border-l-sky-500",
    };
  }
  if (
    desc.includes("relegation") ||
    desc.includes("rebaixamento") ||
    rank > totalTeams - 4
  ) {
    return {
      label: rank === totalTeams - 3 ? "Rebaixamento" : undefined,
      borderColor: "border-l-rose-600",
    };
  }
  return { borderColor: "border-l-transparent" };
}

export function StandingsTable({
  leagueId,
  leagueName,
  currentRound,
}: StandingsTableProps) {
  const [tableFilter, setTableFilter] = useState<"all" | "home" | "away">("all");

  const standings = useQuery(api.leagues.getStandingsByRound, {
    leagueId,
    upToRound: currentRound,
    filter: tableFilter,
  });

  const isSerieB =
    leagueName.toLowerCase().includes("série b") ||
    leagueName.toLowerCase().includes("serie b");

  const renderRankMovement = (rank: number, previousRank?: number) => {
    if (previousRank === undefined || rank === previousRank) {
      return (
        <span
          className="text-[10px] text-slate-300 font-bold leading-none select-none"
          title="Manteve a posição"
        >
          —
        </span>
      );
    }
    if (rank < previousRank) {
      return (
        <span
          className="text-[10px] text-emerald-500 font-extrabold leading-none select-none"
          title={`Subiu ${previousRank - rank} posição(ões)`}
        >
          ▲
        </span>
      );
    }
    return (
      <span
        className="text-[10px] text-rose-500 font-extrabold leading-none select-none"
        title={`Caiu ${rank - previousRank} posição(ões)`}
      >
        ▼
      </span>
    );
  };

  const renderFormPills = (formString?: string) => {
    if (!formString) return <span className="text-slate-300">-</span>;
    const chars = formString.slice(-5).split("");

    return (
      <div className="inline-flex items-center gap-1 bg-slate-100/90 rounded-md px-1.5 py-0.5 border border-slate-200/80">
        {chars.map((char, index) => {
          const upper = char.toUpperCase();
          if (upper === "W" || upper === "V") {
            return (
              <span
                key={index}
                className="w-4.5 h-4.5 rounded-[4px] bg-emerald-500 text-white flex items-center justify-center text-[9px] font-extrabold shadow-2xs select-none"
                title="Vitória"
              >
                V
              </span>
            );
          }
          if (upper === "D" || upper === "E") {
            return (
              <span
                key={index}
                className="w-4.5 h-4.5 rounded-[4px] bg-slate-400 text-white flex items-center justify-center text-[9px] font-extrabold shadow-2xs select-none"
                title="Empate"
              >
                E
              </span>
            );
          }
          return (
            <span
              key={index}
              className="w-4.5 h-4.5 rounded-[4px] bg-rose-500 text-white flex items-center justify-center text-[9px] font-extrabold shadow-2xs select-none"
              title="Derrota"
            >
              D
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-fade-in flex flex-col h-full justify-between">
      {/* Topo: Cabeçalho & Filtros */}
      <div>
        {/* Cabeçalho da Classificação */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Tabela de Classificação
                <span className="text-xs font-normal text-slate-500">• {leagueName}</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Após {currentRound === 1 ? "a 1ª rodada" : `a ${currentRound}ª rodada`}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-navegação: Todos | Casa | Fora */}
        <div className="px-4 py-2 border-b border-slate-200/80 bg-slate-50/40 flex items-center justify-center">
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setTableFilter("all")}
              className={`px-4 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tableFilter === "all"
                  ? "bg-white text-slate-950 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTableFilter("home")}
              className={`px-4 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tableFilter === "home"
                  ? "bg-white text-slate-950 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Casa
            </button>
            <button
              onClick={() => setTableFilter("away")}
              className={`px-4 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tableFilter === "away"
                  ? "bg-white text-slate-950 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Fora
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Classificação */}
      {standings === undefined ? (
        <div className="flex-1 flex justify-center items-center py-24 text-slate-500 gap-2">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Calculando classificação...</span>
        </div>
      ) : standings.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center text-center py-20 px-4 space-y-2">
          <Trophy className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-700 font-medium">
            Nenhuma partida finalizada até a Rodada {currentRound}.
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Navegue até uma rodada com resultados cadastrados para visualizar os pontos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar flex-1 flex flex-col">
          <table className="w-full text-left border-collapse min-w-[580px] flex-1">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-400 font-bold uppercase text-[10.5px] tracking-wider font-mono">
                <th className="py-2.5 pl-3 pr-2 text-center w-11">#</th>
                <th className="py-2.5 px-3 min-w-[170px] text-slate-500 font-semibold font-sans normal-case text-xs">Clube</th>
                <th className="py-2.5 px-2 text-center w-9" title="Partidas Jogadas">J</th>
                <th className="py-2.5 px-2 text-center w-9" title="Vitórias">V</th>
                <th className="py-2.5 px-2 text-center w-9" title="Empates">E</th>
                <th className="py-2.5 px-2 text-center w-9" title="Derrotas">D</th>
                <th className="py-2.5 px-2.5 text-center w-12" title="Saldo de Gols">SG</th>
                <th className="py-2.5 px-2.5 text-center w-14" title="Gols Pró : Gols Contra">GOLS</th>
                <th className="py-2.5 px-3 text-center hidden md:table-cell min-w-[130px] font-sans normal-case text-xs text-slate-500 font-semibold">Forma</th>
                <th className="py-2.5 px-3 text-center w-14 font-black text-slate-950 text-xs">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {standings.map((row) => {
                const totalTeams = standings.length;
                const zone = getZoneInfo(row.rank, totalTeams, leagueName, row.description);

                return (
                  <Fragment key={row._id}>
                    {/* Header sutil de Zona */}
                    {zone.label && (
                      <tr className="bg-slate-50/70 border-t border-slate-200/60">
                        <td
                          colSpan={10}
                          className="py-1 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/90"
                        >
                          {zone.label}
                        </td>
                      </tr>
                    )}

                    {/* Linha do Time */}
                    <tr className="hover:bg-slate-50/90 transition-colors group bg-white">
                      {/* Posição com Barra Lateral Colorida */}
                      <td
                        className={`py-3 sm:py-3.5 pl-2.5 pr-1.5 text-center border-l-[4px] ${zone.borderColor}`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-xs font-bold text-slate-600 w-4 text-right tabular-nums">
                            {row.rank}
                          </span>
                          {renderRankMovement(row.rank, row.previousRank)}
                        </div>
                      </td>

                      {/* Escudo Oficial + Nome */}
                      <td className="py-3 sm:py-3.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {row.team?.logoUrl ? (
                            <div className="w-6 h-6 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200/90">
                              <img
                                src={row.team.logoUrl}
                                alt={row.team.name}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] text-slate-600 font-bold shrink-0">
                              {row.team?.name?.charAt(0) || "T"}
                            </div>
                          )}
                          <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors text-[13px] tracking-tight truncate max-w-[140px] sm:max-w-[210px]">
                            {row.team?.name ?? "Time"}
                          </span>
                        </div>
                      </td>

                      {/* Estatísticas com Tabular Nums */}
                      <td className="py-3 sm:py-3.5 px-2 text-center text-slate-700 font-semibold tabular-nums">
                        {row.played}
                      </td>
                      <td className="py-3 sm:py-3.5 px-2 text-center text-slate-800 font-semibold tabular-nums">
                        {row.win}
                      </td>
                      <td className="py-3 sm:py-3.5 px-2 text-center text-slate-500 font-normal tabular-nums">
                        {row.draw}
                      </td>
                      <td className="py-3 sm:py-3.5 px-2 text-center text-slate-400 font-normal tabular-nums">
                        {row.lose}
                      </td>
                      <td
                        className={`py-3 sm:py-3.5 px-2.5 text-center font-bold tabular-nums ${
                          row.goalsDiff > 0
                            ? "text-emerald-700"
                            : row.goalsDiff < 0
                            ? "text-rose-600"
                            : "text-slate-400"
                        }`}
                      >
                        {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                      </td>
                      <td className="py-3 sm:py-3.5 px-2.5 text-center text-slate-500 tracking-tight font-mono text-[11px] tabular-nums">
                        {row.goalsFor ?? 0}:{row.goalsAgainst ?? 0}
                      </td>
                      <td className="py-3 sm:py-3.5 px-3 text-center hidden md:table-cell">
                        {renderFormPills(row.form)}
                      </td>
                      {/* Pontos em Destaque */}
                      <td className="py-3 sm:py-3.5 px-3 text-center font-black text-slate-950 text-sm tabular-nums bg-slate-50/60 group-hover:bg-emerald-50/60 group-hover:text-emerald-950 transition-all border-l border-slate-100/80">
                        {row.points}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda de Zonas */}
      {standings && standings.length > 0 && (
        <div className="p-3.5 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center gap-5 text-[11px] text-slate-600 font-medium">
          {isSerieB ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 shadow-2xs" />
                <span>Promoção (Série A)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-400 shadow-2xs" />
                <span>Play-off para Promoção</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 shadow-2xs" />
                <span>Rebaixamento (Série C)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 shadow-2xs" />
                <span>Fase de Grupos (Libertadores)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-400 shadow-2xs" />
                <span>Qualificação / Pré-Libertadores</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 shadow-2xs" />
                <span>Copa Sul-Americana</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 shadow-2xs" />
                <span>Zona de Rebaixamento</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
