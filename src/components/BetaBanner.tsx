import { AlertTriangle, X } from "lucide-react";

export interface BetaBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function BetaBanner({ isVisible, onDismiss }: BetaBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="border-b border-amber-500/30 bg-slate-950/90 text-amber-200 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 shadow-[0_0_16px_rgba(251,191,36,0.18)]">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
          </div>

          <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-black tracking-[0.18em] text-amber-200 uppercase sm:text-[10px]">
            [VERSÃO BETA • EM DESENVOLVIMENTO]
          </span>

          <p className="text-[10px] leading-relaxed text-amber-100/80 sm:text-[11px]">
            FutPulse Match Center — Projeto experimental acadêmico. Novas ligas, dados em tempo real e chaveamentos sendo integrados.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso beta"
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 transition-colors hover:bg-amber-500/15 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
