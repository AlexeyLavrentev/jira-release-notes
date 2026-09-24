import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionOverrides } from './useSessionOverrides.js';

describe('useSessionOverrides', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes an override through the 300ms debounce into rn-overrides-v1', () => {
    const { result } = renderHook(() => useSessionOverrides());
    // The map updates immediately (controlled select reads it on the next render)...
    act(() => result.current.setOverride('P-1', 'Alpha'));
    expect(result.current.overrides['P-1']).toBe('Alpha');
    // ...and lands in sessionStorage once the debounce fires (OVRD-02 storage half).
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(JSON.parse(sessionStorage.getItem('rn-overrides-v1') ?? 'null')).toEqual({ 'P-1': 'Alpha' });
  });

  it('reads back a persisted map on mount (F5 survival, OVRD-02)', () => {
    sessionStorage.setItem('rn-overrides-v1', JSON.stringify({ 'P-2': 'Beta' }));
    const { result } = renderHook(() => useSessionOverrides());
    expect(result.current.overrides).toEqual({ 'P-2': 'Beta' });
    expect(result.current.hasOverrides).toBe(true);
  });

  it('resetOverride removes only the target key (others preserved)', () => {
    const { result } = renderHook(() => useSessionOverrides());
    act(() => result.current.setOverride('P-1', 'Alpha'));
    act(() => result.current.setOverride('P-2', 'Beta'));
    act(() => vi.advanceTimersByTime(300));

    act(() => result.current.resetOverride('P-1'));
    act(() => vi.advanceTimersByTime(300));
    expect('P-1' in result.current.overrides).toBe(false);
    expect(result.current.overrides['P-2']).toBe('Beta');
    expect(result.current.hasOverrides).toBe(true);
  });

  it('wipeAll empties the map and flips hasOverrides false', () => {
    const { result } = renderHook(() => useSessionOverrides());
    act(() => result.current.setOverride('P-1', 'a'));
    act(() => result.current.setOverride('P-2', 'b'));
    act(() => vi.advanceTimersByTime(300));

    act(() => result.current.wipeAll());
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.overrides).toEqual({});
    expect(result.current.hasOverrides).toBe(false);
  });

  it('survives corrupt JSON in storage without throwing (initial {})', () => {
    sessionStorage.setItem('rn-overrides-v1', 'not-json{');
    const { result } = renderHook(() => useSessionOverrides());
    expect(result.current.overrides).toEqual({});
    expect(result.current.hasOverrides).toBe(false);
  });

  it('swallows a throwing sessionStorage.setItem (quota / private mode)', () => {
    // jsdom defines setItem on Storage.prototype — the spy must hook the prototype or the
    // hook's calls bypass it entirely.
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const { result } = renderHook(() => useSessionOverrides());
    expect(() => {
      act(() => result.current.setOverride('P-1', 'Alpha'));
      act(() => vi.advanceTimersByTime(300));
    }).not.toThrow();
    // The write was attempted (and swallowed) — in-memory state is unaffected.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.current.overrides['P-1']).toBe('Alpha');
    spy.mockRestore();
  });

  it('coalesces two rapid setOverride calls into one storage write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useSessionOverrides());
    act(() => result.current.setOverride('P-1', 'Alpha'));
    act(() => result.current.setOverride('P-2', 'Beta'));
    act(() => vi.advanceTimersByTime(300));
    // One debounced write carries the final map (useSessionEdits coalescing mirror).
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem('rn-overrides-v1') ?? 'null')).toEqual({
      'P-1': 'Alpha',
      'P-2': 'Beta',
    });
    spy.mockRestore();
  });
});
