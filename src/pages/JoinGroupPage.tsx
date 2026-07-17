import { Link2, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { BeerMeMark } from '../components/brand/BeerMeMark';
import { useJoinGroup } from '../hooks/useGroups';
import { isUuid } from '../utils/groupValidation';

export function JoinGroupPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const joinGroup = useJoinGroup();
  const didStart = useRef(false);
  const isInvalidToken = !isUuid(token);

  const attemptJoin = useCallback(() => {
    if (isInvalidToken) return;
    didStart.current = true;

    void joinGroup
      .mutateAsync(token)
      .then((groupId) => navigate(`/groups/${groupId}`, { replace: true }))
      .catch(() => undefined);
  }, [isInvalidToken, joinGroup, navigate, token]);

  useEffect(() => {
    if (!didStart.current) attemptJoin();
  }, [attemptJoin]);

  const hasJoinError = !isInvalidToken && joinGroup.isError;
  const showError = isInvalidToken || hasJoinError;

  function retryJoin() {
    joinGroup.reset();
    didStart.current = false;
    attemptJoin();
  }

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
              : 'Joining your crew…'}
        </h1>
        <p>
          {isInvalidToken
            ? 'The link may be incomplete or no longer valid. Ask your friend for a fresh invite.'
            : hasJoinError
              ? 'The invite may be fine, but the connection didn’t finish. Try it once more.'
              : 'We’re checking the invitation and adding you securely.'}
        </p>
        {isInvalidToken && (
          <Link className="secondary-button" to="/">
            Back to your groups
          </Link>
        )}
        {hasJoinError && (
          <div className="join-card__actions">
            <button className="primary-button" type="button" onClick={retryJoin}>
              Try again
            </button>
            <Link className="secondary-button" to="/">
              Back to your groups
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
