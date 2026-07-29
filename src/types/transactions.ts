export type LedgerProfile = {
  id: string;
  username: string;
  displayName: string;
};

export type TransactionKind = 'iou' | 'settlement';

export type LedgerEntry = {
  id: string;
  groupId: string;
  kind: TransactionKind;
  debtor: LedgerProfile;
  creditor: LedgerProfile;
  quantity: number;
  note: string | null;
  createdBy: LedgerProfile;
  createdAt: string;
  reversedAt: string | null;
  reversedBy: LedgerProfile | null;
  isOptimistic?: boolean;
};

export type CreateTransactionInput = {
  groupId: string;
  debtorUserId: string;
  creditorUserId: string;
  quantity: number;
  note: string;
};

export type SettleUpInput = {
  groupId: string;
  creditorUserId: string;
  quantity: number;
};

export type TransactionParties = {
  debtorUserId: string;
  creditorUserId: string;
};
