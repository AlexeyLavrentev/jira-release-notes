import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { App } from './App.js';
import './index.css';

// TanStack Query (CONTEXT.md D-41): staleTime 0 (always fresh on load), retry 1.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system">
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
