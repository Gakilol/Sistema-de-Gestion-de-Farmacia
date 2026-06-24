/**
 * Timezone utilities for Nicaragua (America/Managua, UTC-6)
 */

export function getManaguaNow(): Date {
  const now = new Date();
  // Nicaragua is UTC-6, so subtract 6 hours from UTC to get Managua local time
  return new Date(now.getTime() - 6 * 60 * 60 * 1000);
}

export function getManaguaTodayStr(): string {
  const m = getManaguaNow();
  const year = m.getUTCFullYear();
  const month = String(m.getUTCMonth() + 1).padStart(2, '0');
  const day = String(m.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toManaguaStartOfDay(dateStr: string | Date): Date {
  // If dateStr is a Date object, extract the date portion in local time
  let dStr = '';
  if (typeof dateStr === 'string') {
    dStr = dateStr.split('T')[0];
  } else {
    // Treat as Date object in local context, but adjust for timezone so we extract correct date
    const local = new Date(dateStr.getTime() - 6 * 60 * 60 * 1000);
    const year = local.getUTCFullYear();
    const month = String(local.getUTCMonth() + 1).padStart(2, '0');
    const day = String(local.getUTCDate()).padStart(2, '0');
    dStr = `${year}-${month}-${day}`;
  }

  // "YYYY-MM-DD" local time starts at 06:00:00 UTC (since UTC-6)
  return new Date(`${dStr}T06:00:00.000Z`);
}

export function toManaguaEndOfDay(dateStr: string | Date): Date {
  let dStr = '';
  if (typeof dateStr === 'string') {
    dStr = dateStr.split('T')[0];
  } else {
    const local = new Date(dateStr.getTime() - 6 * 60 * 60 * 1000);
    const year = local.getUTCFullYear();
    const month = String(local.getUTCMonth() + 1).padStart(2, '0');
    const day = String(local.getUTCDate()).padStart(2, '0');
    dStr = `${year}-${month}-${day}`;
  }

  // Get next day start (which is 06:00:00 UTC of next day) and subtract 1ms
  const date = new Date(`${dStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  const nextDayYear = date.getUTCFullYear();
  const nextDayMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDayDay = String(date.getUTCDate()).padStart(2, '0');

  // Next day 06:00:00 UTC minus 1 millisecond
  const nextDayStart = new Date(`${nextDayYear}-${nextDayMonth}-${nextDayDay}T06:00:00.000Z`);
  return new Date(nextDayStart.getTime() - 1);
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function getManaguaDateRange(preset: string, customStart?: string, customEnd?: string): DateRange {
  const todayStr = getManaguaTodayStr();
  
  switch (preset) {
    case 'hoy': {
      return {
        startDate: toManaguaStartOfDay(todayStr),
        endDate: toManaguaEndOfDay(todayStr)
      };
    }
    case 'ayer': {
      const today = new Date(`${todayStr}T00:00:00.000Z`);
      today.setUTCDate(today.getUTCDate() - 1);
      const yesterdayStr = today.toISOString().split('T')[0];
      return {
        startDate: toManaguaStartOfDay(yesterdayStr),
        endDate: toManaguaEndOfDay(yesterdayStr)
      };
    }
    case 'semana': {
      // 7 days ago until today
      const today = new Date(`${todayStr}T00:00:00.000Z`);
      today.setUTCDate(today.getUTCDate() - 6); // past 7 days including today
      const weekAgoStr = today.toISOString().split('T')[0];
      return {
        startDate: toManaguaStartOfDay(weekAgoStr),
        endDate: toManaguaEndOfDay(todayStr)
      };
    }
    case 'mes': {
      // Start of current month until today
      const m = getManaguaNow();
      const startOfMonthStr = `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}-01`;
      return {
        startDate: toManaguaStartOfDay(startOfMonthStr),
        endDate: toManaguaEndOfDay(todayStr)
      };
    }
    case 'custom': {
      if (customStart && customEnd) {
        return {
          startDate: toManaguaStartOfDay(customStart),
          endDate: toManaguaEndOfDay(customEnd)
        };
      }
      // Fallback to today if custom is selected but dates are missing
      return {
        startDate: toManaguaStartOfDay(todayStr),
        endDate: toManaguaEndOfDay(todayStr)
      };
    }
    default: {
      return {
        startDate: toManaguaStartOfDay(todayStr),
        endDate: toManaguaEndOfDay(todayStr)
      };
    }
  }
}
