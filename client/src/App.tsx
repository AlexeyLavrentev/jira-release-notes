import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StatusPage } from './pages/StatusPage.js';
import { SelectPage } from './pages/SelectPage.js';

/**
 * Root app (CONTEXT.md D-30): React Router with routes / and /select.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StatusPage />} />
        <Route path="/select" element={<SelectPage />} />
      </Routes>
    </BrowserRouter>
  );
}
