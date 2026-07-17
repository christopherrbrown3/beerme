import { type ReactNode } from 'react';

type PageIntroProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function PageIntro({ eyebrow, title, children }: PageIntroProps) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}
