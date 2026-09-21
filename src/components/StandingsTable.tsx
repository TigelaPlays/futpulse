import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Trophy, RefreshCw, AlertCircle } from "lucide-react";

interface StandingsTableProps {
  leagueId: Id<"leagues">;
  leagueName: string;
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
        label: rank === 1 ? "Promoção" : undefined,
        borderColor: "border-l-emerald-600",
      };
    }
    if (rank <= 6) {
      return {
        label: rank === 3 ? "Play-off para Promoção" : undefined,
        borderColor: "border-l-emerald-400",
      };
    }
    if (rank > totalTeams - 4) {
      return {
        label: rank === totalTeams - 3 ? "Rebaixamento" : undefined,
        borderColor: "border-l-rose-600",
      };
    }
    return {
      borderColor: "border-l-transparent",
    };
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
      borderColor: "border-l-emerald-400",
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
  return {
    borderColor: "border-l-transparent",
  };
}

export function StandingsTable({ leagueId, leagueName }: StandingsTableProps) {
  const standings = useQuery(api.leagues.getStandings, { leagueId });
  const syncStandings = useAction(api.ingestion.syncLeagueStandings);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<"all" | "home" | "away">("all");
  const autoSyncedRef = useRef(false);

  const isSerieB =
    leagueName.toLowerCase().includes("série b") ||
    leagueName.toLowerCase().includes("serie b");

  const handleSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const result = await syncStandings({ leagueId });
      if (result.success) {
        setSyncFeedback("Classificação atualizada!");
      } else {
        setSyncFeedback("Não foi possível atualizar.");
      }
    } catch (err) {
      console.error("Erro ao sincronizar tabela:", err);
      setSyncFeedback("Erro de conexão com a API.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  }, [leagueId, syncStandings]);

  // Se a tabela estiver vazia ao abrir a aba, dispara a busca sob demanda
  useEffect(() => {
    if (standings !== undefined && standings.length === 0 && !autoSyncedRef.current) {
      autoSyncedRef.current = true;
      void handleSync();
    }
  }, [standings, handleSync]);

  const renderRankMovement = (rank: number, previousRank?: number) => {
    if (previousRank === undefined || rank === previousRank) {
      return (
        <span
          className="text-[9px] text-slate-500 font-bold leading-none select-none"
          title="Manteve a posição"
        >
          —
        </span>
      );
    }
    if (rank < previousRank) {
      return (
        <span
          className="text-[9px] text-emerald-400 font-bold leading-none select-none"
          title={`Subiu ${previousRank - rank} posição(ões)`}
        >
          ▲
        </span>
      );
    }
    return (
      <span
        className="text-[9px] text-rose-400 font-bold leading-none select-none"
        title={`Caiu ${rank - previousRank} posição(ões)`}
      >
        ▼
      </span>
    );
  };

  const renderFormPills = (formString?: string) => {
    if (!formString) return <span className="text-slate-400">-</span>;
    // Pega até os últimos 5 jogos
    const chars = formString.slice(-5).split("");

    return (
      <div className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2 py-0.5 border border-slate-200">
        {chars.map((char, index) => {
          const upper = char.toUpperCase();
          if (upper === "W" || upper === "V") {
            return (
              <span
                key={index}
                className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs"
                title="Vitória"
              >
                W
              </span>
            );
          }
          if (upper === "D" || upper === "E") {
            return (
              <span
                key={index}
                className="w-4 h-4 rounded bg-slate-400 text-white flex items-center justify-center text-[10px] font-bold shadow-xs"
                title="Empate"
              >
                D
              </span>
            );
          }
          return (
            <span
              key={index}
              className="w-4 h-4 rounded bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs"
              title="Derrota"
            >
              L
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-fade-in">
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
            <p className="text-[11px] text-slate-500">Classificação atualizada sob demanda</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {syncFeedback && (
            <span className="text-xs font-semibold text-emerald-700 animate-fade-in px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
              {syncFeedback}
            </span>
          )}

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isSyncing
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 active:scale-95 shadow-2xs"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Atualizando..." : "Atualizar Tabela"}</span>
          </button>
        </div>
      </div>

      {/* Sub-navegação Sofascore: Todos | Casa | Fora */}
      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/40 flex items-center justify-center">
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

      {/* Tabela */}
      {standings === undefined ? (
        <div className="flex justify-center items-center py-20 text-slate-500 gap-2">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Carregando classificação...</span>
        </div>
      ) : standings.length === 0 ? (
        <div className="text-center py-16 px-4 space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm text-slate-700 font-medium">
            Nenhuma classificação salva para esta competição ainda.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Clique no botão acima para sincronizar os dados da temporada atual com a API oficial.
          </p>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Buscando..." : "Buscar Classificação Agora"}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs min-w-[580px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 pl-3 pr-2 text-center w-10">#</th>
                <th className="py-2.5 px-3 min-w-[170px]">Clube</th>
                <th className="py-2.5 px-2 text-center w-9" title="Partidas Jogadas">
                  P
                </th>
                <th className="py-2.5 px-2 text-center w-9" title="Vitórias">
                  W
                </th>
                <th className="py-2.5 px-2 text-center w-9" title="Empates">
                  D
                </th>
                <th className="py-2.5 px-2 text-center w-9" title="Derrotas">
                  L
                </th>
                <th className="py-2.5 px-2.5 text-center w-12" title="Saldo de Gols">
                  DIFF
                </th>
                <th
                  className="py-2.5 px-2.5 text-center w-14"
                  title="Gols Pró : Gols Contra"
                >
                  GLS
                </th>
                <th className="py-2.5 px-3 text-center hidden md:table-cell min-w-[130px]">
                  Últimos 5
                </th>
                <th className="py-2.5 px-3 text-center w-12 font-bold text-slate-900">
                  PTS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {standings.map((row) => {
                const totalTeams = standings.length;
                const zone = getZoneInfo(row.rank, totalTeams, leagueName, row.description);

                return (
                  <Fragment key={row._id}>
                    {/* Header de Zona de Classificação (Promoção, Play-off, Rebaixamento) */}
                    {zone.label && (
                      <tr className="bg-slate-50/80 border-t border-slate-200/60">
                        <td
                          colSpan={10}
                          className="py-1.5 pl-4 pr-3 text-[11px] font-semibold text-slate-600"
                        >
                          {zone.label}
                        </td>
                      </tr>
                    )}

                    {/* Linha do Time */}
                    <tr className="hover:bg-slate-50/90 transition-colors group bg-white">
                      {/* Posição com Barra Lateral Colorida Sofascore */}
                      <td
                        className={`py-2.5 pl-2.5 pr-1.5 text-center border-l-[3px] ${zone.borderColor}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-semibold text-slate-700 w-4 text-right">
                            {row.rank}
                          </span>
                          {renderRankMovement(row.rank, row.previousRank)}
                        </div>
                      </td>

                      {/* Escudo + Nome do Time */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {row.team?.logoUrl ? (
                            <div className="w-5 h-5 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200">
                              <img
                                src={row.team.logoUrl}
                                alt={row.team.name}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] text-slate-600 font-bold shrink-0">
                              {row.team?.name?.charAt(0) || "T"}
                            </div>
                          )}
                          <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate max-w-[140px] sm:max-w-[200px]">
                            {row.team?.name ?? "Time"}
                          </span>
                        </div>
                      </td>

                      {/* Partidas (P) */}
                      <td className="py-2.5 px-2 text-center text-slate-700">
                        {row.played}
                      </td>

                      {/* Vitórias (W) */}
                      <td className="py-2.5 px-2 text-center text-slate-700">
                        {row.win}
                      </td>

                      {/* Empates (D) */}
                      <td className="py-2.5 px-2 text-center text-slate-500">
                        {row.draw}
                      </td>

                      {/* Derrotas (L) */}
                      <td className="py-2.5 px-2 text-center text-slate-500">
                        {row.lose}
                      </td>

                      {/* Saldo de Gols (DIFF) */}
                      <td className="py-2.5 px-2.5 text-center font-semibold text-slate-800">
                        {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                      </td>

                      {/* Gols Pró:Contra (GLS) */}
                      <td className="py-2.5 px-2.5 text-center text-slate-500 tracking-tight">
                        {row.goalsFor ?? 0}:{row.goalsAgainst ?? 0}
                      </td>

                      {/* Últimos 5 Jogos */}
                      <td className="py-2.5 px-3 text-center hidden md:table-cell">
                        {renderFormPills(row.form)}
                      </td>

                      {/* Pontos (PTS) - Coluna Destacada à Direita */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-950 text-sm">
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
        <div className="p-3 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center gap-4 text-[11px] text-slate-600 font-medium">
          {isSerieB ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                <span>Promoção (Série A)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
                <span>Play-off para Promoção</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
                <span>Rebaixamento (Série C)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                <span>Fase de Grupos (Libertadores)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
                <span>Qualificação / Pré-Libertadores</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
                <span>Copa Sul-Americana</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
                <span>Zona de Rebaixamento</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
