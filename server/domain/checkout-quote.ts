export type QuoteLine = { unitPrice: string; quantity: number };

function cents(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid monetary value");
  return Math.round(parsed * 100);
}

function money(value: number): string {
  return (value / 100).toFixed(2);
}

export function calculateCheckoutQuote(lines: QuoteLine[], deliveryFee: string, serviceFee = "0.00", discount = "0.00") {
  if (!lines.length) throw new Error("Cart is empty");
  const subtotalCents = lines.reduce((sum, line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error("Invalid quantity");
    return sum + cents(line.unitPrice) * line.quantity;
  }, 0);
  const totalCents = subtotalCents + cents(deliveryFee) + cents(serviceFee) - cents(discount);
  if (totalCents < 0) throw new Error("Invalid checkout total");
  return {
    subtotal: money(subtotalCents),
    deliveryFee: money(cents(deliveryFee)),
    serviceFee: money(cents(serviceFee)),
    discount: money(cents(discount)),
    total: money(totalCents),
    currency: "BRL" as const,
  };
}
