import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from './Dialog';

function DialogHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Dialog
          title="Keyboard friendly"
          description="A dialog accessibility test."
          onClose={() => {
            setOpen(false);
            onClose();
          }}
        >
          <input aria-label="Example input" />
          <button type="button">Last action</button>
        </Dialog>
      )}
    </>
  );
}

describe('Dialog', () => {
  it('traps focus, closes with Escape, and restores the opener', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);

    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    const close = screen.getByRole('button', { name: 'Close dialog' });
    await waitFor(() => expect(close).toHaveFocus());

    const backwardsTab = createEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    fireEvent(close, backwardsTab);
    expect(backwardsTab.defaultPrevented).toBe(true);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
  });
});
