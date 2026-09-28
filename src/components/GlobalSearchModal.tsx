import { useEffect, useRef } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { Search, X, Trophy } from "lucide-react";
import { getNationFlagUrl } from "../utils/flagsNationsAssets";

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  matches: any[];
  leagues: any[];
  onSelectMatch: (matchId: Id<"matches">) => void;
  onSelectLeague: (leagueId: Id<"leagues"> | null) => void;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  matches,
  leagues,
  onSelectMatch,
  onSelectLeague,
}: GlobalSearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const query = searchQuery.trim().toLowerCase();

  const filteredMatches = query
    ? (matches || []).filter((m) => {
        const home = m.homeTeam?.name?.toLowerCase() || "";
        const away = m.awayTeam?.name?.toLowerCase() || "";
        const league = m.league?.name?.toLowerCase() || "";
        return home.includes(query) || away.includes(query) || league.includes(query);
      }).slice(0, 8)
    : [];

  const filteredLeagues = query
    ? (leagues || []).filter((l) => l.name.toLowerCase().includes(query)).slice(0, 4)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisa rápida de partidas e campeonatos"
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Campo de Busca */}
        <div className="relative border-b border-slate-100 flex items-center px-4 py-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-emerald-600 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por clube, confronto ou campeonato..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors mr-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">
            Esc
          </kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 no-scrollbar">
          {query === "" ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Digite o nome de um clube (ex.: Mirassol, Vasco, Palmeiras) ou campeonato.
            </div>
          ) : filteredMatches.length === 0 && filteredLeagues.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhum resultado encontrado para &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <>
              {/* Ligas Encontradas */}
              {filteredLeagues.length > 0 && (
                <div className="p-2 bg-slate-50/70">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Campeonatos
                  </div>
                  <div className="space-y-1">
                    {filteredLeagues.map((lg) => (
                      <button
                        key={lg._id}
                        type="button"
                        onClick={() => {
                          onSelectLeague(lg._id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white hover:shadow-2xs transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          {lg.logoUrl ? (
                            <img src={lg.logoUrl} alt="" className="w-5 h-5 object-contain" />
                          ) : (
                            <Trophy className="w-4 h-4 text-emerald-600" />
                          )}
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700">
                            {lg.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{lg.country}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Partidas Encontradas */}
              {filteredMatches.length > 0 && (
                <div className="p-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Partidas
                  </div>
                  <div className="space-y-1">
                    {filteredMatches.map((m) => {
                      const homeLogo = m.homeTeam?.name
                        ? getNationFlagUrl(m.homeTeam.name, m.homeTeam.logoUrl)
                        : m.homeTeam?.logoUrl;
                      const awayLogo = m.awayTeam?.name
                        ? getNationFlagUrl(m.awayTeam.name, m.awayTeam.logoUrl)
                        : m.awayTeam?.logoUrl;

                      return (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => {
                            onSelectMatch(m._id);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Confronto */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 text-xs font-medium text-slate-700">
                              {homeLogo && (
                                <img src={homeLogo} alt="" className="w-4 h-4 object-contain" />
                              )}
                              <span className="truncate">{m.homeTeam?.name}</span>
                              <span className="font-mono font-bold text-slate-900 px-1">
                                {m.status === "SCHEDULED" ? "vs" : `${m.homeScore}-${m.awayScore}`}
                              </span>
                              {awayLogo && (
                                <img src={awayLogo} alt="" className="w-4 h-4 object-contain" />
                              )}
                              <span className="truncate">{m.awayTeam?.name}</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
                            {m.league?.name || m.round}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
