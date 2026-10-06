import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { usePlayerKeyboardShortcuts } from './usePlayerKeyboardShortcuts';

function renderShortcuts(enabled = true) {
  const actions = {
    togglePlay: vi.fn(),
    seekBy: vi.fn(),
    toggleMute: vi.fn(),
    requestFullscreen: vi.fn(),
  };
  renderHook(() => usePlayerKeyboardShortcuts(actions, enabled));
  return actions;
}

describe('usePlayerKeyboardShortcuts', () => {
  it('maps Space, arrows, M, and F to the right action', async () => {
    const user = userEvent.setup();
    const actions = renderShortcuts();

    await user.keyboard(' ');
    expect(actions.togglePlay).toHaveBeenCalledOnce();

    await user.keyboard('{ArrowLeft}');
    expect(actions.seekBy).toHaveBeenCalledWith(-5);

    await user.keyboard('{ArrowRight}');
    expect(actions.seekBy).toHaveBeenCalledWith(5);

    await user.keyboard('m');
    expect(actions.toggleMute).toHaveBeenCalledOnce();

    await user.keyboard('f');
    expect(actions.requestFullscreen).toHaveBeenCalledOnce();
  });

  it('does nothing when disabled', async () => {
    const user = userEvent.setup();
    const actions = renderShortcuts(false);

    await user.keyboard(' ');

    expect(actions.togglePlay).not.toHaveBeenCalled();
  });

  it('ignores keystrokes while typing in a text field, so a future notes textarea stays safe', async () => {
    const user = userEvent.setup();
    const actions = renderShortcuts();

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    await user.keyboard(' ');

    expect(actions.togglePlay).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
