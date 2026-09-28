import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Award, ChevronDown, ChevronUp, Flame } from "lucide-react";

interface TopScorersWidgetProps {
  leagueId?: Id<"leagues"> | null;
}

export function TopScorersWidget({ leagueId }: TopScorersWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const topScorers = useQuery(api.matches.getTopScorers, {
    leagueId: leagueId ?? undefined,
  });

  // Estado de Carregamento (Skeleton)
  if (topScorers === undefined) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs p-5 space-y-4 animate-pulse">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200" />
            <div className="space-y-1.5">
              <div className="w-36 h-4 bg-slate-200 rounded" />
              <div className="w-48 h-3 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 bg-slate-50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Estado Vazio (Empty State)
  if (topScorers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
          <Award className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800">
            Nenhum artilheiro registrado ainda
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Assim que as partidas forem disputadas e os gols confirmados, o ranking oficial da artilharia será exibido aqui.
          </p>
        </div>
      </div>
    );
  }

  const displayedScorers = isExpanded ? topScorers : topScorers.slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-fade-in mb-6">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 tracking-wide">
                Artilharia do Campeonato
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200/80">
                {topScorers.length} Atletas
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ranking oficial dos maiores goleadores da competição
            </p>
          </div>
        </div>

        {topScorers.length > 5 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer shadow-2xs"
          >
            <span>{isExpanded ? "Ver Menos" : `Ver Todos (${topScorers.length})`}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Grid de Artilheiros */}
      <div className="p-3.5 sm:p-4 space-y-4">
        {/* Pódio dos 3 Primeiros Colocados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topScorers.slice(0, 3).map((scorer, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;

            const badgeBg = isFirst
              ? "bg-amber-100 text-amber-900 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
              : isSecond
              ? "bg-slate-200 text-slate-800 border-slate-300"
              : "bg-amber-100/70 text-amber-950 border-amber-300/80";

            const medalEmoji = isFirst ? "🥇" : isSecond ? "🥈" : "🥉";
            const podiumLabel = isFirst ? "1º Lugar" : isSecond ? "2º Lugar" : "3º Lugar";

            return (
              <div
                key={scorer._id}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all relative overflow-hidden ${
                  isFirst
                    ? "bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border-amber-300/90 shadow-xs"
                    : isSecond
                    ? "bg-gradient-to-br from-slate-50 via-white to-slate-100/40 border-slate-200 shadow-2xs"
                    : "bg-gradient-to-br from-orange-50/50 via-white to-amber-50/20 border-amber-200/80 shadow-2xs"
                }`}
              >
                {/* Badge de Posição / Medalha */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border ${badgeBg}`}
                  title={podiumLabel}
                >
                  <span>{medalEmoji}</span>
                </div>

                {/* Escudo do Clube */}
                {scorer.teamLogoUrl ? (
                  <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs">
                    <img
                      src={scorer.teamLogoUrl}
                      alt={scorer.teamName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                    {scorer.teamCode || scorer.teamName.slice(0, 2)}
                  </div>
                )}

                {/* Detalhes do Jogador e Clube */}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm text-slate-950 truncate" title={scorer.playerName}>
                    {scorer.playerName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-slate-700">{scorer.teamName}</span>
                    {scorer.matches !== undefined && (
                      <span className="text-[10px] text-slate-400">
                        • {scorer.matches} {scorer.matches === 1 ? "jogo" : "jogos"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contagem de Gols */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end font-extrabold text-emerald-700 text-lg tabular-nums">
                    <Flame className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />
                    <span>{scorer.goals}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                    {scorer.goals === 1 ? "gol" : "gols"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabela Completa de Artilheiros */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
          {/* Cabeçalho da Tabela */}
          <div className="bg-slate-50/90 px-3.5 py-2.5 text-[11px] font-bold text-slate-600 border-b border-slate-200/80 grid grid-cols-[36px_1fr_48px_48px_60px] sm:grid-cols-[44px_1fr_64px_64px_72px] items-center">
            <span className="text-center">#</span>
            <span>Jogador / Clube</span>
            <span className="text-center" title="Partidas jogadas">J</span>
            <span className="text-center" title="Gols de pênalti">P</span>
            <span className="text-right pr-2 text-emerald-800" title="Total de gols">G</span>
          </div>

          {/* Linhas da Tabela */}
          <div className="divide-y divide-slate-100">
            {displayedScorers.map((scorer) => {
              const isTop3 = scorer.rank <= 3;
              return (
                <div
                  key={scorer._id}
                  className={`px-3.5 py-2.5 text-xs grid grid-cols-[36px_1fr_48px_48px_60px] sm:grid-cols-[44px_1fr_64px_64px_72px] items-center hover:bg-slate-50/90 transition-colors ${
                    isTop3 ? "bg-amber-50/15" : ""
                  }`}
                >
                  {/* Posição */}
                  <span className="text-center font-bold text-slate-600 text-xs">
                    {scorer.rank === 1 ? "🥇" : scorer.rank === 2 ? "🥈" : scorer.rank === 3 ? "🥉" : `${scorer.rank}º`}
                  </span>

                  {/* Jogador + Escudo + Clube */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {scorer.teamLogoUrl ? (
                      <img
                        src={scorer.teamLogoUrl}
                        alt=""
                        className="w-5 h-5 object-contain shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                        {scorer.teamCode?.slice(0, 1) || "T"}
                      </div>
                    )}
                    <div className="min-w-0 truncate">
                      <span className="font-semibold text-slate-900 truncate block">
                        {scorer.playerName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal truncate block">
                        {scorer.teamName}
                      </span>
                    </div>
                  </div>

                  {/* Jogos (J) */}
                  <span className="text-center text-slate-600 font-medium text-[11px] tabular-nums">
                    {scorer.matches ?? "-"}
                  </span>

                  {/* Pênaltis (P) */}
                  <span className="text-center text-slate-500 font-medium text-[11px] tabular-nums">
                    {scorer.penalties ?? 0}
                  </span>

                  {/* Gols (G) em Destaque */}
                  <div className="text-right pr-2 font-extrabold text-emerald-700 text-sm tabular-nums">
                    {scorer.goals}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
