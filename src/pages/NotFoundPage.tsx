import { ArrowLeft, BeerOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BeerMeMark } from '../components/brand/BeerMeMark';

export function NotFoundPage() {
  return (
    <main className="not-found">
      <BeerMeMark />
      <div className="not-found__card">
        <BeerOff size={40} strokeWidth={1.7} aria-hidden="true" />
        <p className="eyebrow">404 — Empty keg</p>
        <h1>Nothing’s pouring here.</h1>
        <p>The page you were looking for has wandered off with the last round.</p>
        <Link className="primary-button" to="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to groups
        </Link>
      </div>
    </main>
  );
}
