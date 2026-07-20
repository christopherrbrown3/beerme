import { Link2, ShieldAlert } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { BeerMeMark } from '../components/brand/BeerMeMark';
import { useJoinGroup } from '../hooks/useGroups';
import { isUuid } from '../utils/groupValidation';

export function JoinGroupPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const joinGroup = useJoinGroup();
  const isInvalidToken = !isUuid(token);

  const handleJoin = useCallback(async () => {
    if (isInvalidToken) return;

    try {
      const groupId = await joinGroup.mutateAsync(token);
      if (groupId) {
        navigate(`/groups/${groupId}`, { replace: true });
      }
    } catch {
      // swallow errors so the page can show the existing error state
    }
  }, [isInvalidToken, joinGroup, navigate, token]);

  const hasJoinError = !isInvalidToken && joinGroup.isError;
  const showError = isInvalidToken || hasJoinError;

  return (
    <main className="join-page">
      <BeerMeMark />
      <section className="join-card" aria-live="polite">
        <span
          className={showError ? 'join-card__icon join-card__icon--error' : 'join-card__icon'}
          aria-hidden="true"
        >
          {showError ? <ShieldAlert size={30} /> : <Link2 size={30} />}
        </span>
        <p className="eyebrow">Group invite</p>
        <h1>
          {isInvalidToken
            ? 'This invite won’t pour.'
            : hasJoinError
              ? 'We couldn’t join this round.'
              : 'Confirm your invite.'}
        </h1>
        <p>
          {isInvalidToken
            ? 'The link may be incomplete or no longer valid. Ask your friend for a fresh invite.'
            : hasJoinError
              ? 'The invite may be fine, but the connection didn’t finish. Try it once more.'
              : 'Tap Join to accept this invitation and add the group to your BeerMe account.'}
        </p>
        {isInvalidToken ? (
          <Link className="secondary-button" to="/">
            Back to your groups
          </Link>
        ) : (
          <div className="join-card__actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleJoin}
              disabled={joinGroup.isPending}
            >
              {joinGroup.isPending ? 'Joining…' : 'Join group'}
            </button>
            <Link className="secondary-button" to="/">
              Back to your groups
            </Link>
          </div>
        )}
        {hasJoinError && (
          <p className="join-card__error" role="alert">
            We couldn’t join this round. Please try again.
          </p>
        )}
      </section>
    </main>
  );
}
