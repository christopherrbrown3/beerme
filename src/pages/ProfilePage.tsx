import { AtSign, CalendarDays, LogOut, Save, UserRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { PageIntro } from '../components/ui/PageIntro';
import { useAuth } from '../hooks/useAuth';
import { useProfile, useUpdateDisplayName } from '../hooks/useProfile';
import { type Profile } from '../types/database';
import { validateDisplayName } from '../utils/profileValidation';

export function ProfilePage() {
  const profileQuery = useProfile();

  return (
    <div className="page page--profile">
      <PageIntro eyebrow="Make it yours" title="Profile">
        Your BeerMe identity follows you across every group.
      </PageIntro>

      {profileQuery.isLoading && <ProfileSkeleton />}

      {profileQuery.isError && (
        <section className="profile-panel profile-panel--error" role="alert">
          <h2>We couldn’t load your profile.</h2>
          <p>Check your connection and try again.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void profileQuery.refetch()}
          >
            Try again
          </button>
        </section>
      )}

      {profileQuery.data && (
        <ProfileDetails key={profileQuery.data.display_name} profile={profileQuery.data} />
      )}
    </div>
  );
}

type ProfileDetailsProps = {
  profile: Profile;
};

function ProfileDetails({ profile }: ProfileDetailsProps) {
  const { signOut } = useAuth();
  const updateProfile = useUpdateDisplayName();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateDisplayName(displayName);
    setDisplayNameError(validationError);

    if (validationError) return;
    try {
      await updateProfile.mutateAsync(displayName);
    } catch {
      // The mutation state renders accessible error feedback below.
    }
  }

  async function handleSignOut() {
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      setSignOutError('We couldn’t sign you out. Check your connection and try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="profile-stack">
      <section className="profile-identity" aria-labelledby="profile-identity-title">
        <div className="profile-avatar" aria-hidden="true">
          {profile.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">Your identity</p>
          <h2 id="profile-identity-title">{profile.display_name}</h2>
          <p>@{profile.username}</p>
        </div>
      </section>

      <section className="profile-panel" aria-labelledby="profile-details-title">
        <div className="profile-panel__heading">
          <span className="profile-panel__icon" aria-hidden="true">
            <UserRound size={20} />
          </span>
          <div>
            <h2 id="profile-details-title">Profile details</h2>
            <p>Your username is permanent, but your display name can grow with you.</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={(event) => void handleSave(event)}>
          <label className="form-field" htmlFor="profile-display-name">
            <span className="form-field__label">Display name</span>
            <input
              id="profile-display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-invalid={Boolean(displayNameError)}
              aria-describedby={displayNameError ? 'profile-display-name-error' : undefined}
              maxLength={50}
              required
            />
            {displayNameError && (
              <span
                id="profile-display-name-error"
                className="form-field__message form-field__message--error"
              >
                {displayNameError}
              </span>
            )}
          </label>
          <button
            className="primary-button profile-form__save"
            type="submit"
            disabled={updateProfile.isPending || displayName.trim() === profile.display_name}
          >
            <Save size={17} aria-hidden="true" />
            {updateProfile.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {updateProfile.isSuccess && <p className="form-success">Profile updated.</p>}
          {updateProfile.isError && (
            <p className="form-error" role="alert">
              We couldn’t save that change. Please try again.
            </p>
          )}
        </form>

        <dl className="profile-facts">
          <div>
            <dt>
              <AtSign size={17} aria-hidden="true" /> Username
            </dt>
            <dd>{profile.username}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays size={17} aria-hidden="true" /> Member since
            </dt>
            <dd>
              {new Intl.DateTimeFormat(undefined, {
                month: 'long',
                year: 'numeric',
              }).format(new Date(profile.created_at))}
            </dd>
          </div>
        </dl>
      </section>

      <section className="profile-panel profile-panel--session" aria-labelledby="session-title">
        <div>
          <h2 id="session-title">Done for now?</h2>
          <p>Sign out securely on this device.</p>
        </div>
        <button
          className="danger-button"
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
        >
          <LogOut size={17} aria-hidden="true" />
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </button>
        {signOutError && (
          <p className="form-error" role="alert">
            {signOutError}
          </p>
        )}
      </section>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="profile-skeleton" aria-label="Loading profile">
      <span />
      <span />
      <span />
    </div>
  );
}
