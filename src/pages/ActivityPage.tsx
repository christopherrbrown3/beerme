import { Sparkles } from 'lucide-react';

import { ActivityCard } from '../components/activity/ActivityCard';
import { EmptyState } from '../components/ui/EmptyState';
import { PageIntro } from '../components/ui/PageIntro';
import { useActivity } from '../hooks/useActivity';

export function ActivityPage() {
  const activityQuery = useActivity();

  return (
    <div className="page page--activity">
      <PageIntro eyebrow="The latest" title="Activity">
        Every round, new friend, and reversal—together in one friendly timeline.
      </PageIntro>

      {activityQuery.isLoading && <ActivitySkeleton />}

      {activityQuery.isError && (
        <section className="groups-error" role="alert">
          <h2>We couldn’t load your activity.</h2>
          <p>Check your connection, then try again.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void activityQuery.refetch()}
          >
            Try again
          </button>
        </section>
      )}

      {activityQuery.data?.length === 0 && (
        <EmptyState
          icon={Sparkles}
          eyebrow="Quiet for now"
          title="Your story starts soon"
          accent="green"
        >
          <p>Once your crew starts sharing, their newest activity will show up here.</p>
        </EmptyState>
      )}

      {activityQuery.data && activityQuery.data.length > 0 && (
        <section className="activity-feed" aria-labelledby="activity-feed-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Newest first</p>
              <h2 id="activity-feed-heading">Your timeline</h2>
            </div>
            <span className="count-pill" aria-label={`${activityQuery.data.length} events`}>
              {activityQuery.data.length}
            </span>
          </div>
          <div className="activity-list">
            {activityQuery.data.map((event) => (
              <ActivityCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="activity-list activity-list--loading" aria-label="Loading activity">
      <span />
      <span />
      <span />
    </div>
  );
}
