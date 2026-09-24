import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Trophy, Shield, Info, Layers } from "lucide-react";

type DivisionType = "A" | "B" | "C" | "D";

interface ZoneStyle {
  label: string;
  borderColor: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
}

const ZONE_CONFIG: Record<string, ZoneStyle> = {
  QUARTER_FINALS: {
    label: "Quartas de Final",
    borderColor: "border-l-emerald-500",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
  },
  PROMOTION: {
    label: "Promoção Direta",
    borderColor: "border-l-blue-600",
    dotColor: "bg-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
  },
  PROMOTION_PLAYOFF: {
    label: "Play-off de Promoção",
    borderColor: "border-l-cyan-500",
    dotColor: "bg-cyan-500",
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-700",
  },
  RELEGATION_PLAYOFF: {
    label: "Play-off de Despromoção",
    borderColor: "border-l-amber-500",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
  },
  RELEGATION: {
    label: "Despromoção Direta",
    borderColor: "border-l-rose-600",
    dotColor: "bg-rose-600",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
  },
  NONE: {
    label: "Permanência",
    borderColor: "border-l-transparent",
    dotColor: "bg-slate-300",
    badgeBg: "bg-slate-50",
    badgeText: "text-slate-600",
  },
};

const DIVISIONS: { id: DivisionType; label: string; sublabel: string }[] = [
  { id: "A", label: "Liga A", sublabel: "Elite & Quartas" },
  { id: "B", label: "Liga B", sublabel: "Acesso à Liga A" },
  { id: "C", label: "Liga C", sublabel: "Acesso à Liga B" },
  { id: "D", label: "Liga D", sublabel: "Acesso à Liga C" },
];

