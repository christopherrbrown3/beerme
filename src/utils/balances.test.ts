import { describe, expect, it } from 'vitest';

import { type BalanceEntry } from '../types/balances';
import {
  calculateDirectionalBalance,
  calculateGroupBalances,
  calculatePairBalance,
  calculatePairBalances,
  calculateUserBalance,
} from './balances';

function entry(
  debtorUserId: string,
  creditorUserId: string,
  quantity: number,
  reversedAt: string | null = null,
): BalanceEntry {
  return {
    debtor: { id: debtorUserId },
    creditor: { id: creditorUserId },
    quantity,
    reversedAt,
  };
}

describe('calculatePairBalance', () => {
  it('returns a settled result when there is no history', () => {
    expect(calculatePairBalance([], 'alex', 'chris')).toEqual({
      userAId: 'alex',
      userBId: 'chris',
      amount: 0,
      debtorUserId: null,
      creditorUserId: null,
      isSettled: true,
    });
  });

  it('calculates a one-way obligation', () => {
    expect(calculatePairBalance([entry('alex', 'chris', 3)], 'alex', 'chris')).toMatchObject({
      amount: 3,
      debtorUserId: 'alex',
      creditorUserId: 'chris',
      isSettled: false,
    });
  });

  it('nets mutual obligations regardless of argument or transaction order', () => {
    const transactions = [entry('chris', 'alex', 1), entry('alex', 'chris', 3)];
    const reversedOrder = [...transactions].reverse();

    expect(calculatePairBalance(transactions, 'chris', 'alex')).toMatchObject({
      userAId: 'chris',
      userBId: 'alex',
      amount: 2,
      debtorUserId: 'alex',
      creditorUserId: 'chris',
    });
    expect(calculatePairBalance(reversedOrder, 'alex', 'chris')).toMatchObject({
      amount: 2,
      debtorUserId: 'alex',
      creditorUserId: 'chris',
    });
  });

  it('calculates every relationship once in stable order', () => {
    expect(
      calculatePairBalances([
        entry('sam', 'jordan', 2),
        entry('chris', 'alex', 1),
        entry('alex', 'chris', 1),
      ]),
    ).toEqual([
      {
        userAId: 'alex',
        userBId: 'chris',
        amount: 0,
        debtorUserId: null,
        creditorUserId: null,
        isSettled: true,
      },
      {
        userAId: 'jordan',
        userBId: 'sam',
        amount: 2,
        debtorUserId: 'sam',
        creditorUserId: 'jordan',
        isSettled: false,
      },
    ]);
  });

  it('recognizes exactly settled relationships', () => {
    expect(
      calculatePairBalance([entry('alex', 'chris', 4), entry('chris', 'alex', 4)], 'alex', 'chris'),
    ).toMatchObject({ amount: 0, debtorUserId: null, creditorUserId: null, isSettled: true });
  });

  it('excludes reversed entries without mutating the source history', () => {
    const transactions = [
      entry('alex', 'chris', 3, '2026-07-17T01:00:00.000Z'),
      entry('chris', 'alex', 1),
    ];
    const original = structuredClone(transactions);

    expect(calculatePairBalance(transactions, 'alex', 'chris')).toMatchObject({
      amount: 1,
      debtorUserId: 'chris',
      creditorUserId: 'alex',
    });
    expect(transactions).toEqual(original);
  });

  it('ignores transactions between unrelated users', () => {
    expect(
      calculatePairBalance([entry('alex', 'chris', 2), entry('jordan', 'sam', 7)], 'alex', 'chris'),
    ).toMatchObject({ amount: 2, debtorUserId: 'alex', creditorUserId: 'chris' });
  });

  it('uses scaled arithmetic for decimal-safe future units', () => {
    expect(
      calculatePairBalance(
        [entry('alex', 'chris', 0.1), entry('alex', 'chris', 0.2)],
        'alex',
        'chris',
      ).amount,
    ).toBe(0.3);
  });

  it('rejects invalid participants and active quantities', () => {
    expect(() => calculatePairBalance([], 'alex', 'alex')).toThrow(RangeError);
    expect(() => calculatePairBalance([entry('alex', 'alex', 1)], 'alex', 'chris')).toThrow(
      RangeError,
    );
    expect(() => calculatePairBalance([entry('alex', 'chris', 0)], 'alex', 'chris')).toThrow(
      RangeError,
    );
    expect(() =>
      calculatePairBalance([entry('alex', 'chris', Number.NaN)], 'alex', 'chris'),
    ).toThrow(RangeError);
    expect(() => calculatePairBalance([entry('alex', 'chris', 0.001)], 'alex', 'chris')).toThrow(
      RangeError,
    );
    expect(() => calculatePairBalance([entry('alex', 'chris', 1.234)], 'alex', 'chris')).toThrow(
      RangeError,
    );
  });

  it('does not let invalid reversed history affect current balances', () => {
    expect(
      calculatePairBalance([entry('alex', 'alex', 0, '2026-07-17T01:00:00.000Z')], 'alex', 'chris')
        .isSettled,
    ).toBe(true);
  });
});

describe('directional balances', () => {
  const transactions = [entry('alex', 'chris', 3), entry('chris', 'alex', 1)];

  it('returns only the remaining amount the row user owes the column user', () => {
    expect(calculateDirectionalBalance(transactions, 'alex', 'chris')).toBe(2);
    expect(calculateDirectionalBalance(transactions, 'chris', 'alex')).toBe(0);
  });
});

describe('user and group balances', () => {
  const transactions = [
    entry('alex', 'chris', 3),
    entry('chris', 'alex', 1),
    entry('chris', 'jordan', 4),
    entry('sam', 'chris', 5),
    entry('alex', 'sam', 9, '2026-07-17T01:00:00.000Z'),
  ];

  it('nets each relationship before calculating what a user owes and is owed', () => {
    expect(calculateUserBalance(transactions, 'chris')).toEqual({
      userId: 'chris',
      owed: 7,
      owes: 4,
      net: 3,
    });
  });

  it('uses a negative net for a user who owes more than they are owed', () => {
    expect(calculateUserBalance(transactions, 'alex')).toEqual({
      userId: 'alex',
      owed: 0,
      owes: 2,
      net: -2,
    });
  });

  it('includes provided members with zero balances and deduplicates IDs', () => {
    const balances = calculateGroupBalances(transactions, ['chris', 'taylor', 'taylor']);

    expect(balances.find((balance) => balance.userId === 'taylor')).toEqual({
      userId: 'taylor',
      owed: 0,
      owes: 0,
      net: 0,
    });
    expect(balances.filter((balance) => balance.userId === 'taylor')).toHaveLength(1);
  });

  it('infers active participants not included in the member list', () => {
    expect(calculateGroupBalances([entry('alex', 'chris', 2)], ['alex'])).toEqual([
      { userId: 'alex', owed: 0, owes: 2, net: -2 },
      { userId: 'chris', owed: 2, owes: 0, net: 2 },
    ]);
  });

  it('preserves the zero-sum group invariant', () => {
    const netTotal = calculateGroupBalances(transactions).reduce(
      (total, balance) => total + balance.net,
      0,
    );

    expect(netTotal).toBe(0);
  });

  it('requires a user ID for an individual balance', () => {
    expect(() => calculateUserBalance(transactions, '')).toThrow(RangeError);
  });
});
