import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionEdits } from './useSessionEdits.js';

describe('useSessionEdits', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes empty with no prior storage (hasEdits false)', () => {
    const { result } = renderHook(() => useSessionEdits());
    expect(result.current.edits).toEqual({});
    expect(result.current.hasEdits).toBe(false);
  });

  it('roundtrips an edit through sessionStorage across remount (EDIT-03)', () => {
    const { result, unmount } = renderHook(() => useSessionEdits());
    act(() => result.current.setEdit('PROJ-1', 'edited text'));
    // Flush the 300ms debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    unmount();

    // Fresh hook reads back the persisted edit
    const { result: result2 } = renderHook(() => useSessionEdits());
    expect(result2.current.edits['PROJ-1']).toBe('edited text');
    expect(result2.current.hasEdits).toBe(true);
  });

  it('resetEdit removes a key and clears hasEdits when the map empties', () => {
    const { result } = renderHook(() => useSessionEdits());
    act(() => result.current.setEdit('PROJ-1', 'x'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.hasEdits).toBe(true);

    act(() => result.current.resetEdit('PROJ-1'));
    act(() => vi.advanceTimersByTime(300));
    expect('PROJ-1' in result.current.edits).toBe(false);
    expect(result.current.hasEdits).toBe(false);
  });

  it('wipeAll empties the map', () => {
    const { result } = renderHook(() => useSessionEdits());
    act(() => result.current.setEdit('PROJ-1', 'a'));
    act(() => result.current.setEdit('PROJ-2', 'b'));
    act(() => vi.advanceTimersByTime(300));

    act(() => result.current.wipeAll());
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.edits).toEqual({});
    expect(result.current.hasEdits).toBe(false);
  });

  it('survives corrupt JSON in storage without throwing', () => {
    sessionStorage.setItem('rn-edits-v1', '{not json');
    const { result } = renderHook(() => useSessionEdits());
    expect(result.current.edits).toEqual({});
    expect(result.current.hasEdits).toBe(false);
  });

  it('ignores non-object JSON (array / primitive) gracefully', () => {
    sessionStorage.setItem('rn-edits-v1', '["not","an","object"]');
    const { result } = renderHook(() => useSessionEdits());
    expect(result.current.edits).toEqual({});
  });
});
