import { X } from 'lucide-react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PropsWithChildren,
  useEffect,
  useId,
  useRef,
} from 'react';

type DialogProps = PropsWithChildren<{
  title: string;
  description: string;
  onClose: () => void;
}>;

export function Dialog({ title, description, onClose, children }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTarget = dialogRef.current?.querySelector<HTMLElement>(
      '[autofocus], button, input, select, textarea, a[href]',
    );
    focusTarget?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
      ),
    ).filter((element) => element.tabIndex >= 0 && !element.hidden);
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="dialog-backdrop">
      <button
        className="dialog-backdrop__dismiss"
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      {/* The dialog container owns the keyboard focus loop for all controls inside it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={dialogRef}
        className="dialog-card"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={trapFocus}
      >
        <button className="dialog-card__close" type="button" onClick={onClose}>
          <X size={19} aria-hidden="true" />
          <span className="sr-only">Close dialog</span>
        </button>
        <p className="eyebrow">Your crew</p>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId} className="dialog-card__description">
          {description}
        </p>
        {children}
      </div>
    </div>
  );
}
