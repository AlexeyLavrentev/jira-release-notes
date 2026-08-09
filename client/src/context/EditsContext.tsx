import { createContext, useContext } from 'react';
import { useSessionEdits, type EditsApi } from '../hooks/useSessionEdits.js';

/**
 * EditsContext (RESEARCH §2 recommendation A): a SINGLE useSessionEdits instance
 * shared app-wide via context. Without this every consumer (SelectPage rows,
 * EditPage, AppHeader) would get its own useState and drafts would diverge.
 */
const EditsContext = createContext<EditsApi | null>(null);

export function EditsProvider({ children }: { children: React.ReactNode }) {
  const editsApi = useSessionEdits();
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
