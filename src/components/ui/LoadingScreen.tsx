import { Beer } from 'lucide-react';

type LoadingScreenProps = {
  label: string;
};

export function LoadingScreen({ label }: LoadingScreenProps) {
  return (
    <main className="loading-screen" aria-live="polite" aria-busy="true">
      <span className="loading-screen__icon" aria-hidden="true">
        <Beer size={28} />
      </span>
      <p>{label}</p>
    </main>
  );
}
