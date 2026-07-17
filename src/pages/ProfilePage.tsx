import { UserRound } from 'lucide-react';

import { EmptyState } from '../components/ui/EmptyState';
import { PageIntro } from '../components/ui/PageIntro';

export function ProfilePage() {
  return (
    <div className="page">
      <PageIntro eyebrow="Make it yours" title="Profile">
        Your identity, preferences, and account controls will live here.
      </PageIntro>
      <EmptyState icon={UserRound} eyebrow="Coming up next" title="Pull up a stool">
        <p>Sign up and profile setup arrive with authentication in Milestone 2.</p>
      </EmptyState>
    </div>
  );
}
