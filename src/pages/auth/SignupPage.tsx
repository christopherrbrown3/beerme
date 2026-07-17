import { ArrowRight, UserRoundPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { FormField } from '../../components/ui/FormField';
import { useAuth } from '../../hooks/useAuth';
import { getFriendlyAuthError, signUpWithPassword } from '../../services/authService';
import {
  normalizeDisplayName,
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from '../../utils/profileValidation';

export function SignupPage() {
  const { isConfigured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUsernameError = validateUsername(username);
    const nextDisplayNameError = validateDisplayName(displayName);

    setUsernameError(nextUsernameError);
    setDisplayNameError(nextDisplayNameError);
    setError(null);

    if (nextUsernameError || nextDisplayNameError) return;

    setIsSubmitting(true);

    try {
      const { session } = await signUpWithPassword({ email, password, username, displayName });

      if (session) {
        await navigate('/', { replace: true });
      } else {
        await navigate('/auth/check-email', { replace: true, state: { email: email.trim() } });
      }
    } catch (submitError) {
      setError(getFriendlyAuthError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="signup-title">
      <div className="auth-card__icon" aria-hidden="true">
        <UserRoundPlus size={24} />
      </div>
      <p className="eyebrow">Pull up a stool</p>
      <h1 id="signup-title">Create your BeerMe identity.</h1>
      <p className="auth-card__intro">One account follows you across every group.</p>

      {error && (
        <div className="form-alert form-alert--error" role="alert">
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="form-grid">
          <FormField
            label="Display name"
            name="display-name"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (displayNameError) setDisplayNameError(validateDisplayName(event.target.value));
            }}
            onBlur={() => {
              setDisplayName(normalizeDisplayName(displayName));
              setDisplayNameError(validateDisplayName(displayName));
            }}
            error={displayNameError}
            maxLength={50}
            required
          />
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
            hint="Lowercase letters, numbers, and underscores. This can’t be changed."
            minLength={3}
            maxLength={24}
            pattern="[a-z0-9_]{3,24}"
            required
          />
        </div>
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="Use at least 8 characters."
          minLength={8}
          required
        />
        <button
          className="primary-button auth-form__submit"
          type="submit"
          disabled={isSubmitting || !isConfigured}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
          {!isSubmitting && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>

      <p className="auth-card__switch">
        Already have an account? <Link to="/auth/login">Sign in</Link>
      </p>
    </section>
  );
}
