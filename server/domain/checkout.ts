export type CheckoutItemInput = {
  productId: number;
  quantity: number;
};

export type CheckoutQuote = {
  subtotal: string;
  deliveryFee: string;
  serviceFee: string;
  discount: string;
  total: string;
  currency: "BRL";
};

export type CheckoutRequest = {
  userId: number;
  storeId: number;
  addressId: number;
  deliveryMode: "delivery" | "pickup";
  paymentMethod: "pix" | "card" | "cash";
  items: CheckoutItemInput[];
  couponCode?: string;
  idempotencyKey: string;
};

export function validateCheckoutInput(input: CheckoutRequest): void {
  if (!Number.isInteger(input.userId) || input.userId <= 0) throw new Error("Invalid user");
  if (!Number.isInteger(input.storeId) || input.storeId <= 0) throw new Error("Invalid store");
  if (!Number.isInteger(input.addressId) || input.addressId <= 0) throw new Error("Invalid address");
  if (!input.idempotencyKey.trim()) throw new Error("Idempotency key is required");
  if (input.items.length === 0) throw new Error("Cart is empty");
  for (const item of input.items) {
    if (!Number.isInteger(item.productId) || item.productId <= 0) throw new Error("Invalid product");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error("Invalid quantity");
  }
}

/**
 * Monetary totals are deliberately not calculated here from client-provided prices.
 * The application service must load current product prices and store delivery rules
 * from the database before constructing a quote/order snapshot.
 */
export function assertServerPricing(): never {
  throw new Error("Checkout pricing must be resolved by the server");
}
