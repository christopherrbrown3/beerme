type GroupCurrency = {
  name: string;
  plural: string;
  symbol: string;
};

export function formatUnitQuantity(quantity: number, currency: GroupCurrency) {
  const unit = Math.abs(quantity) === 1 ? currency.name : currency.plural;
  return `${quantity} ${unit}`;
}

export function formatUnitSymbols(quantity: number, currency: GroupCurrency, visibleLimit = 6) {
  if (quantity <= 0) return '—';
  if (Number.isInteger(quantity) && quantity <= visibleLimit) {
    return currency.symbol.repeat(quantity);
  }

  return `${currency.symbol} × ${quantity}`;
}
