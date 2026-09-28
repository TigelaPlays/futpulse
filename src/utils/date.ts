/**
 * Formata um deslocamento relativo de data (ex: -1 = Ontem, 0 = Hoje, 1 = Amanhã)
 * ou dia da semana abreviado com dia/mês.
 */
export function formatQuickDateLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayMonth = `${day}/${month}`;
  if (offset === 0) return `Hoje (${dayMonth})`;
  if (offset === -1) return `Ontem (${dayMonth})`;
  if (offset === 1) return `Amanhã (${dayMonth})`;
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return `${weekdays[d.getDay()]}, ${dayMonth}`;
}
