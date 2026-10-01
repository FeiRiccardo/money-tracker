import { describe, expect, it } from 'vitest';
import { EMPTY_TOASTS, dismiss, expire, nextExpiry, pause, push, resume, type ToastState } from './toasts';

const NOW = 1_000_000;
const messages = (state: ToastState) => state.items.map((t) => t.message);

describe('push', () => {
  it('adds the newest toast last and lasts 3 s for a plain message, 6 s with an Undo or for an error', () => {
    let state = EMPTY_TOASTS;
    state = push(state, { kind: 'success', message: 'plain' }, NOW).state;
    state = push(state, { kind: 'success', message: 'with undo', actionLabel: 'Undo', onAction: () => {} }, NOW).state;
    state = push(state, { kind: 'error', message: 'oops' }, NOW).state;

    expect(messages(state)).toEqual(['plain', 'with undo', 'oops']);
    expect(state.items.map((t) => t.expiresAt)).toEqual([NOW + 3000, NOW + 6000, NOW + 6000]);
  });

  it('gives every toast its own id and returns it', () => {
    const first = push(EMPTY_TOASTS, { kind: 'info', message: 'a' }, NOW);
    const second = push(first.state, { kind: 'info', message: 'b' }, NOW);

    expect(first.id).not.toBe(second.id);
    expect(second.state.items.map((t) => t.id)).toEqual([first.id, second.id]);
  });
});

describe('the limit of three', () => {
  const plain = (message: string) => ({ kind: 'success' as const, message });
  const withUndo = (message: string) => ({ kind: 'success' as const, message, actionLabel: 'Undo', onAction: () => {} });
  const fill = (inputs: Array<ReturnType<typeof plain>>) =>
    inputs.reduce((state, input) => push(state, input, NOW).state, EMPTY_TOASTS);

  it('drops the oldest toast that has no Undo when a fourth arrives', () => {
    const state = push(fill([withUndo('delete'), plain('added'), plain('renamed')]), plain('saved'), NOW).state;

    expect(messages(state)).toEqual(['delete', 'renamed', 'saved']);
  });

  it('keeps toasts with an Undo as long as possible, and drops the oldest one only when all three have one', () => {
    const state = push(fill([withUndo('a'), withUndo('b'), withUndo('c')]), withUndo('d'), NOW).state;

    expect(messages(state)).toEqual(['b', 'c', 'd']);
  });

  it('never shows more than three, however many arrive', () => {
    const state = fill(Array.from({ length: 10 }, (_, i) => plain(`n${i}`)));

    expect(messages(state)).toEqual(['n7', 'n8', 'n9']);
  });
});

describe('expiry, dismiss and pause', () => {
  const build = () => {
    let state = EMPTY_TOASTS;
    const a = push(state, { kind: 'success', message: 'a' }, NOW); // gone at NOW + 3000
    const b = push(a.state, { kind: 'success', message: 'b', actionLabel: 'Undo', onAction: () => {} }, NOW + 1000); // NOW + 7000
    state = b.state;
    return { state, a: a.id, b: b.id };
  };

  it('expire removes exactly the toasts whose time has come', () => {
    const { state } = build();

    expect(messages(expire(state, NOW + 2999))).toEqual(['a', 'b']);
    expect(messages(expire(state, NOW + 3000))).toEqual(['b']);
    expect(messages(expire(state, NOW + 7000))).toEqual([]);
  });

  it('dismiss removes one toast by id and ignores an unknown id', () => {
    const { state, a } = build();

    expect(messages(dismiss(state, a))).toEqual(['b']);
    expect(messages(dismiss(state, 999))).toEqual(['a', 'b']);
  });

  it('a paused toast does not expire, and keeps its remaining time when resumed', () => {
    const { state, a } = build();

    const paused = pause(state, a, NOW + 2000); // 1000 ms were left
    expect(messages(expire(paused, NOW + 60_000))).toEqual(['a']); // b expired, the paused a stays

    const resumed = resume(paused, a, NOW + 10_000);
    expect(resumed.items.find((t) => t.id === a)!.expiresAt).toBe(NOW + 11_000);
  });

  it('nextExpiry is the earliest time anything will expire, or null when nothing will', () => {
    const { state, a, b } = build();

    expect(nextExpiry(state)).toBe(NOW + 3000);
    expect(nextExpiry(pause(state, a, NOW))).toBe(NOW + 7000);
    expect(nextExpiry(pause(pause(state, a, NOW), b, NOW))).toBeNull();
    expect(nextExpiry(EMPTY_TOASTS)).toBeNull();
  });
});
