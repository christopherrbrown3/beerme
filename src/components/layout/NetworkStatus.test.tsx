import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { NetworkStatus } from './NetworkStatus';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

describe('NetworkStatus', () => {
  afterEach(() => setOnline(true));

  it('announces an offline connection and clears when connectivity returns', () => {
    setOnline(false);
    render(<NetworkStatus />);
    expect(screen.getByRole('status')).toHaveTextContent('You’re offline.');

    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
