const locale = 'es-ES';

function relativeFormatter(language: string, numeric: 'always' | 'auto') {
  const normalized = language === 'val' ? 'ca-ES' : language || locale;
  return new Intl.RelativeTimeFormat(normalized, { numeric });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatRelative(date: Date | string, language = locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const relative = relativeFormatter(language, 'always');
  const natural = relativeFormatter(language, 'auto');
  const amount = Math.abs(diffDays);
  const sign = diffDays >= 0 ? -1 : 1;

  if (amount === 0) return natural.format(0, 'day');
  if (amount === 1) return natural.format(sign, 'day');
  if (amount < 7) return relative.format(sign * amount, 'day');
  if (amount < 30) return relative.format(sign * Math.floor(amount / 7), 'week');
  if (amount < 365) return relative.format(sign * Math.floor(amount / 30), 'month');
  return relative.format(sign * Math.floor(amount / 365), 'year');
}

export function getMonthName(monthIndex: number): string {
  const date = new Date(2024, monthIndex, 1);
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
}

export function getCurrentMonth(): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date());
}
