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
});
