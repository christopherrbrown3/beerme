import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock3, Copy, Plus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AddTransactionDialog } from '../components/transactions/AddTransactionDialog';
import { ReverseTransactionDialog } from '../components/transactions/ReverseTransactionDialog';
import { TransactionCard } from '../components/transactions/TransactionCard';
import { EmptyState } from '../components/ui/EmptyState';
import { useGroupDetails, useLedgerRealtime, useTransactions } from '../hooks/useGroupLedger';
import { useAuth } from '../hooks/useAuth';
import { type LedgerEntry } from '../types/transactions';

export function GroupLedgerPage() {
  const { groupId = '' } = useParams();
  const { user } = useAuth();
  const groupQuery = useGroupDetails(groupId);
  const transactionsQuery = useTransactions(groupId);
  const [isAdding, setIsAdding] = useState(false);
  const [reversingEntry, setReversingEntry] = useState<LedgerEntry | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  useLedgerRealtime(groupId);

  if (groupQuery.isLoading) return <GroupLedgerSkeleton />;

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <div className="page group-ledger-page">
        <Link className="back-link" to="/">
          <ArrowLeft size={17} aria-hidden="true" /> Groups
        </Link>
        <section className="groups-error" role="alert">
          <h2>We couldn’t open this group.</h2>
          <p>The group may not exist, or you may not be a member.</p>
        </section>
      </div>
    );
  }

  const group = groupQuery.data;

  async function copyInvite() {
    const inviteUrl = `${window.location.origin}/join/${group.inviteToken}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2_000);
    } catch {
      setInviteCopied(false);
    }
  }

  return (
    <div className="page group-ledger-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={17} aria-hidden="true" /> Groups
      </Link>

      <header className="group-ledger-header">
        <div>
          <p className="eyebrow">Group ledger</p>
          <h1>{group.name}</h1>
          <p>{group.description || 'Every round, favor, and friendly IOU—kept in one place.'}</p>
        </div>
        <div className="group-ledger-header__actions">
          <button className="secondary-button" type="button" onClick={() => void copyInvite()}>
            <Copy size={16} aria-hidden="true" /> {inviteCopied ? 'Copied' : 'Invite'}
          </button>
          <button className="primary-button" type="button" onClick={() => setIsAdding(true)}>
            <Plus size={18} aria-hidden="true" /> Add transaction
          </button>
        </div>
      </header>

      <div className="group-facts" aria-label="Group details">
        <span>
          <UsersRound size={16} aria-hidden="true" /> {group.memberCount}{' '}
          {group.memberCount === 1 ? 'member' : 'members'}
        </span>
        <span>
          {group.currency.symbol} {group.currency.plural}
        </span>
      </div>

      <nav className="group-tabs" aria-label="Group views">
        <button type="button" disabled>
          People <span>Coming next</span>
        </button>
        <button type="button" disabled>
          Matrix <span>Coming later</span>
        </button>
        <button className="group-tabs__active" type="button" aria-current="page">
          History
        </button>
      </nav>

      <div className="section-heading ledger-heading">
        <div>
          <p className="eyebrow">Newest first</p>
          <h2>Transaction history</h2>
        </div>
        <span
          className="count-pill"
          aria-label={`${transactionsQuery.data?.length ?? 0} transactions`}
        >
          {transactionsQuery.data?.length ?? 0}
        </span>
      </div>

      {transactionsQuery.isLoading && <TransactionSkeleton />}

      {transactionsQuery.isError && (
        <section className="groups-error" role="alert">
          <h2>We couldn’t load the ledger.</h2>
          <p>Check your connection, then try again.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void transactionsQuery.refetch()}
          >
            Try again
          </button>
        </section>
      )}

      {transactionsQuery.data?.length === 0 && (
        <EmptyState icon={Clock3} eyebrow="A clean slate" title="No transactions yet">
          <p>Add the first friendly IOU. History will stay here—even if an entry is reversed.</p>
          <button className="primary-button" type="button" onClick={() => setIsAdding(true)}>
            <Plus size={18} aria-hidden="true" /> Add the first transaction
          </button>
        </EmptyState>
      )}

      {transactionsQuery.data && transactionsQuery.data.length > 0 && (
        <div className="transaction-list">
          <AnimatePresence initial={false}>
            {transactionsQuery.data.map((entry) => (
              <TransactionCard
                key={entry.id}
                entry={entry}
                group={group}
                currentUserId={user!.id}
                onReverse={setReversingEntry}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {isAdding && <AddTransactionDialog group={group} onClose={() => setIsAdding(false)} />}
      {reversingEntry && (
        <ReverseTransactionDialog
          group={group}
          entry={reversingEntry}
          onClose={() => setReversingEntry(null)}
        />
      )}
    </div>
  );
}

function GroupLedgerSkeleton() {
  return (
    <div className="page group-ledger-page group-ledger-skeleton" aria-label="Loading group ledger">
      <span />
      <span />
      <span />
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="transaction-list transaction-list--loading" aria-label="Loading transactions">
      <span />
      <span />
    </div>
  );
}
