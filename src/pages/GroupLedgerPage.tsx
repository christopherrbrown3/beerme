import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock3, LogOut, Plus, Settings2, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AddTransactionDialog } from '../components/transactions/AddTransactionDialog';
import { ReverseTransactionDialog } from '../components/transactions/ReverseTransactionDialog';
import { SettleUpDialog, type SettlementResult } from '../components/transactions/SettleUpDialog';
import { SettlementCelebration } from '../components/transactions/SettlementCelebration';
import { TransactionCard } from '../components/transactions/TransactionCard';
import { GroupSummary } from '../components/groups/GroupSummary';
import { GroupCurrencyDialog } from '../components/groups/GroupCurrencyDialog';
import { GroupMembershipDialog } from '../components/groups/GroupMembershipDialog';
import { GroupSettingsDialog } from '../components/groups/GroupSettingsDialog';
import { InviteGroupDialog } from '../components/groups/InviteGroupDialog';
import { PeopleView } from '../components/groups/PeopleView';
import { RelationshipMatrix } from '../components/groups/RelationshipMatrix';
import { RemoveMemberDialog } from '../components/groups/RemoveMemberDialog';
import { TransferOwnershipDialog } from '../components/groups/TransferOwnershipDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { useGroupDetails, useGroupLedgerBalances, useTransactions } from '../hooks/useGroupLedger';
import { useAuth } from '../hooks/useAuth';
import { type GroupDetails, type GroupMember } from '../types/groups';
import { type PairBalance } from '../types/balances';
import { type LedgerEntry, type TransactionParties } from '../types/transactions';
import { formatUnitQuantity } from '../utils/unitPresentation';

type GroupView = 'people' | 'matrix' | 'history';

