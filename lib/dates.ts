export const ACCRA_TIMEZONE = 'Africa/Accra';
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function todayAccra(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCRA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function hourInAccra(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: ACCRA_TIMEZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);

  return Number.parseInt(hour, 10);
}

export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  const utc = new Date(Date.UTC(year, month - 1, day));

  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

export function calendarDateFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return todayAccra(date);
}

export function formatDisplayDate(calendarDate: string): string {
  if (!isCalendarDate(calendarDate)) {
    return calendarDate;
  }

  const [year, month, day] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatLongDisplayDate(calendarDate: string): string {
  if (!isCalendarDate(calendarDate)) {
    return calendarDate;
  }

  const [year, month, day] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatIsoDateForDisplay(value: string): string {
  if (isCalendarDate(value)) {
    return formatDisplayDate(value);
  }

  return formatDisplayDate(calendarDateFromIso(value));
}

export function addCalendarDays(calendarDate: string, days: number): string {
  if (!isCalendarDate(calendarDate)) {
    throw new Error('Enter a valid date.');
  }

  const [year, month, day] = calendarDate.split('-').map((part) => Number.parseInt(part, 10));
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yesterdayAccra(now: Date = new Date()): string {
  return addCalendarDays(todayAccra(now), -1);
}

export function isoFromCalendarDate(calendarDate: string): string {
  if (!isCalendarDate(calendarDate)) {
    throw new Error('Enter a valid date.');
  }

  return `${calendarDate}T12:00:00.000Z`;
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return iso;
  }

  const minutes = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60_000));
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  return formatIsoDateForDisplay(iso);
}

export function formatDayMonthYear(calendarDate: string): string {
  if (!isCalendarDate(calendarDate)) {
    return calendarDate;
  }

  const [year, month, day] = calendarDate.split('-');
  return `${day}/${month}/${year}`;
}

const DAY_MONTH_YEAR = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

export function parseShopDate(input: string): string {
  const trimmed = input.trim();
  if (isCalendarDate(trimmed)) {
    return trimmed;
  }

  const match = DAY_MONTH_YEAR.exec(trimmed);
  if (!match) {
    throw new Error('Enter a date like 16/09/2026.');
  }

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  const calendarDate = `${year}-${month}-${day}`;

  if (!isCalendarDate(calendarDate)) {
    throw new Error('Enter a valid date.');
  }

  return calendarDate;
}
