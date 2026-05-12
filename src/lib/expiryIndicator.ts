export type ExpiryBucket = 'expired' | 'today' | 'tomorrow' | 'warning' | 'fresh' | 'none';

export type ExpiryIndicatorState = Readonly<{
  accessibilityLabel: string;
  bucket: ExpiryBucket;
  daysUntilExpiry: number | null;
  label: string;
  tone: 'danger' | 'warning' | 'fresh' | 'neutral';
}>;

export function getExpiryIndicatorState(
  date: Date | string | null,
  now: Date = new Date(),
): ExpiryIndicatorState {
  const expiryDate = parseLocalDate(date);

  if (!expiryDate) {
    return {
      accessibilityLabel: 'No expiry date set.',
      bucket: 'none',
      daysUntilExpiry: null,
      label: 'No expiry',
      tone: 'neutral',
    };
  }

  const daysUntilExpiry = diffLocalCalendarDays(startOfLocalDay(expiryDate), startOfLocalDay(now));
  const formattedDate = formatAccessibleDate(expiryDate);

  if (daysUntilExpiry < 0) {
    return {
      accessibilityLabel: `Expired on ${formattedDate}.`,
      bucket: 'expired',
      daysUntilExpiry,
      label: 'Expired',
      tone: 'danger',
    };
  }

  if (daysUntilExpiry === 0) {
    return {
      accessibilityLabel: `Expires today, ${formattedDate}.`,
      bucket: 'today',
      daysUntilExpiry,
      label: 'Today',
      tone: 'danger',
    };
  }

  if (daysUntilExpiry === 1) {
    return {
      accessibilityLabel: `Expires tomorrow, ${formattedDate}.`,
      bucket: 'tomorrow',
      daysUntilExpiry,
      label: 'Tomorrow',
      tone: 'danger',
    };
  }

  if (daysUntilExpiry <= 3) {
    return {
      accessibilityLabel: `Expires in ${daysUntilExpiry} days, on ${formattedDate}.`,
      bucket: 'warning',
      daysUntilExpiry,
      label: `In ${daysUntilExpiry} days`,
      tone: 'warning',
    };
  }

  return {
    accessibilityLabel: `Expires in ${daysUntilExpiry} days, on ${formattedDate}.`,
    bucket: 'fresh',
    daysUntilExpiry,
    label: `In ${daysUntilExpiry} days`,
    tone: 'fresh',
  };
}

function parseLocalDate(date: Date | string | null): Date | null {
  if (!date) {
    return null;
  }

  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;

    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffLocalCalendarDays(expiryDate: Date, currentDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((expiryDate.getTime() - currentDate.getTime()) / millisecondsPerDay);
}

function formatAccessibleDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