export function GroupLedgerPage() {
  const { groupId = '' } = useParams();
  const { user } = useAuth();
  const groupQuery = useGroupDetails(groupId);
  const [view, setView] = useState<GroupView>('people');
  const transactionsQuery = useTransactions(groupId, view === 'history');
  const balancesQuery = useGroupLedgerBalances(groupId);
  const [transactionDialog, setTransactionDialog] = useState<TransactionParties | 'generic' | null>(
    null,
  );
  const [reversingEntry, setReversingEntry] = useState<LedgerEntry | null>(null);
  const [settlingWith, setSettlingWith] = useState<{
    member: GroupMember;
    balance: PairBalance;
  } | null>(null);
  const [celebration, setCelebration] = useState<SettlementResult | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isEditingCurrency, setIsEditingCurrency] = useState(false);
  const [isManagingSettings, setIsManagingSettings] = useState(false);
  const [isManagingMembership, setIsManagingMembership] = useState(false);
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);
  const [removingMember, setRemovingMember] = useState<GroupMember | null>(null);
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
  const transactions = transactionsQuery.data?.pages.flatMap((page) => page.entries) ?? [];
  const balances = balancesQuery.data ?? [];
  const isLedgerLoading =
    view === 'history' ? transactionsQuery.isLoading : balancesQuery.isLoading;
  const isLedgerError = view === 'history' ? transactionsQuery.isError : balancesQuery.isError;

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
              onClick={() => setIsManagingSettings(true)}
            >
              <Settings2 size={16} aria-hidden="true" /> Group settings
            </button>
          )}
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
        entries={balances}
        currentUserId={user!.id}
        isLoading={balancesQuery.isLoading || balancesQuery.isError}
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

      {isLedgerLoading && <TransactionSkeleton />}

      {isLedgerError && (
        <section className="groups-error" role="alert">
          <h2>We couldn’t load the ledger.</h2>
          <p>Check your connection, then try again.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              void (view === 'history' ? transactionsQuery.refetch() : balancesQuery.refetch())
            }
          >
            Try again
          </button>
        </section>
      )}

      {!balancesQuery.isLoading && !balancesQuery.isError && view === 'people' && (
        <PeopleView
          group={group}
          entries={balances}
          currentUserId={user!.id}
          onAddTransaction={setTransactionDialog}
          onSettleUp={(member, balance) => setSettlingWith({ member, balance })}
          onRemoveMember={setRemovingMember}
        />
      )}

      {!transactionsQuery.isLoading && !transactionsQuery.isError && view === 'history' && (
        <HistoryView
          group={group}
          transactions={transactions}
          currentUserId={user!.id}
          onAddTransaction={() => setTransactionDialog('generic')}
          onReverse={setReversingEntry}
          hasMore={transactionsQuery.hasNextPage}
          isLoadingMore={transactionsQuery.isFetchingNextPage}
          onLoadMore={() => void transactionsQuery.fetchNextPage()}
        />
      )}

      {!balancesQuery.isLoading && !balancesQuery.isError && view === 'matrix' && (
        <RelationshipMatrix
          group={group}
          entries={balances}
          currentUserId={user!.id}
          onAddTransaction={setTransactionDialog}
        />
      )}

      {group.role !== 'owner' && (
        <section className="group-danger-zone" aria-labelledby="group-membership-heading">
          <div>
            <p className="eyebrow">Membership</p>
            <h2 id="group-membership-heading">Ready to move on?</h2>
            <p>Leaving removes your access without changing the ledger for other members.</p>
          </div>
          <button
            className="danger-button"
            type="button"
            onClick={() => setIsManagingMembership(true)}
          >
            <LogOut size={17} aria-hidden="true" /> Leave group
          </button>
        </section>
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
      {settlingWith && (
        <SettleUpDialog
          group={group}
          member={settlingWith.member}
          balance={settlingWith.balance}
          onClose={() => setSettlingWith(null)}
          onSettled={(result) => {
            setSettlingWith(null);
            if (result.isFullySettled) setCelebration(result);
          }}
        />
      )}
      {isInviting && <InviteGroupDialog group={group} onClose={() => setIsInviting(false)} />}
      {isEditingCurrency && (
        <GroupCurrencyDialog group={group} onClose={() => setIsEditingCurrency(false)} />
      )}
      {isManagingSettings && (
        <GroupSettingsDialog
          group={group}
          onClose={() => setIsManagingSettings(false)}
          onOpenCurrency={() => setIsEditingCurrency(true)}
          onOpenInvite={() => setIsInviting(true)}
          onOpenTransfer={() => setIsTransferringOwnership(true)}
          onOpenLifecycle={() => setIsManagingMembership(true)}
        />
      )}
      {isManagingMembership && (
        <GroupMembershipDialog group={group} onClose={() => setIsManagingMembership(false)} />
      )}
      {isTransferringOwnership && (
        <TransferOwnershipDialog
          group={group}
          currentUserId={user!.id}
          onClose={() => setIsTransferringOwnership(false)}
        />
      )}
      {removingMember && (
        <RemoveMemberDialog
          group={group}
          member={removingMember}
          onClose={() => setRemovingMember(null)}
        />
      )}
      <AnimatePresence>
        {celebration && (
          <SettlementCelebration
            friendName={celebration.friendName}
            quantityLabel={formatUnitQuantity(celebration.quantity, group.currency)}
            onComplete={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

type HistoryViewProps = {
  group: GroupDetails;
  transactions: LedgerEntry[];
  currentUserId: string;
  onAddTransaction: () => void;
  onReverse: (entry: LedgerEntry) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

function HistoryView({
  group,
  transactions,
  currentUserId,
  onAddTransaction,
  onReverse,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: HistoryViewProps) {
  return (
    <>
      <div className="section-heading ledger-heading">
        <div>
          <p className="eyebrow">Newest first</p>
          <h2>Transaction history</h2>
        </div>
        <span className="count-pill" aria-label={`${transactions.length} loaded transactions`}>
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
        <>
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
          {hasMore && (
            <div className="ledger-load-more">
              <button
                className="secondary-button"
                type="button"
                disabled={isLoadingMore}
                onClick={onLoadMore}
              >
                {isLoadingMore ? 'Loading older transactions…' : 'Load older transactions'}
              </button>
              <p>Showing up to 100 recent transactions at a time.</p>
            </div>
          )}
        </>
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
