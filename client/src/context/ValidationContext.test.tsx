import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { act } from '@testing-library/react';
import type { ConfigResponse } from '../../../shared/types/api.js';

/**
 * ValidationContext (Phase 10 D-08) — contract tests mirroring EditsContext.test.tsx structurally.
 *
 * The provider wraps a createValidation(threshold) factory and re-creates it via useMemo when the
 * threshold from /api/config changes (D-14). useValidation() throws when rendered outside the
 * provider — the same fail-loud contract EditsContext uses.
 *
 * useConnectionStatus is mocked so the threshold can be controlled per-test (default-threshold
 * fallback vs. config-supplied threshold), without spinning up TanStack Query / network calls.
 */

// Mocked config holder — tests mutate `mockConfig` then (re)render. `null` simulates the
// pre-config first render (configQuery.data undefined → provider falls back to DEFAULT_THRESHOLD).
let mockConfig: ConfigResponse | null = null;

vi.mock('../hooks/useConnectionStatus.js', () => ({
  useConnectionStatus: () => ({ config: mockConfig ?? undefined }),
}));

import { ValidationProvider, useValidation } from './ValidationContext.js';
import type { ValidationApi } from '../lib/validation.js';

/**
 * Probe that captures the ValidationApi exposed by the provider via a ref, so tests can drive
 * validateReleaseNote directly against the real factory the provider constructed.
 */
function Probe({ apiRef }: { apiRef: React.MutableRefObject<ValidationApi | null> }) {
  const api = useValidation();
  apiRef.current = api;
  return null;
}

function renderProvider() {
  const apiRef: React.MutableRefObject<ValidationApi | null> = { current: null };
  const utils = render(
    <ValidationProvider>
      <Probe apiRef={apiRef} />
    </ValidationProvider>,
  );
  return { ...utils, apiRef };
}

describe('ValidationContext contract', () => {
  beforeEach(() => {
    mockConfig = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when useValidation is rendered outside ValidationProvider', () => {
    function Orphan() {
      useValidation();
      return null;
    }
    // Suppress the expected console.error from React's error boundary logging (mirrors
    // EditsContext.test.tsx:104-107).
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useValidation must be used within ValidationProvider');
    errSpy.mockRestore();
  });

  it('uses DEFAULT_THRESHOLD (15) when config is not yet available (pre-config first render, D-14)', () => {
    // mockConfig is null → useConnectionStatus returns { config: undefined } → provider falls back.
    const { apiRef } = renderProvider();
    expect(apiRef.current).not.toBeNull();
    // Boundary at 15: a 14-char note is short, a 15-char note is valid. DEFAULT_THRESHOLD preserved.
    expect(apiRef.current!.validateReleaseNote('x'.repeat(14))).toBe('short');
    expect(apiRef.current!.validateReleaseNote('x'.repeat(15))).toBe('valid');
  });

  it('re-creates the factory with threshold=5 when config.shortThreshold=5 (D-14 useMemo recompute)', () => {
    mockConfig = {
      configured: true,
      jiraBaseUrl: 'https://jira.example.com',
      releaseNoteField: 'customfield_10000',
      shortThreshold: 5,
    };
    const { apiRef } = renderProvider();
    expect(apiRef.current).not.toBeNull();
    // Clean threshold=5 boundary assertions (no arithmetic asides):
    //  - 'abcdef' (len 6 >= 5) is valid
    //  - 'abc' (len 3 < 5) is short
    expect(apiRef.current!.validateReleaseNote('abcdef')).toBe('valid');
    expect(apiRef.current!.validateReleaseNote('abc')).toBe('short');
  });

  it('swaps the factory when the config threshold changes after mount (useMemo dependency, D-14)', () => {
    // Start at the default (no config) — 14-char note is short.
    const { apiRef, rerender } = renderProvider();
    expect(apiRef.current!.validateReleaseNote('x'.repeat(14))).toBe('short');

    // Config arrives with shortThreshold=5 — the factory re-creates, the same 14-char note is now valid.
    mockConfig = {
      configured: true,
      jiraBaseUrl: 'https://jira.example.com',
      releaseNoteField: 'customfield_10000',
      shortThreshold: 5,
    };
    act(() => {
      rerender(
        <ValidationProvider>
          <Probe apiRef={apiRef} />
        </ValidationProvider>,
      );
    });
    expect(apiRef.current!.validateReleaseNote('x'.repeat(14))).toBe('valid');
  });
});
