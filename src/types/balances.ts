export type BalanceEntry = {
  debtor: { id: string };
  creditor: { id: string };
  quantity: number;
  reversedAt: string | null;
};

export type PairBalance = {
  userAId: string;
  userBId: string;
  amount: number;
  debtorUserId: string | null;
  creditorUserId: string | null;
  isSettled: boolean;
};

export type UserBalance = {
  userId: string;
  owed: number;
  owes: number;
  net: number;
};
