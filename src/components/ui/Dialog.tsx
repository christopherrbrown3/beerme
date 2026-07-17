import { X } from 'lucide-react';
import { type PropsWithChildren, useEffect } from 'react';

type DialogProps = PropsWithChildren<{
  title: string;
  description: string;
  onClose: () => void;
}>;

export function Dialog({ title, description, onClose, children }: DialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-backdrop">
      <button className="dialog-backdrop__dismiss" type="button" onClick={onClose}>
        <span className="sr-only">Close dialog</span>
      </button>
      <section
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <button className="dialog-card__close" type="button" onClick={onClose}>
          <X size={19} aria-hidden="true" />
          <span className="sr-only">Close dialog</span>
        </button>
        <p className="eyebrow">Your crew</p>
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-description" className="dialog-card__description">
          {description}
        </p>
        {children}
      </section>
    </div>
  );
}
