import { ArrowRight, LockKeyhole } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { FormField } from '../../components/ui/FormField';
import { useAuth } from '../../hooks/useAuth';
import { getFriendlyAuthError, signInWithPassword } from '../../services/authService';
import { normalizeUsername, validateUsername } from '../../utils/profileValidation';
import { getSafeNextPath } from '../../utils/redirect';

export function LoginPage() {
  const { isConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = getSafeNextPath(searchParams.get('next'));
  const nextSearch = nextPath === '/' ? '' : `?next=${encodeURIComponent(nextPath)}`;
  const configurationMissing = Boolean(
    (location.state as { configurationMissing?: boolean } | null)?.configurationMissing,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUsernameError = validateUsername(username);
    setUsernameError(nextUsernameError);
    setError(null);
    if (nextUsernameError) return;
    setIsSubmitting(true);

    try {
      await signInWithPassword(username, password);
      await navigate(nextPath, { replace: true });
    } catch (submitError) {
      setError(getFriendlyAuthError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-card__icon" aria-hidden="true">
        <LockKeyhole size={24} />
      </div>
      <p className="eyebrow">Welcome back</p>
      <h1 id="login-title">Sign in to your crew.</h1>
      <p className="auth-card__intro">Pick up exactly where the last round left off.</p>

      {!isConfigured && (
        <div className="form-alert" role="alert">
          {configurationMissing
            ? 'BeerMe needs its Supabase environment variables before sign-in can work.'
            : 'Authentication is not configured in this environment.'}
        </div>
      )}

      {error && (
        <div className="form-alert form-alert--error" role="alert">
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <FormField
          label="Username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => {
            setUsername(normalizeUsername(event.target.value));
            if (usernameError) setUsernameError(validateUsername(event.target.value));
          }}
          onBlur={() => setUsernameError(validateUsername(username))}
          error={usernameError}
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9_]{3,24}"
          required
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        <button
          className="primary-button auth-form__submit"
          type="submit"
          disabled={isSubmitting || !isConfigured}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
          {!isSubmitting && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>

      <p className="auth-card__switch">
        New around here? <Link to={`/auth/signup${nextSearch}`}>Create an account</Link>
      </p>
    </section>
  );
}
