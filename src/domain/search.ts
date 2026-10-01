import { parseAmount } from './rules';
import type { Category, LedgerData, SortOrder, Transaction, TxType } from './types';

export interface SearchQuery {
  text: string;
  type: 'all' | TxType;
  /** Category filter keys: `c:<id>` for a live Category, `r:<name>` for a Retired label. */
  categories: string[];
  /** Inclusive date range, YYYY-MM-DD. */
  from: string | null;
  to: string | null;
  sort: SortOrder;
}

export const EMPTY_QUERY: SearchQuery = { text: '', type: 'all', categories: [], from: null, to: null, sort: 'newest' };

export interface SearchResult {
  transactions: Transaction[];
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

const recordedAt = (t: Transaction) => t.createdAt ?? 0;

/** Orders a copy of the list. Dates tie-break on when each was recorded; amounts on date. */
export function sortTransactions(list: Transaction[], order: SortOrder): Transaction[] {
  const newest = (a: Transaction, b: Transaction) =>
    b.date.localeCompare(a.date) || recordedAt(b) - recordedAt(a) || b.id.localeCompare(a.id);
  const compare: Record<SortOrder, (a: Transaction, b: Transaction) => number> = {
    newest,
    oldest: (a, b) => newest(b, a),
    largest: (a, b) => b.cents - a.cents || newest(a, b),
    smallest: (a, b) => a.cents - b.cents || newest(a, b),
  };
  return [...list].sort(compare[order]);
}

/** Lower case, accents removed, so "CAFFE" finds "Caffè". */
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function searchTransactions(
  data: LedgerData,
  query: SearchQuery,
  nameOf: (category: Category) => string,
): SearchResult {
  const byId = new Map(data.categories.map((c) => [c.id, c]));
  const words = fold(query.text).split(/\s+/).filter(Boolean);
  const haystack = (t: Transaction) =>
    fold([t.note, ...t.categoryIds.flatMap((id) => (byId.has(id) ? [nameOf(byId.get(id)!)] : [])), ...t.retired].join(' '));
  const amount = parseAmount(query.text);
  const wanted = new Set(query.categories);
  const matchesText = (t: Transaction) => {
    const text = haystack(t);
    return words.every((w) => text.includes(w)) || (amount !== null && t.cents === amount);
  };
  const matchesCategories = (t: Transaction) =>
    wanted.size === 0 || t.categoryIds.some((id) => wanted.has('c:' + id)) || t.retired.some((name) => wanted.has('r:' + name));
  const matches = (t: Transaction) =>
    (query.type === 'all' || t.type === query.type) &&
    matchesCategories(t) &&
    (query.from === null || t.date >= query.from) &&
    (query.to === null || t.date <= query.to) &&
    matchesText(t);

  const transactions = sortTransactions(data.transactions.filter(matches), query.sort);
  let incomeCents = 0;
  let expenseCents = 0;
  for (const t of transactions) {
    if (t.type === 'income') incomeCents += t.cents;
    else expenseCents += t.cents;
  }
  return { transactions, incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}
