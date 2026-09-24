import { useEffect, useState } from "react";

interface LiveMatchClockProps {
  initialMinute?: number;
  status: string;
  statusShort: string;
  updatedAt?: number;
}

export function LiveMatchClock({
  initialMinute = 0,
  status,
  statusShort,
  updatedAt,
}: LiveMatchClockProps) {
  const isRunning = status === "IN_PLAY" || status === "LIVE" || status === "EXTRA_TIME";

  // Calcula os segundos acumulados apenas dentro da tolerância razoável (máximo 5 minutos de avanço desde o último sync)
  const getElapsedSeconds = () => {
    const baseSeconds = initialMinute * 60;
    if (!isRunning || !updatedAt) return baseSeconds;

    const diffSeconds = Math.floor((Date.now() - updatedAt) / 1000);
    // Se a diferença for superior a 5 minutos (ex: dados guardados há horas), não soma para não estourar o relógio
    if (diffSeconds > 300 || diffSeconds < 0) {
      return baseSeconds;
    }

    return baseSeconds + diffSeconds;
  };

  const [totalSeconds, setTotalSeconds] = useState(getElapsedSeconds);
  const [prevSync, setPrevSync] = useState({ initialMinute, updatedAt, statusShort, status });

  // Sincroniza o estado durante o render quando as props do Convex/API forem atualizadas
  if (
    prevSync.initialMinute !== initialMinute ||
    prevSync.updatedAt !== updatedAt ||
    prevSync.statusShort !== statusShort ||
    prevSync.status !== status
  ) {
    setPrevSync({ initialMinute, updatedAt, statusShort, status });
    setTotalSeconds(getElapsedSeconds());
  }

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        const next = prev + 1;
        // Limite padrão: não ultrapassa 45' na 1H/1T ou 90' na 2H/2T via relógio local até vir confirmação da API
        if (["1H", "1T"].includes(statusShort) && next > 45 * 60) return 45 * 60;
        if (["2H", "2T"].includes(statusShort) && next > 90 * 60) return 90 * 60;
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, statusShort]);

  // Se estiver no intervalo ou pausado
  if (statusShort === "HT" || status === "PAUSED" || status === "HALFTIME") {
    return (
      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs bg-amber-50 border border-amber-300/80 px-2.5 py-0.5 rounded-full shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        <span>Intervalo</span>
      </div>
    );
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-emerald-800 font-mono font-bold text-xs bg-emerald-50 border border-emerald-300/80 px-2.5 py-0.5 rounded-full shadow-2xs ring-1 ring-emerald-400/20">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
      </span>
      <span className="tabular-nums">
        {minutes}:{formattedSeconds}
      </span>
      <span className="text-[10px] text-emerald-700 font-sans font-semibold uppercase">
        {statusShort}
      </span>
    </div>
  );
}