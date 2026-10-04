import { describe, expect, it } from 'vitest';

import { calendarDateFromIso, formatDayMonthYear, formatDisplayDate, formatIsoDateForDisplay, formatLongDisplayDate, formatRelativeTime, isCalendarDate, isoFromCalendarDate, parseShopDate, todayAccra, yesterdayAccra } from '@/lib/dates';
import { normalizeName } from '@/lib/normalize';

describe('dates', () => {
  it('returns Accra calendar dates as YYYY-MM-DD', () => {
    const date = todayAccra(new Date('2026-09-16T01:30:00.000Z'));
    expect(date).toBe('2026-09-16');
    expect(isCalendarDate(date)).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(isCalendarDate('2026-02-31')).toBe(false);
    expect(isCalendarDate('16-09-2026')).toBe(false);
  });

  it('formats ISO timestamps as Accra calendar dates', () => {
    expect(calendarDateFromIso('2026-09-15T23:30:00.000Z')).toBe('2026-09-15');
    expect(formatIsoDateForDisplay('2026-09-15T08:00:00.000Z')).toBe(formatDisplayDate('2026-09-15'));
  });

  it('parses Ghana day/month/year dates and yesterday', () => {
    expect(parseShopDate('16/09/2026')).toBe('2026-09-16');
    expect(parseShopDate('16-09-2026')).toBe('2026-09-16');
    expect(yesterdayAccra(new Date('2026-09-16T01:30:00.000Z'))).toBe('2026-09-15');
    expect(isoFromCalendarDate('2026-09-15')).toBe('2026-09-15T12:00:00.000Z');
    expect(formatDayMonthYear('2026-09-15')).toBe('15/09/2026');
    expect(formatLongDisplayDate('2026-09-16')).toBe('16 September 2026');
    expect(formatRelativeTime('2026-09-16T12:00:00.000Z', new Date('2026-09-16T12:00:20.000Z'))).toBe(
      'Just now',
    );
    expect(formatRelativeTime('2026-09-16T12:00:00.000Z', new Date('2026-09-16T12:12:00.000Z'))).toBe(
      '12 min ago',
    );
    expect(() => parseShopDate('31/02/2026')).toThrow(/valid date/);
  });
});

describe('normalizeName', () => {
  it('collapses case and spacing', () => {
    expect(normalizeName('  MILO   400g ')).toBe('milo 400g');
    expect(normalizeName('Milo')).toBe('milo');
  });
});
