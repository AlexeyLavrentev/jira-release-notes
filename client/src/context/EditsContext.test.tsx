import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { EditsProvider, useEdits } from './EditsContext.js';

/**
 * Probe component that exposes the edits API to the test via a callback ref,
 * so the test can drive setEdit/resetEdit/wipeAll through the real provider.
 */
function Probe({ apiRef }: { apiRef: React.MutableRefObject<ReturnType<typeof useEdits> | null> }) {
  const api = useEdits();
  apiRef.current = api;
  return null;
}

function renderProvider() {
  const apiRef: React.MutableRefObject<ReturnType<typeof useEdits> | null> = { current: null };
  const utils = render(
    <EditsProvider>
      <Probe apiRef={apiRef} />
    </EditsProvider>,
  );
  return { ...utils, apiRef };
}

describe('EditsContext beforeunload lifecycle', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('adds a beforeunload listener when edits appear (hasEdits false→true)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { apiRef } = renderProvider();
    act(() => apiRef.current!.setEdit('PROJ-1', 'x'));
    act(() => vi.advanceTimersByTime(300));
    const calls = addSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain('beforeunload');
  });

  it('removes the beforeunload listener when edits clear (resetEdit back to empty)', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { apiRef } = renderProvider();
    act(() => apiRef.current!.setEdit('PROJ-1', 'x'));
    act(() => vi.advanceTimersByTime(300));

    act(() => apiRef.current!.resetEdit('PROJ-1'));
    act(() => vi.advanceTimersByTime(300));
    const calls = removeSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain('beforeunload');
  });

  it('handler calls preventDefault and sets returnValue (Chrome-compatible)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { apiRef } = renderProvider();
    act(() => apiRef.current!.setEdit('PROJ-1', 'x'));
    act(() => vi.advanceTimersByTime(300));

    // Find the beforeunload handler captured by the spy
    const buCall = addSpy.mock.calls.find((c) => c[0] === 'beforeunload');
    expect(buCall).toBeDefined();
    const handler = buCall![1] as (e: BeforeUnloadEvent) => void;

    // The beforeunload contract: assigning returnValue (any value, incl. '') triggers the
    // native dialog; preventDefault() is the cross-browser signal. We verify both are invoked.
    const preventDefault = vi.fn();
    let returnValueAssigned = false;
    const fakeEvent = {
      preventDefault,
      set returnValue(_v: string) {
        returnValueAssigned = true;
      },
      get returnValue() {
        return '';
      },
    } as unknown as BeforeUnloadEvent;
    handler(fakeEvent);
    expect(preventDefault).toHaveBeenCalled();
    expect(returnValueAssigned).toBe(true);
  });

  it('wipeAll removes the beforeunload listener', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { apiRef } = renderProvider();
    act(() => apiRef.current!.setEdit('PROJ-1', 'a'));
    act(() => apiRef.current!.setEdit('PROJ-2', 'b'));
    act(() => vi.advanceTimersByTime(300));

    act(() => apiRef.current!.wipeAll());
    act(() => vi.advanceTimersByTime(300));
    const calls = removeSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain('beforeunload');
  });

  it('throws when useEdits is used outside EditsProvider', () => {
    function Orphan() {
      useEdits();
      return null;
    }
    // Suppress the expected console.error from React's error boundary logging
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useEdits must be used within EditsProvider');
    errSpy.mockRestore();
  });
});
