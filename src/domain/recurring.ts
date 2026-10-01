import type { RecurringRule } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** The n-th occurrence (0 = the start date) of a rule. */
function occurrence(rule: RecurringRule, n: number): string {
  const [year, month, day] = rule.startDate.split('-').map(Number) as [number, number, number];
  if (rule.frequency === 'weekly') {
    const d = new Date(Date.UTC(year, month - 1, day + 7 * n));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const total = year * 12 + (month - 1) + (rule.frequency === 'yearly' ? 12 * n : n);
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
}

export interface DueResult {
  /** Occurrences to create now, oldest first. */
  dates: string[];
  /** The next occurrence after those. */
  nextDate: string;
}

/** Which occurrences of a rule are due on `today`, including any missed since `rule.nextDate`. */
export function dueOccurrences(rule: RecurringRule, today: string): DueResult {
  let n = 0;
  while (occurrence(rule, n) < rule.nextDate) n++;
  const dates: string[] = [];
  const limit = rule.endDate !== null && rule.endDate < today ? rule.endDate : today;
  while (occurrence(rule, n) <= limit) dates.push(occurrence(rule, n++));
  return { dates, nextDate: occurrence(rule, n) };
}
