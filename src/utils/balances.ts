import { type BalanceEntry, type PairBalance, type UserBalance } from '../types/balances';

const QUANTITY_SCALE = 100;

type PairTotal = {
  userAId: string;
  userBId: string;
  signedMinorUnits: number;
};

function toMinorUnits(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new RangeError('Transaction quantities must be finite positive numbers.');
  }

  const scaledQuantity = quantity * QUANTITY_SCALE;
  const minorUnits = Math.round(scaledQuantity);
  if (minorUnits <= 0 || Math.abs(scaledQuantity - minorUnits) > 1e-8) {
    throw new RangeError('Transaction quantities support at most two decimal places.');
  }

  return minorUnits;
}

function scaleQuantity(quantity: number) {
  return Math.round(quantity * QUANTITY_SCALE);
}

function fromMinorUnits(quantity: number) {
  const normalized = quantity / QUANTITY_SCALE;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function getPairKey(userAId: string, userBId: string) {
  return JSON.stringify(userAId < userBId ? [userAId, userBId] : [userBId, userAId]);
}

function buildPairTotals(entries: readonly BalanceEntry[]) {
  const pairTotals = new Map<string, PairTotal>();

  for (const entry of entries) {
    if (entry.reversedAt !== null) continue;
    if (!entry.debtor.id || !entry.creditor.id || entry.debtor.id === entry.creditor.id) {
      throw new RangeError('Transactions must have two different participants.');
    }

    const quantity = toMinorUnits(entry.quantity);
    const [userAId, userBId] =
      entry.debtor.id < entry.creditor.id
        ? [entry.debtor.id, entry.creditor.id]
        : [entry.creditor.id, entry.debtor.id];
    const key = getPairKey(userAId, userBId);
    const current = pairTotals.get(key) ?? { userAId, userBId, signedMinorUnits: 0 };

    current.signedMinorUnits += entry.debtor.id === userAId ? quantity : -quantity;
    pairTotals.set(key, current);
  }

  return pairTotals;
}

function mapPairTotal(total: PairTotal): PairBalance {
  const isSettled = total.signedMinorUnits === 0;
  const userAOwes = total.signedMinorUnits > 0;

  return {
    userAId: total.userAId,
    userBId: total.userBId,
    amount: fromMinorUnits(Math.abs(total.signedMinorUnits)),
    debtorUserId: isSettled ? null : userAOwes ? total.userAId : total.userBId,
    creditorUserId: isSettled ? null : userAOwes ? total.userBId : total.userAId,
    isSettled,
  };
}

export function calculatePairBalance(
  entries: readonly BalanceEntry[],
  userAId: string,
  userBId: string,
): PairBalance {
  if (!userAId || !userBId || userAId === userBId) {
    throw new RangeError('A pair balance requires two different users.');
  }

  const pairTotal = buildPairTotals(entries).get(getPairKey(userAId, userBId));
  if (pairTotal) return { ...mapPairTotal(pairTotal), userAId, userBId };

  return {
    userAId,
    userBId,
    amount: 0,
    debtorUserId: null,
    creditorUserId: null,
    isSettled: true,
  };
}

export function calculatePairBalances(entries: readonly BalanceEntry[]): PairBalance[] {
  return [...buildPairTotals(entries).values()]
    .map(mapPairTotal)
    .sort((a, b) => a.userAId.localeCompare(b.userAId) || a.userBId.localeCompare(b.userBId));
}

export function calculateDirectionalBalance(
  entries: readonly BalanceEntry[],
  debtorUserId: string,
  creditorUserId: string,
) {
  const pairBalance = calculatePairBalance(entries, debtorUserId, creditorUserId);
  return pairBalance.debtorUserId === debtorUserId ? pairBalance.amount : 0;
}

export function calculateGroupBalances(
  entries: readonly BalanceEntry[],
  memberIds: readonly string[] = [],
): UserBalance[] {
  const pairBalances = calculatePairBalances(entries);
  const allUserIds = new Set(memberIds.filter(Boolean));

  for (const pair of pairBalances) {
    allUserIds.add(pair.userAId);
    allUserIds.add(pair.userBId);
  }

  const balances = new Map<string, UserBalance>();
  for (const userId of allUserIds) {
    balances.set(userId, { userId, owed: 0, owes: 0, net: 0 });
  }

  for (const pair of pairBalances) {
    if (pair.isSettled) continue;

    const debtor = balances.get(pair.debtorUserId!)!;
    const creditor = balances.get(pair.creditorUserId!)!;
    debtor.owes = fromMinorUnits(scaleQuantity(debtor.owes) + scaleQuantity(pair.amount));
    creditor.owed = fromMinorUnits(scaleQuantity(creditor.owed) + scaleQuantity(pair.amount));
  }

  for (const balance of balances.values()) {
    balance.net = fromMinorUnits(scaleQuantity(balance.owed) - scaleQuantity(balance.owes));
  }

  return [...balances.values()].sort((a, b) => a.userId.localeCompare(b.userId));
}

export function calculateUserBalance(
  entries: readonly BalanceEntry[],
  userId: string,
): UserBalance {
  if (!userId) throw new RangeError('A user ID is required to calculate a balance.');

  return (
    calculateGroupBalances(entries, [userId]).find((balance) => balance.userId === userId) ?? {
      userId,
      owed: 0,
      owes: 0,
      net: 0,
    }
  );
}
