import { AnimatePresence } from 'framer-motion';
import { Link2, Plus, UsersRound } from 'lucide-react';
import { useState } from 'react';

import { CreateGroupDialog } from '../components/groups/CreateGroupDialog';
import { GroupCard } from '../components/groups/GroupCard';
import { JoinGroupDialog } from '../components/groups/JoinGroupDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { PageIntro } from '../components/ui/PageIntro';
import { useGroups } from '../hooks/useGroups';

export function GroupsPage() {
  const groupsQuery = useGroups();
  const [dialog, setDialog] = useState<'create' | 'join' | null>(null);

  return (
    <div className="page page--groups">
      <div className="groups-hero">
        <PageIntro eyebrow="Your taproom" title="Good friends. Clear tabs.">
          Keep the little things friendly—without turning them into accounting.
        </PageIntro>
        <div className="groups-actions" aria-label="Group actions">
          <button className="secondary-button" type="button" onClick={() => setDialog('join')}>
            <Link2 size={17} aria-hidden="true" /> Join
          </button>
          <button className="primary-button" type="button" onClick={() => setDialog('create')}>
            <Plus size={18} aria-hidden="true" /> Create group
          </button>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">At a glance</p>
          <h2>Your groups</h2>
        </div>
        <span className="count-pill" aria-label={`${groupsQuery.data?.length ?? 0} groups`}>
          {groupsQuery.data?.length ?? 0}
        </span>
      </div>

      {groupsQuery.isLoading && <GroupsSkeleton />}

      {groupsQuery.isError && (
        <section className="groups-error" role="alert">
          <h2>We couldn’t load your groups.</h2>
          <p>Check your connection, then try one more time.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void groupsQuery.refetch()}
          >
            Try again
          </button>
        </section>
      )}

      {groupsQuery.data?.length === 0 && (
        <EmptyState icon={UsersRound} eyebrow="Nothing on tap yet" title="Start with your crew">
          <p>Create a group, invite your friends, and leave the awkward tallying to BeerMe.</p>
          <button className="primary-button" type="button" onClick={() => setDialog('create')}>
            <Plus size={18} aria-hidden="true" /> Create your first group
          </button>
        </EmptyState>
      )}

      {groupsQuery.data && groupsQuery.data.length > 0 && (
        <div className="groups-grid">
          <AnimatePresence initial={false}>
            {groupsQuery.data.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {dialog === 'create' && <CreateGroupDialog onClose={() => setDialog(null)} />}
      {dialog === 'join' && <JoinGroupDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

function GroupsSkeleton() {
  return (
    <div className="groups-grid groups-grid--loading" aria-label="Loading groups">
      <span />
      <span />
    </div>
  );
}
