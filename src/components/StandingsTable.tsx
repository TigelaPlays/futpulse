import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Trophy, RefreshCw, AlertCircle } from "lucide-react";

interface StandingsTableProps {
  leagueId: Id<"leagues">;
  leagueName: string;
}

export function StandingsTable({ leagueId, leagueName }: StandingsTableProps) {
  const standings = useQuery(api.leagues.getStandings, { leagueId });
  const syncStandings = useAction(api.ingestion.syncLeagueStandings);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const autoSyncedRef = useRef(false);

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

  const getRankBadgeClass = (rank: number, totalTeams: number, description?: string) => {
    const desc = description?.toLowerCase() || "";
    if (desc.includes("champions") || desc.includes("libertadores") || rank <= 4) {
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold";
    }
    if (desc.includes("europa") || desc.includes("sudamericana") || (rank > 4 && rank <= 6)) {
      return "bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold";
    }
    if (desc.includes("relegation") || desc.includes("rebaixamento") || rank > totalTeams - 4) {
      return "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold";
    }
    return "bg-slate-800/60 text-slate-400 border border-slate-700/40";
  };

  const renderFormPills = (formString?: string) => {
    if (!formString) return <span className="text-slate-600">-</span>;
    // Pega até os últimos 5 jogos
    const chars = formString.slice(-5).split("");

    return (
      <div className="flex items-center gap-1 justify-center">
        {chars.map((char, index) => {
          if (char === "W" || char === "V") {
            return (
              <span
                key={index}
                className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold"
                title="Vitória"
              >
                V
              </span>
            );
          }
          if (char === "D" || char === "E") {
            return (
              <span
                key={index}
                className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold"
                title="Empate"
              >
                E
              </span>
            );
          }
          return (
            <span
              key={index}
              className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold"
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
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-lg animate-fade-in">
      {/* Cabeçalho da Classificação */}
      <div className="p-4 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#1c2128] to-[#161b22]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Tabela de Classificação
              <span className="text-xs font-normal text-slate-400">• {leagueName}</span>
            </h2>
            <p className="text-[11px] text-slate-400">Classificação atualizada sob demanda</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {syncFeedback && (
            <span className="text-xs font-medium text-emerald-400 animate-fade-in">
              {syncFeedback}
            </span>
          )}

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isSyncing
                ? "bg-[#21262d] text-slate-500 border-[#30363d] cursor-not-allowed"
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 active:scale-95"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Atualizando..." : "Atualizar Tabela"}</span>
          </button>
        </div>
      </div>

      {/* Tabela */}
      {standings === undefined ? (
        <div className="flex justify-center items-center py-20 text-slate-400 gap-2">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Carregando classificação...</span>
        </div>
      ) : standings.length === 0 ? (
        <div className="text-center py-16 px-4 space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-300 font-medium">
            Nenhuma classificação salva para esta competição ainda.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Clique no botão acima para sincronizar os dados da temporada atual com a API oficial.
          </p>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Buscando..." : "Buscar Classificação Agora"}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#30363d] bg-[#0d1117]/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3 min-w-[180px]">Clube</th>
                <th className="py-2.5 px-2.5 text-center font-bold text-slate-200">PTS</th>
                <th className="py-2.5 px-2.5 text-center">J</th>
                <th className="py-2.5 px-2.5 text-center">V</th>
                <th className="py-2.5 px-2.5 text-center">E</th>
                <th className="py-2.5 px-2.5 text-center">D</th>
                <th className="py-2.5 px-2.5 text-center">SG</th>
                <th className="py-2.5 px-3 text-center hidden md:table-cell">Últimos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]/60 font-medium">
              {standings.map((row) => {
                const totalTeams = standings.length;
                return (
                  <tr
                    key={row._id}
                    className="hover:bg-[#21262d]/40 transition-colors group"
                  >
                    {/* Posição com Badge Indicativo */}
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs ${getRankBadgeClass(
                          row.rank,
                          totalTeams,
                          row.description
                        )}`}
                      >
                        {row.rank}
                      </span>
                    </td>

                    {/* Escudo + Nome do Time */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2.5">
                        {row.team?.logoUrl ? (
                          <div className="w-5 h-5 rounded-full bg-white/90 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                            <img
                              src={row.team.logoUrl}
                              alt={row.team.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                            {row.team?.name?.charAt(0) || "T"}
                          </div>
                        )}
                        <span className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate max-w-[140px] sm:max-w-[200px]">
                          {row.team?.name ?? "Time"}
                        </span>
                      </div>
                    </td>

                    {/* Pontos */}
                    <td className="py-2 px-2.5 text-center font-bold text-emerald-400 bg-emerald-500/5">
                      {row.points}
                    </td>

                    {/* Jogos */}
                    <td className="py-2 px-2.5 text-center text-slate-300">{row.played}</td>

                    {/* Vitórias */}
                    <td className="py-2 px-2.5 text-center text-slate-300">{row.win}</td>

                    {/* Empates */}
                    <td className="py-2 px-2.5 text-center text-slate-400">{row.draw}</td>

                    {/* Derrotas */}
                    <td className="py-2 px-2.5 text-center text-slate-400">{row.lose}</td>

                    {/* Saldo de Gols */}
                    <td
                      className={`py-2 px-2.5 text-center font-semibold ${
                        row.goalsDiff > 0
                          ? "text-emerald-400"
                          : row.goalsDiff < 0
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                    </td>

                    {/* Forma Recente */}
                    <td className="py-2 px-3 text-center hidden md:table-cell">
                      {renderFormPills(row.form)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda de Zonas */}
      {standings && standings.length > 0 && (
        <div className="p-3 bg-[#0d1117]/80 border-t border-[#30363d] flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500" />
            <span>Fase de Grupos / Libertadores</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/30 border border-sky-500" />
            <span>Classificação Continental / Pré</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/30 border border-rose-500" />
            <span>Zona de Rebaixamento</span>
          </div>
        </div>
      )}
    </div>
  );
}
