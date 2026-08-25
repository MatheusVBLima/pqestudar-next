import { Period } from './PeriodSelector';

/**
 * Converts a Period selection into start_at / end_at timestamps.
 * "all" → both null (no filter).
 */
export function periodToRange(period: Period): { start_at: string | null; end_at: string | null } {
  if (period === 'all') return { start_at: null, end_at: null };

  const now = new Date();
  const end_at = now.toISOString();
  let start: Date;

  switch (period) {
    case 'day':
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      return { start_at: null, end_at: null };
  }

  return { start_at: start.toISOString(), end_at };
}

export function previousPeriodRange(range: { start_at: string | null; end_at: string | null }) {
  if (!range.start_at || !range.end_at) return null;

  const start = new Date(range.start_at).getTime();
  const end = new Date(range.end_at).getTime();
  const duration = end - start;

  return {
    start_at: new Date(start - duration).toISOString(),
    end_at: new Date(start).toISOString(),
  };
}
