import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock3, Copy, Plus, Settings2, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AddTransactionDialog } from '../components/transactions/AddTransactionDialog';
import { ReverseTransactionDialog } from '../components/transactions/ReverseTransactionDialog';
import { TransactionCard } from '../components/transactions/TransactionCard';
import { GroupSummary } from '../components/groups/GroupSummary';
import { GroupCurrencyDialog } from '../components/groups/GroupCurrencyDialog';
import { InviteGroupDialog } from '../components/groups/InviteGroupDialog';
import { PeopleView } from '../components/groups/PeopleView';
import { RelationshipMatrix } from '../components/groups/RelationshipMatrix';
import { EmptyState } from '../components/ui/EmptyState';
import { useGroupDetails, useTransactions } from '../hooks/useGroupLedger';
import { useAuth } from '../hooks/useAuth';
import { type GroupDetails } from '../types/groups';
import { type LedgerEntry, type TransactionParties } from '../types/transactions';

type GroupView = 'people' | 'matrix' | 'history';

export function GroupLedgerPage() {
  const { groupId = '' } = useParams();
  const { user } = useAuth();
  const groupQuery = useGroupDetails(groupId);
  const transactionsQuery = useTransactions(groupId);
  const [view, setView] = useState<GroupView>('people');
  const [transactionDialog, setTransactionDialog] = useState<TransactionParties | 'generic' | null>(
    null,
  );
  const [reversingEntry, setReversingEntry] = useState<LedgerEntry | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isEditingCurrency, setIsEditingCurrency] = useState(false);
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
  const transactions = transactionsQuery.data ?? [];

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
          {group.role === 'owner' && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setIsEditingCurrency(true)}
            >
              <Settings2 size={16} aria-hidden="true" /> Currency
            </button>
          )}
          <button className="secondary-button" type="button" onClick={() => setIsInviting(true)}>
            <Copy size={16} aria-hidden="true" /> Invite
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => setTransactionDialog('generic')}
          >
            <Plus size={18} aria-hidden="true" /> Add transaction
          </button>
        </div>
      </header>

      <GroupSummary
        group={group}
        transactions={transactions}
        currentUserId={user!.id}
        isLoading={transactionsQuery.isLoading || transactionsQuery.isError}
      />

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
        <button
          className={view === 'people' ? 'group-tabs__active' : undefined}
          type="button"
          aria-current={view === 'people' ? 'page' : undefined}
          onClick={() => setView('people')}
        >
          People
        </button>
        <button
          className={view === 'matrix' ? 'group-tabs__active' : undefined}
          type="button"
          aria-current={view === 'matrix' ? 'page' : undefined}
          onClick={() => setView('matrix')}
        >
          Matrix
        </button>
        <button
          className={view === 'history' ? 'group-tabs__active' : undefined}
          type="button"
          aria-current={view === 'history' ? 'page' : undefined}
          onClick={() => setView('history')}
        >
          History
        </button>
      </nav>

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

      {!transactionsQuery.isLoading && !transactionsQuery.isError && view === 'people' && (
        <PeopleView
          group={group}
          transactions={transactions}
          currentUserId={user!.id}
          onAddTransaction={setTransactionDialog}
        />
      )}

      {!transactionsQuery.isLoading && !transactionsQuery.isError && view === 'history' && (
        <HistoryView
          group={group}
          transactions={transactions}
          currentUserId={user!.id}
          onAddTransaction={() => setTransactionDialog('generic')}
          onReverse={setReversingEntry}
        />
      )}

      {!transactionsQuery.isLoading && !transactionsQuery.isError && view === 'matrix' && (
        <RelationshipMatrix
          group={group}
          transactions={transactions}
          currentUserId={user!.id}
          onAddTransaction={setTransactionDialog}
        />
      )}

      {transactionDialog && (
        <AddTransactionDialog
          group={group}
          initialParties={transactionDialog === 'generic' ? undefined : transactionDialog}
          onClose={() => setTransactionDialog(null)}
        />
      )}
      {reversingEntry && (
        <ReverseTransactionDialog
          group={group}
          entry={reversingEntry}
          onClose={() => setReversingEntry(null)}
        />
      )}
      {isInviting && <InviteGroupDialog group={group} onClose={() => setIsInviting(false)} />}
      {isEditingCurrency && (
        <GroupCurrencyDialog group={group} onClose={() => setIsEditingCurrency(false)} />
      )}
    </div>
  );
}

type HistoryViewProps = {
  group: GroupDetails;
  transactions: LedgerEntry[];
  currentUserId: string;
  onAddTransaction: () => void;
  onReverse: (entry: LedgerEntry) => void;
};

function HistoryView({
  group,
  transactions,
  currentUserId,
  onAddTransaction,
  onReverse,
}: HistoryViewProps) {
  return (
    <>
      <div className="section-heading ledger-heading">
        <div>
          <p className="eyebrow">Newest first</p>
          <h2>Transaction history</h2>
        </div>
        <span className="count-pill" aria-label={`${transactions.length} transactions`}>
          {transactions.length}
        </span>
      </div>

      {transactions.length === 0 ? (
        <EmptyState icon={Clock3} eyebrow="A clean slate" title="No transactions yet">
          <p>Add the first friendly IOU. History will stay here—even if an entry is reversed.</p>
          <button className="primary-button" type="button" onClick={onAddTransaction}>
            <Plus size={18} aria-hidden="true" /> Add the first transaction
          </button>
        </EmptyState>
      ) : (
        <div className="transaction-list">
          <AnimatePresence initial={false}>
            {transactions.map((entry) => (
              <TransactionCard
                key={entry.id}
                entry={entry}
                group={group}
                currentUserId={currentUserId}
                onReverse={onReverse}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
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
