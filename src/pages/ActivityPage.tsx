import { Sparkles } from 'lucide-react';

import { EmptyState } from '../components/ui/EmptyState';
import { PageIntro } from '../components/ui/PageIntro';

export function ActivityPage() {
  return (
    <div className="page">
      <PageIntro eyebrow="The latest" title="Activity">
        Every round and reversal will land here in one friendly timeline.
      </PageIntro>
      <EmptyState
        icon={Sparkles}
        eyebrow="Quiet for now"
        title="Your story starts soon"
        accent="green"
      >
        <p>Once your crew starts sharing, their newest activity will show up here.</p>
      </EmptyState>
    </div>
  );
}
