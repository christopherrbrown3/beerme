import { MailCheck } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { getSafeNextPath } from '../../utils/redirect';

export function CheckEmailPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const email = (location.state as { email?: string } | null)?.email;
  const nextPath = getSafeNextPath(searchParams.get('next'));
  const nextSearch = nextPath === '/' ? '' : `?next=${encodeURIComponent(nextPath)}`;

  return (
    <section className="auth-card auth-card--centered" aria-labelledby="check-email-title">
      <div className="auth-card__hero-icon" aria-hidden="true">
        <MailCheck size={34} />
      </div>
      <p className="eyebrow">Almost there</p>
      <h1 id="check-email-title">Check your inbox.</h1>
      <p className="auth-card__intro">
        We sent a confirmation link{email ? ` to ${email}` : ''}. Open it on this device to finish
        creating your account.
      </p>
      <Link className="secondary-button" to={`/auth/login${nextSearch}`}>
        Back to sign in
      </Link>
    </section>
  );
}
