import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSupabaseClient } from '../lib/supabase';
import { getGroupDetails } from '../services/groupService';
import {
  addTransaction,
  getTransactions,
  reverseTransaction,
} from '../services/transactionService';
import { type GroupDetails } from '../types/groups';
import { type CreateTransactionInput, type LedgerEntry } from '../types/transactions';
import { normalizeTransactionNote } from '../utils/transactionValidation';
import { useAuth } from './useAuth';

export const groupQueryKey = (groupId: string) => ['group', groupId] as const;
export const transactionsQueryKey = (groupId: string) => ['transactions', groupId] as const;

export function useGroupDetails(groupId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: groupQueryKey(groupId),
    queryFn: () => getGroupDetails(groupId, user!.id),
    enabled: Boolean(groupId && user),
  });
}

export function useTransactions(groupId: string) {
  return useQuery({
    queryKey: transactionsQueryKey(groupId),
    queryFn: () => getTransactions(groupId),
    enabled: Boolean(groupId),
  });
}

export function useLedgerRealtime(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`transactions:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `group_id=eq.${groupId}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: transactionsQueryKey(groupId) }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}

type AddTransactionContext = {
  previous?: LedgerEntry[];
  optimisticId: string;
};

export function useAddTransaction(group: GroupDetails) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = transactionsQueryKey(group.id);

  return useMutation<LedgerEntry, Error, CreateTransactionInput, AddTransactionContext>({
    mutationFn: (input) => addTransaction(user!.id, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<LedgerEntry[]>(queryKey);
      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const debtor = group.members.find((member) => member.userId === input.debtorUserId)!;
      const creditor = group.members.find((member) => member.userId === input.creditorUserId)!;
      const creator = group.members.find((member) => member.userId === user!.id)!;

      queryClient.setQueryData<LedgerEntry[]>(queryKey, (entries = []) => [
        {
          id: optimisticId,
          groupId: group.id,
          debtor: { id: debtor.userId, username: debtor.username, displayName: debtor.displayName },
          creditor: {
            id: creditor.userId,
            username: creditor.username,
            displayName: creditor.displayName,
          },
          quantity: input.quantity,
          note: normalizeTransactionNote(input.note),
          createdBy: {
            id: creator.userId,
            username: creator.username,
            displayName: creator.displayName,
          },
          createdAt: new Date().toISOString(),
          reversedAt: null,
          reversedBy: null,
          isOptimistic: true,
        },
        ...entries,
      ]);

      return { previous, optimisticId };
    },
    onError: (_error, _input, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSuccess: (created, _input, context) => {
      queryClient.setQueryData<LedgerEntry[]>(queryKey, (entries = []) =>
        entries.map((entry) => (entry.id === context.optimisticId ? created : entry)),
      );
    },
  });
}

export function useReverseTransaction(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = transactionsQueryKey(groupId);

  return useMutation({
    mutationFn: reverseTransaction,
    onMutate: async (transactionId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<LedgerEntry[]>(queryKey);
      queryClient.setQueryData<LedgerEntry[]>(queryKey, (entries = []) =>
        entries.map((entry) =>
          entry.id === transactionId
            ? {
                ...entry,
                reversedAt: new Date().toISOString(),
                reversedBy: {
                  id: user!.id,
                  username: 'you',
                  displayName: 'You',
                },
              }
            : entry,
        ),
      );
      return { previous };
    },
    onError: (_error, _transactionId, context) =>
      queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });
}
