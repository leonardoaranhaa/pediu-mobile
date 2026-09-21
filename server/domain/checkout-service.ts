export type CheckoutProduct = { id: number; price: string; available: number; storeId: number };
export type CheckoutLine = { productId: number; quantity: number; unitPrice: string; lineTotal: string };

const cents = (value: string | number) => Math.round(Number(value) * 100);
const money = (value: number) => (value / 100).toFixed(2);

export function buildServerQuote(args: {
  products: CheckoutProduct[];
  requested: Array<{ productId: number; quantity: number }>;
  deliveryFee: string;
  serviceFee?: string;
  discount?: string;
}) {
  const byId = new Map(args.products.map(p => [p.id, p]));
  const lines: CheckoutLine[] = [];
  let subtotal = 0;
  for (const item of args.requested) {
    const product = byId.get(item.productId);
    if (!product || product.available !== 1) throw new Error("Produto indisponível");
    const unit = cents(product.price);
    const line = unit * item.quantity;
    subtotal += line;
    lines.push({ productId: product.id, quantity: item.quantity, unitPrice: product.price, lineTotal: money(line) });
  }
  const delivery = cents(args.deliveryFee);
  const service = cents(args.serviceFee ?? "0.00");
  const discount = Math.min(Math.max(cents(args.discount ?? "0.00"), 0), subtotal + delivery + service);
  return { lines, subtotal: money(subtotal), deliveryFee: money(delivery), serviceFee: money(service), discount: money(discount), total: money(subtotal + delivery + service - discount), currency: "BRL" as const };
}
