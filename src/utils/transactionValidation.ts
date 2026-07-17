export function validateTransactionParties(debtorUserId: string, creditorUserId: string) {
  if (!debtorUserId || !creditorUserId) return 'Choose both people.';
  if (debtorUserId === creditorUserId) return 'Choose two different people.';
  return null;
}

export function validateTransactionQuantity(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    return 'Quantity must be a whole number between 1 and 99.';
  }

  return null;
}

export function normalizeTransactionNote(value: string) {
  const note = value.trim();
  return note.length > 0 ? note : null;
}

export function validateTransactionNote(value: string) {
  if (value.trim().length > 280) return 'Note must be 280 characters or fewer.';
  return null;
}
