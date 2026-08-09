import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StatusPage } from './pages/StatusPage.js';
import { SelectPage } from './pages/SelectPage.js';
import { EditPage } from './pages/EditPage.js';
import { EditsProvider } from './context/EditsContext.js';

/**
 * Root app (CONTEXT.md D-30): React Router with routes / and /select.
 * EditsProvider wraps Routes so SelectPage, EditPage, and AppHeader share one
 * useSessionEdits instance (Phase 4).
 */
export function App() {
  return (
    <BrowserRouter>
      <EditsProvider>
        <Routes>
          <Route path="/" element={<StatusPage />} />
          <Route path="/select" element={<SelectPage />} />
          <Route path="/edit/:key" element={<EditPage />} />
        </Routes>
      </EditsProvider>
    </BrowserRouter>
  );
}
