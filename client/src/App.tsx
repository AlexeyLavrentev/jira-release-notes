import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StatusPage } from './pages/StatusPage.js';
import { SelectPage } from './pages/SelectPage.js';
import { EditPage } from './pages/EditPage.js';
import { ExportPage } from './pages/ExportPage.js';
import { EditsProvider } from './context/EditsContext.js';
import { ValidationProvider } from './context/ValidationContext.js';

/**
 * Root app (CONTEXT.md D-30): React Router with routes / and /select.
 * EditsProvider wraps Routes so SelectPage, EditPage, ExportPage, and AppHeader share one
 * useSessionEdits instance (Phase 4 / Phase 5 D-37).
 * ValidationProvider (Phase 10 D-08) wraps EditsProvider so all routes share one createValidation
 * factory bound to the configured shortThreshold (CONF-01). Outermost because EditsContext
 * consumers are a superset that may also need validation.
 */
export function App() {
  return (
    <BrowserRouter>
      <ValidationProvider>
        <EditsProvider>
          <Routes>
            <Route path="/" element={<StatusPage />} />
            <Route path="/select" element={<SelectPage />} />
            <Route path="/edit/:key" element={<EditPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </EditsProvider>
      </ValidationProvider>
    </BrowserRouter>
  );
}
