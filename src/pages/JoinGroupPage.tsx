import { Link2, ShieldAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { BeerMeMark } from '../components/brand/BeerMeMark';
import { useJoinGroup } from '../hooks/useGroups';
import { isUuid } from '../utils/groupValidation';

export function JoinGroupPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const joinGroup = useJoinGroup();
  const didStart = useRef(false);

  useEffect(() => {
    if (didStart.current || !isUuid(token)) return;
    didStart.current = true;

    void joinGroup
      .mutateAsync(token)
      .then((groupId) => navigate(`/groups/${groupId}`, { replace: true }))
      .catch(() => undefined);
  }, [joinGroup, navigate, token]);

  const isInvalid = !isUuid(token) || joinGroup.isError;

  return (
    <main className="join-page">
      <BeerMeMark />
      <section className="join-card" aria-live="polite">
        <span
          className={isInvalid ? 'join-card__icon join-card__icon--error' : 'join-card__icon'}
          aria-hidden="true"
        >
          {isInvalid ? <ShieldAlert size={30} /> : <Link2 size={30} />}
        </span>
        <p className="eyebrow">Group invite</p>
        <h1>{isInvalid ? 'This invite won’t pour.' : 'Joining your crew…'}</h1>
        <p>
          {isInvalid
            ? 'The link may be incomplete or no longer valid. Ask your friend for a fresh invite.'
            : 'We’re checking the invitation and adding you securely.'}
        </p>
        {isInvalid && (
          <Link className="secondary-button" to="/">
            Back to your groups
          </Link>
        )}
      </section>
    </main>
  );
}
