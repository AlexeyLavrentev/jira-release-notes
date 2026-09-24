import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { OverridesProvider, useOverrides } from './OverridesContext.js';

/**
 * Probe component that exposes the overrides API to the test via a callback ref,
 * so the test can drive setOverride/resetOverride/wipeAll through the real provider.
 * (Structural mirror of EditsContext.test.tsx.)
 */
function Probe({ apiRef }: { apiRef: React.MutableRefObject<ReturnType<typeof useOverrides> | null> }) {
  const api = useOverrides();
  apiRef.current = api;
  return null;
}

function renderProvider() {
  const apiRef: React.MutableRefObject<ReturnType<typeof useOverrides> | null> = { current: null };
  const utils = render(
    <OverridesProvider>
      <Probe apiRef={apiRef} />
    </OverridesProvider>,
  );
  return { ...utils, apiRef };
}

describe('OverridesContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('two consumers under one provider share one instance (A setOverride → B sees it)', () => {
    function Consumer({ id }: { id: string }) {
      const { overrides, setOverride } = useOverrides();
      return (
        <div>
          <span data-testid={`${id}-map`}>{JSON.stringify(overrides)}</span>
          <button onClick={() => setOverride('PROJ-1', 'Alpha')}>{id}-set</button>
        </div>
      );
    }
    render(
      <OverridesProvider>
        <Consumer id="a" />
        <Consumer id="b" />
      </OverridesProvider>,
    );
    fireEvent.click(screen.getByText('a-set'));
    // Consumer B re-renders with the map consumer A wrote — one shared instance.
    expect(screen.getByTestId('b-map').textContent).toBe('{"PROJ-1":"Alpha"}');
    expect(screen.getByTestId('a-map').textContent).toBe('{"PROJ-1":"Alpha"}');
  });

  it('throws when useOverrides is used outside OverridesProvider', () => {
    function Orphan() {
      useOverrides();
      return null;
    }
    // Suppress the expected console.error from React's error boundary logging
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useOverrides must be used within OverridesProvider');
    errSpy.mockRestore();
  });

  it('adds a beforeunload listener when overrides appear (hasOverrides false→true)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { apiRef } = renderProvider();
    act(() => apiRef.current!.setOverride('PROJ-1', 'Alpha'));
    act(() => vi.advanceTimersByTime(300));
    const calls = addSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain('beforeunload');
  });

  it('removes the beforeunload listener when overrides clear (resetOverride back to empty)', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { apiRef } = renderProvider();
    act(() => apiRef.current!.setOverride('PROJ-1', 'Alpha'));
    act(() => vi.advanceTimersByTime(300));

    act(() => apiRef.current!.resetOverride('PROJ-1'));
    act(() => vi.advanceTimersByTime(300));
    const calls = removeSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain('beforeunload');
  });

  it('handler calls preventDefault and sets returnValue (Chrome-compatible)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { apiRef } = renderProvider();
    act(() => apiRef.current!.setOverride('PROJ-1', 'Alpha'));
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
});
