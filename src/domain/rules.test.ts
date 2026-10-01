import { describe, expect, it } from 'vitest';
import { parseAmount, parseSignedAmount, validateCategoryName } from './rules';

const ctx = { existing: [] as string[], retired: [] as string[] };

describe('validateCategoryName', () => {
  it('accepts a name and returns it trimmed', () => {
    expect(validateCategoryName('  Gym  ', ctx)).toEqual({ ok: true, name: 'Gym' });
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(validateCategoryName('   ', ctx)).toEqual({ ok: false, reason: 'empty' });
  });

  it('allows exactly 30 characters but rejects 31', () => {
    expect(validateCategoryName('a'.repeat(30), ctx).ok).toBe(true);
    expect(validateCategoryName('a'.repeat(31), ctx)).toEqual({ ok: false, reason: 'tooLong' });
  });

  it('rejects a name already used by another Category, ignoring case and spacing', () => {
    const withGroceries = { existing: ['Groceries'], retired: [] };
    expect(validateCategoryName(' groceries ', withGroceries)).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('rejects a name reserved by a Retired label', () => {
    const withGym = { existing: [], retired: ['Gym'] };
    expect(validateCategoryName('GYM', withGym)).toEqual({ ok: false, reason: 'reserved' });
  });

  it('rejects the "|" character, which separates Categories in the CSV', () => {
    expect(validateCategoryName('Food|Drink', ctx)).toEqual({ ok: false, reason: 'pipe' });
  });
});

describe('parseAmount', () => {
  it('accepts a comma as the decimal separator and returns cents', () => {
    expect(parseAmount('12,5')).toBe(1250);
  });

  it('accepts a dot and gives the same cents as the comma form', () => {
    expect(parseAmount('12.50')).toBe(1250);
    expect(parseAmount(' 0,99 ')).toBe(99);
  });

  it.each(['', '0', '0,00', '-5', '1.234', '12,345', 'abc', '1e3', '1,2,3', '12.', '€5'])(
    'rejects %j',
    (input) => {
      expect(parseAmount(input)).toBeNull();
    },
  );
});

describe('parseSignedAmount (the opening balance)', () => {
  it.each([
    ['1200', 120000],
    ['-50,5', -5050],
    ['-50.50', -5050],
    ['0', 0],
    ['0,00', 0],
    [' 12,3 ', 1230],
  ])('reads %j as %i cents', (input, cents) => {
    expect(parseSignedAmount(input)).toBe(cents);
  });

  it.each(['', '-', '+5', '1.234', '--5', 'abc', '1,2,3', '€5'])('rejects %j', (input) => {
    expect(parseSignedAmount(input)).toBeNull();
  });

  it('never returns negative zero', () => {
    expect(Object.is(parseSignedAmount('-0'), 0)).toBe(true);
  });
});
