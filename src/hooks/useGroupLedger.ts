import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  deleteGroup,
  getGroupDetails,
  leaveGroup,
  removeGroupMember,
  rotateGroupInvite,
  transferGroupOwnership,
  updateGroupCurrency,
} from '../services/groupService';
import {
  addTransaction,
  getGroupLedgerBalances,
  getTransactionsPage,
  reverseTransaction,
  settleUp,
  type TransactionCursor,
  type TransactionPage,
} from '../services/transactionService';
import { type GroupCurrency, type GroupDetails } from '../types/groups';
import {
  type CreateTransactionInput,
  type LedgerEntry,
  type SettleUpInput,
} from '../types/transactions';
import { useAuth } from './useAuth';

export const groupQueryKey = (groupId: string) => ['group', groupId] as const;
export const transactionsQueryKey = (groupId: string) => ['transactions', groupId] as const;
export const groupLedgerBalancesQueryKey = (groupId: string) =>
  ['group-ledger-balances', groupId] as const;

export function useGroupDetails(groupId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: groupQueryKey(groupId),
    queryFn: () => getGroupDetails(groupId, user!.id),
    enabled: Boolean(groupId && user),
  });
}

export function useTransactions(groupId: string, enabled: boolean) {
  return useInfiniteQuery<
    TransactionPage,
    Error,
    InfiniteData<TransactionPage>,
    ReturnType<typeof transactionsQueryKey>,
    TransactionCursor | null
  >({
    queryKey: transactionsQueryKey(groupId),
    queryFn: ({ pageParam }) => getTransactionsPage(groupId, pageParam),
    initialPageParam: null as TransactionCursor | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    // Keep the browser cache and mounted History cards bounded at two pages.
    maxPages: 2,
    enabled: Boolean(groupId) && enabled,
  });
}

export function useGroupLedgerBalances(groupId: string) {
  return useQuery({
    queryKey: groupLedgerBalancesQueryKey(groupId),
    queryFn: () => getGroupLedgerBalances(groupId),
    enabled: Boolean(groupId),
  });
}

export function useUpdateGroupCurrency(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (currency: GroupCurrency) => updateGroupCurrency(groupId, currency),
    onSuccess: (currency) => {
      queryClient.setQueryData<GroupDetails>(groupQueryKey(groupId), (group) =>
        group ? { ...group, currency } : group,
      );
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

function useRemoveGroupMutation(groupId: string, mutationFn: (groupId: string) => Promise<void>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mutationFn(groupId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: groupQueryKey(groupId), exact: true });
      queryClient.removeQueries({ queryKey: transactionsQueryKey(groupId), exact: true });
      queryClient.removeQueries({ queryKey: groupLedgerBalancesQueryKey(groupId), exact: true });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
    },
  });
}

export function useLeaveGroup(groupId: string) {
  return useRemoveGroupMutation(groupId, leaveGroup);
}

export function useDeleteGroup(groupId: string) {
  return useRemoveGroupMutation(groupId, deleteGroup);
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) => removeGroupMember(groupId, targetUserId),
    onSuccess: async (_data, targetUserId) => {
      queryClient.setQueryData<GroupDetails>(groupQueryKey(groupId), (group) =>
        group
          ? {
              ...group,
              members: group.members.filter((member) => member.userId !== targetUserId),
              memberCount: Math.max(0, group.memberCount - 1),
            }
          : group,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupQueryKey(groupId) }),
        queryClient.invalidateQueries({ queryKey: groupLedgerBalancesQueryKey(groupId) }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
    },
  });
}

export function useRotateGroupInvite(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => rotateGroupInvite(groupId),
    onSuccess: async (inviteToken) => {
      queryClient.setQueryData<GroupDetails>(groupQueryKey(groupId), (group) =>
        group ? { ...group, inviteToken } : group,
      );
      await queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useTransferGroupOwnership(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) => transferGroupOwnership(groupId, targetUserId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupQueryKey(groupId) }),
        queryClient.invalidateQueries({ queryKey: groupLedgerBalancesQueryKey(groupId) }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
    },
  });
}

export function useAddTransaction(group: GroupDetails) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = transactionsQueryKey(group.id);

  return useMutation<LedgerEntry, Error, CreateTransactionInput>({
    mutationFn: (input) => addTransaction(user!.id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: groupLedgerBalancesQueryKey(group.id) }),
      ]);
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useReverseTransaction(groupId: string) {
  const queryClient = useQueryClient();
  const queryKey = transactionsQueryKey(groupId);

  return useMutation({
    mutationFn: reverseTransaction,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: groupLedgerBalancesQueryKey(groupId) });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useSettleUp(groupId: string) {
  const queryClient = useQueryClient();
  const queryKey = transactionsQueryKey(groupId);

  return useMutation<unknown, Error, SettleUpInput>({
    mutationFn: settleUp,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: groupLedgerBalancesQueryKey(groupId) }),
      ]);
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}
