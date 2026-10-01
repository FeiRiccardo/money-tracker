/** Parses user-typed money into integer cents. Returns null when invalid. */
export function parseAmount(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export type NameResult = { ok: true; name: string } | { ok: false; reason: NameError };
export type NameError = 'empty' | 'tooLong' | 'pipe' | 'duplicate' | 'reserved';

export interface NameContext {
  /** Display names of the other live Categories of the same type. */
  existing: string[];
  /** Retired label names of the same type (their names stay reserved). */
  retired: string[];
}

export const MAX_CATEGORY_NAME = 30;

const fold = (s: string) => s.trim().toLowerCase();

export function validateCategoryName(name: string, ctx: NameContext): NameResult {
  const trimmed = name.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };
  if (trimmed.length > MAX_CATEGORY_NAME) return { ok: false, reason: 'tooLong' };
  if (trimmed.includes('|')) return { ok: false, reason: 'pipe' };
  if (ctx.existing.some((n) => fold(n) === fold(trimmed))) return { ok: false, reason: 'duplicate' };
  if (ctx.retired.some((n) => fold(n) === fold(trimmed))) return { ok: false, reason: 'reserved' };
  return { ok: true, name: trimmed };
}

/** Like `parseAmount` but allows a leading "-" and zero. Used for the Opening balance. */
export function parseSignedAmount(input: string): number | null {
  const match = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return match[1] === '-' && cents !== 0 ? -cents : cents;
}