export function NationsLeagueStandings() {
  const [selectedDivision, setSelectedDivision] = useState<DivisionType>("A");

  // Consulta reativa no Convex por divisão
  const standingsGrouped = useQuery(api.standings.getStandingsByDivision, {
    division: selectedDivision,
  });

  // Extrai as zonas ativas para montar a legenda dinâmica da divisão
  const activeZones = useMemo(() => {
    if (!standingsGrouped) return [];
    const zonesSet = new Set<string>();
    for (const groupRows of Object.values(standingsGrouped)) {
      for (const row of groupRows) {
        if (row.zone && row.zone !== "NONE") {
          zonesSet.add(row.zone);
        }
      }
    }
    // Ordena de acordo com prioridade visual
    const priority = [
      "QUARTER_FINALS",
      "PROMOTION",
      "PROMOTION_PLAYOFF",
      "RELEGATION_PLAYOFF",
      "RELEGATION",
    ];
    return priority.filter((z) => zonesSet.has(z));
  }, [standingsGrouped]);

  const groupKeys = useMemo(() => {
    if (!standingsGrouped) return [];
    return Object.keys(standingsGrouped).sort((a, b) => a.localeCompare(b));
  }, [standingsGrouped]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cabeçalho do Torneio e Seleção de Divisão */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 text-blue-600 shadow-2xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>UEFA Nations League</span>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Fase de Grupos
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Classificação oficial atualizada por divisão com regras de desempate UEFA
              </p>
            </div>
          </div>

          {/* Abas Superiores de Divisão */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto w-full sm:w-auto">
            {DIVISIONS.map((div) => {
              const isActive = selectedDivision === div.id;
              return (
                <button
                  key={div.id}
                  onClick={() => setSelectedDivision(div.id)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                  aria-pressed={isActive}
                >
                  <Layers className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{div.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Estado de Carregamento (Loading Skeleton) */}
      {standingsGrouped === undefined && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="h-5 w-24 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-100 rounded" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((r) => (
                  <div key={r} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-slate-200 rounded-full" />
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </div>
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado Vazio (No Data) */}
      {standingsGrouped !== undefined && groupKeys.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            Nenhuma classificação encontrada para a Liga {selectedDivision}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Os dados para esta divisão estão sendo processados ou ainda não foram disponibilizados.
          </p>
        </div>
      )}

      {/* Grelha com os Grupos Lado a Lado (2 Colunas em telas médias/grandes) */}
      {standingsGrouped !== undefined && groupKeys.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
          {groupKeys.map((groupName) => {
            const teams = standingsGrouped[groupName] || [];

            return (
              <div
                key={groupName}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                {/* Topo do Cartão do Grupo */}
                <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase">
                      Grupo {groupName}
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    Liga {selectedDivision} • 4 Seleções
                  </span>
                </div>

                {/* Tabela do Grupo */}
                <div className="overflow-x-auto scrollbar-none">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2 pl-3 pr-1 w-8 text-center">#</th>
                        <th className="py-2 px-2 text-left">Seleção</th>
                        <th className="py-2 px-1.5 text-center font-semibold w-7" title="Partidas Jogadas">J</th>
                        <th className="py-2 px-1 text-center font-semibold w-6" title="Vitórias">V</th>
                        <th className="py-2 px-1 text-center font-semibold w-6" title="Empates">E</th>
                        <th className="py-2 px-1 text-center font-semibold w-6" title="Derrotas">D</th>
                        <th className="py-2 px-1 text-center font-semibold w-6 hidden sm:table-cell" title="Gols Marcados">GM</th>
                        <th className="py-2 px-1 text-center font-semibold w-6 hidden sm:table-cell" title="Gols Sofridos">GS</th>
                        <th className="py-2 px-1.5 text-center font-semibold w-7" title="Saldo de Gols">SG</th>
                        <th className="py-2 pl-1.5 pr-3 text-center font-black text-slate-900 w-8" title="Pontos">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {teams.map((row, index) => {
                        const rank = index + 1;
                        const zoneStyle = ZONE_CONFIG[row.zone] || ZONE_CONFIG.NONE;
                        const goalDiff = row.goalDifference;
                        const formattedSG = goalDiff > 0 ? `+${goalDiff}` : `${goalDiff}`;

                        return (
                          <tr
                            key={row._id}
                            className={`border-l-4 ${zoneStyle.borderColor} hover:bg-slate-50/80 transition-colors`}
                          >
                            {/* Posição com Indicador Visual */}
                            <td className="py-2.5 pl-2 pr-1 text-center font-bold text-slate-600 text-xs">
                              <div className="flex items-center justify-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${zoneStyle.dotColor} shrink-0`} />
                                <span>{rank}</span>
                              </div>
                            </td>

                            {/* Seleção (Bandeira + Nome) */}
                            <td className="py-2.5 px-2 font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-[180px]">
                              <div className="flex items-center gap-2">
                                <span className="text-base shrink-0 select-none leading-none">
                                  {row.teamFlag || "🏳️"}
                                </span>
                                <span className="truncate text-xs sm:text-sm font-semibold text-slate-900" title={row.teamName}>
                                  {row.teamName}
                                </span>
                              </div>
                            </td>

                            {/* Estatísticas */}
                            <td className="py-2.5 px-1.5 text-center font-medium text-slate-600">{row.played}</td>
                            <td className="py-2.5 px-1 text-center font-medium text-slate-600">{row.won}</td>
                            <td className="py-2.5 px-1 text-center font-medium text-slate-600">{row.drawn}</td>
                            <td className="py-2.5 px-1 text-center font-medium text-slate-600">{row.lost}</td>
                            <td className="py-2.5 px-1 text-center font-medium text-slate-500 hidden sm:table-cell">{row.goalsFor}</td>
                            <td className="py-2.5 px-1 text-center font-medium text-slate-500 hidden sm:table-cell">{row.goalsAgainst}</td>
                            <td className="py-2.5 px-1.5 text-center font-semibold text-slate-700">
                              <span
                                className={
                                  goalDiff > 0
                                    ? "text-emerald-600 font-bold"
                                    : goalDiff < 0
                                    ? "text-rose-600 font-bold"
                                    : "text-slate-500"
                                }
                              >
                                {formattedSG}
                              </span>
                            </td>
                            <td className="py-2.5 pl-1.5 pr-3 text-center font-black text-slate-950 text-xs sm:text-sm bg-slate-50/50">
                              {row.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda Dinâmica de Zonas da Divisão Ativa */}
      {activeZones.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Legenda da Liga {selectedDivision}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
            {activeZones.map((zoneKey) => {
              const info = ZONE_CONFIG[zoneKey];
              if (!info) return null;

              return (
                <div key={zoneKey} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${info.dotColor} shrink-0 shadow-2xs`} />
                  <span className="font-medium text-slate-700">{info.label}</span>
                </div>
              );
            })}

            <div className="flex items-center gap-1.5 text-slate-400 ml-auto text-[11px] italic">
              Critérios de Desempate UEFA: Pontos &gt; Saldo &gt; Gols Pró &gt; Vitórias
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
