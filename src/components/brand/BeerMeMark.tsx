import { Beer } from 'lucide-react';

type BeerMeMarkProps = {
  compact?: boolean;
};

export function BeerMeMark({ compact = false }: BeerMeMarkProps) {
  return (
    <div className="brand-mark" aria-label="BeerMe">
      <span className="brand-mark__icon" aria-hidden="true">
        <Beer size={compact ? 19 : 22} strokeWidth={2.3} />
      </span>
      <span className={compact ? 'brand-mark__word brand-mark__word--compact' : 'brand-mark__word'}>
        Beer<span>Me</span>
      </span>
    </div>
  );
}
