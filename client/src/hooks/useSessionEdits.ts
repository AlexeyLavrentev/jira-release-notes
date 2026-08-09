import { useState, useEffect, useCallback } from 'react';

/**
 * useSessionEdits — per-tab draft edits for release notes (Phase 4, D-13/D-14/D-15).
 *
 * One edits map { [issueKey]: text } persisted to sessionStorage under a
 * schema-versioned key. Writes are debounced (D-14, 300ms). Corrupt JSON or a
 * private-mode quota error never throws — the hook degrades to an empty map
 * and silently skips writes (RESEARCH §2).
 */
const STORAGE_KEY = 'rn-edits-v1';

type EditsMap = Record<string, string>;

/** Read edits from sessionStorage. Corrupt JSON / unavailable storage → {}. */
function readEdits(): EditsMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as EditsMap;
    }
    return {};
  } catch {
    return {};
  }
}

export interface EditsApi {
  edits: EditsMap;
  setEdit: (key: string, text: string) => void;
  resetEdit: (key: string) => void;
  wipeAll: () => void;
  hasEdits: boolean;
}

export function useSessionEdits(): EditsApi {
  const [edits, setEdits] = useState<EditsMap>(() => readEdits());

  // Debounced write (D-14, 300ms). Private mode / quota overflow is swallowed.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
      } catch {
        /* quota exceeded / private mode / disabled storage — skip silently */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [edits]);

  const setEdit = useCallback((key: string, text: string) => {
    setEdits((prev) => ({ ...prev, [key]: text }));
  }, []);

  const resetEdit = useCallback((key: string) => {
    setEdits((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const wipeAll = useCallback(() => {
    setEdits({});
  }, []);

  return {
    edits,
    setEdit,
    resetEdit,
    wipeAll,
    hasEdits: Object.keys(edits).length > 0,
  };
}
