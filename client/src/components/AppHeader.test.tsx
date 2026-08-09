import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EditsProvider } from '../context/EditsContext.js';
import { AppHeader } from './AppHeader.js';
import * as useConnectionStatusMod from '../hooks/useConnectionStatus.js';

function renderHeader(seedEdits?: Record<string, string>) {
  if (seedEdits) {
    sessionStorage.setItem('rn-edits-v1', JSON.stringify(seedEdits));
  }
  return render(
    <MemoryRouter>
      <EditsProvider>
        <AppHeader />
      </EditsProvider>
    </MemoryRouter>,
  );
}

describe('AppHeader edits badge', () => {
  beforeEach(() => {
    sessionStorage.clear();
    // Connection status defaults to "connected" so the header renders cleanly.
    vi.spyOn(useConnectionStatusMod, 'useConnectionStatus').mockReturnValue({
      connectionStatus: { connected: true, meetsPatRequirement: true, jiraVersion: '9.5.0' },
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('does not render the badge when there are no edits', () => {
    renderHeader();
    expect(screen.queryByText(/с правками/)).not.toBeInTheDocument();
  });

  it('renders «N с правками» badge with the correct count when edits exist (D-21)', () => {
    renderHeader({ 'PROJ-1': 'a', 'PROJ-2': 'b' });
    expect(screen.getByText('2 с правками')).toBeInTheDocument();
  });

  it('renders the «Очистить все правки» control when edits exist (D-18)', () => {
    renderHeader({ 'PROJ-1': 'a' });
    expect(screen.getByLabelText('Очистить все правки')).toBeInTheDocument();
  });

  it('wipe clears the badge after confirm (D-18 wipe-all)', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderHeader({ 'PROJ-1': 'a' });
    fireEvent.click(screen.getByLabelText('Очистить все правки'));
    expect(confirmSpy).toHaveBeenCalledWith('Удалить все правки?');
    // wipeAll() updates React state immediately (hasEdits flips to false) — the badge is gone
    // even though the debounced sessionStorage write hasn't flushed.
    expect(screen.queryByText(/с правками/)).not.toBeInTheDocument();
  });
});
