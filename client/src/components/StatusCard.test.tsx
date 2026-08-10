import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatusCard } from './StatusCard.js';
import type { ConfigResponse } from '../../../shared/types/api';

const config: ConfigResponse = {
  configured: true,
  jiraBaseUrl: 'https://jira.example.com',
  releaseNoteField: 'customfield_10000',
};

// StatusCard now renders a <Link to="/select"> CTA when connected (D-12), so every render needs
// a Router context — wrap in MemoryRouter (the standard react-router testing pattern).
describe('StatusCard', () => {
  it('renders the heading "Статус подключения"', () => {
    render(
      <MemoryRouter>
        <StatusCard config={config} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Статус подключения')).toBeInTheDocument();
  });

  it('shows green ✓ Подключено when connected and meets requirement', () => {
    render(
      <MemoryRouter>
        <StatusCard
          config={config}
          connectionStatus={{ connected: true, jiraVersion: '9.5.0', meetsPatRequirement: true }}
        />
      </MemoryRouter>,
    );
    // The badge text "✓ Подключено" is in a single span; use substring match for robustness.
    const badge = screen.getByText((content) => content.includes('Подключено'));
    expect(badge).toBeInTheDocument();
  });

  it('shows the «К задачам» CTA linking to /select when connected and meets requirement (D-12)', () => {
    render(
      <MemoryRouter>
        <StatusCard
          config={config}
          connectionStatus={{ connected: true, jiraVersion: '9.5.0', meetsPatRequirement: true }}
        />
      </MemoryRouter>,
    );
    const cta = screen.getByRole('link', { name: 'Перейти к задачам' });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/select');
    expect(cta.textContent).toBe('К задачам');
  });

  it('does NOT show the «К задачам» CTA when not connected (D-12 gating)', () => {
    render(
      <MemoryRouter>
        <StatusCard
          config={config}
          connectionStatus={{ connected: false, meetsPatRequirement: false }}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: 'Перейти к задачам' })).not.toBeInTheDocument();
  });

  it('shows error hint when error is provided', () => {
    render(
      <MemoryRouter>
        <StatusCard
          config={config}
          connectionStatus={{
            connected: false,
            meetsPatRequirement: false,
            error: { type: 'auth_failed', message: 'PAT невалиден', hint: 'Проверьте JIRA_PAT' },
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('PAT невалиден')).toBeInTheDocument();
    expect(screen.getByText('Проверьте JIRA_PAT')).toBeInTheDocument();
  });
});
