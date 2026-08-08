import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusCard } from './StatusCard.js';
import type { ConfigResponse } from '../../../shared/types/api';

const config: ConfigResponse = {
  configured: true,
  jiraBaseUrl: 'https://jira.example.com',
  releaseNoteField: 'customfield_10000',
};

describe('StatusCard', () => {
  it('renders the heading "Статус подключения"', () => {
    render(<StatusCard config={config} />);
    expect(screen.getByText('Статус подключения')).toBeInTheDocument();
  });

  it('shows green ✓ Подключено when connected and meets requirement', () => {
    render(
      <StatusCard
        config={config}
        connectionStatus={{ connected: true, jiraVersion: '9.5.0', meetsPatRequirement: true }}
      />,
    );
    // The badge text "✓ Подключено" is in a single span; use substring match for robustness.
    const badge = screen.getByText((content) => content.includes('Подключено'));
    expect(badge).toBeInTheDocument();
  });

  it('shows error hint when error is provided', () => {
    render(
      <StatusCard
        config={config}
        connectionStatus={{
          connected: false,
          meetsPatRequirement: false,
          error: { type: 'auth_failed', message: 'PAT невалиден', hint: 'Проверьте JIRA_PAT' },
        }}
      />,
    );
    expect(screen.getByText('PAT невалиден')).toBeInTheDocument();
    expect(screen.getByText('Проверьте JIRA_PAT')).toBeInTheDocument();
  });
});
