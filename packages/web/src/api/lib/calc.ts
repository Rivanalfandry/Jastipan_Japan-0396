/** Harga total = qty x harga satuan, kecuali dioverride manual. */
export function computeTotal(
  qty: number,
  unitPrice: number,
  override?: number | null,
): number {
  if (override !== undefined && override !== null && override > 0) return override;
  return qty * unitPrice;
}

type CalcItem = { qty: number; totalPrice: number; modalPrice: number; kurs: number };

/** Total harga modal = qty x harga modal x kurs. */
export function computeTotalModal(item: CalcItem): number {
  return item.qty * item.modalPrice * (item.kurs || 1);
}

/** Profit = harga total - total harga modal. */
export function computeProfit(item: CalcItem): number {
  return item.totalPrice - computeTotalModal(item);
}
