import { createContext, useContext, useEffect } from 'react';
import { useSessionEdits, type EditsApi } from '../hooks/useSessionEdits.js';

/**
 * EditsContext (RESEARCH §2 recommendation A): a SINGLE useSessionEdits instance
 * shared app-wide via context. Without this every consumer (SelectPage rows,
 * EditPage, AppHeader) would get its own useState and drafts would diverge.
 */
const EditsContext = createContext<EditsApi | null>(null);

export function EditsProvider({ children }: { children: React.ReactNode }) {
  const editsApi = useSessionEdits();

  // Conditional beforeunload listener (D-16, EDIT-04): added ONLY when the edits map is
  // non-empty, removed (via cleanup) when it empties again. Lives at the provider level so it's
  // active app-wide whenever edits exist — not just on /edit.
  useEffect(() => {
    if (!editsApi.hasEdits) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue set (truthy)
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editsApi.hasEdits]);

  return <EditsContext.Provider value={editsApi}>{children}</EditsContext.Provider>;
}

export function useEdits(): EditsApi {
  const ctx = useContext(EditsContext);
  if (!ctx) {
    throw new Error('useEdits must be used within EditsProvider');
  }
  return ctx;
}

export type { EditsApi };
