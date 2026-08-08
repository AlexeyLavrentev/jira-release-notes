import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StatusPage } from './pages/StatusPage.js';

/**
 * Root app (CONTEXT.md D-30): React Router with one route `/` → StatusPage.
 * Structure ready to add /select, /edit, /export in later phases.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StatusPage />} />
      </Routes>
    </BrowserRouter>
  );
}
