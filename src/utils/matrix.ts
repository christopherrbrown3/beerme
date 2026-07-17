export function getMatrixHeatTone(quantity: number) {
  if (quantity <= 0) return 'even';
  if (quantity <= 2) return 'low';
  if (quantity <= 5) return 'medium';
  return 'high';
}
