import { useState, useEffect, useCallback } from 'react';

/**
 * useSessionOverrides — per-tab manual group-override choices (Phase 14, OVRD-02 storage half).
 *
 * Structural mirror of useSessionEdits.ts (the proven Phase 4 sessionStorage pattern,
 * locked storage decision): one overrides map { [issueKey]: componentName } persisted to
 * sessionStorage under the schema-versioned key 'rn-overrides-v1'. An ABSENT key = default
 * (v1.2 last-wins);
 * picking «По умолчанию» deletes the key. Writes are debounced (300ms, D-14 mirror).
 * Corrupt JSON or a private-mode quota error never throws — the hook degrades to an
 * empty map and silently skips writes (T-14-01 mitigation).
 */
const STORAGE_KEY = 'rn-overrides-v1';

export type OverridesMap = Record<string, string>;

/** Read overrides from sessionStorage. Corrupt JSON / unavailable storage → {}. */
function readOverrides(): OverridesMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as OverridesMap;
    }
    return {};
  } catch {
    return {};
  }
}

export interface OverridesApi {
  overrides: OverridesMap;
  setOverride: (key: string, componentName: string) => void;
  resetOverride: (key: string) => void;
  wipeAll: () => void;
  hasOverrides: boolean;
}

export function useSessionOverrides(): OverridesApi {
  const [overrides, setOverrides] = useState<OverridesMap>(() => readOverrides());

  // Debounced write (300ms, D-14 mirror). Private mode / quota overflow is swallowed.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      } catch {
        /* quota exceeded / private mode / disabled storage — skip silently */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [overrides]);

  const setOverride = useCallback((key: string, componentName: string) => {
    setOverrides((prev) => ({ ...prev, [key]: componentName }));
  }, []);

  const resetOverride = useCallback((key: string) => {
    // Delete-key semantics: an absent key IS the default — the map never carries '' values.
    setOverrides((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const wipeAll = useCallback(() => {
    setOverrides({});
  }, []);

  return {
    overrides,
    setOverride,
    resetOverride,
    wipeAll,
    hasOverrides: Object.keys(overrides).length > 0,
  };
}
