import { ArrowUpRight, UsersRound } from 'lucide-react';

import { EmptyState } from '../components/ui/EmptyState';
import { PageIntro } from '../components/ui/PageIntro';

export function GroupsPage() {
  return (
    <div className="page page--groups">
      <PageIntro eyebrow="Your taproom" title="Good friends. Clear tabs.">
        Keep the little things friendly—without turning them into accounting.
      </PageIntro>

      <div className="section-heading">
        <div>
          <p className="eyebrow">At a glance</p>
          <h2>Your groups</h2>
        </div>
        <span className="count-pill" aria-label="Zero groups">
          0
        </span>
      </div>

      <EmptyState icon={UsersRound} eyebrow="Nothing on tap yet" title="Start with your crew">
        <p>Create a group, invite your friends, and leave the awkward tallying to BeerMe.</p>
        <button className="primary-button" type="button" disabled aria-describedby="milestone-note">
          Create a group
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
        <p id="milestone-note" className="milestone-note">
          Group creation arrives in Milestone 3.
        </p>
      </EmptyState>
    </div>
  );
}
