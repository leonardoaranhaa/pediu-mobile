export type CartProduct = {
  id: number;
  storeId: number;
  name: string;
  storeName: string;
  category: string;
  description?: string | null;
  price: string;
  deliveryFee: string;
  emoji?: string;
};

export type CartItem = CartProduct & {
  quantity: number;
  note?: string;
};

export type CartResult = {
  items: CartItem[];
  error?: string;
};

export function addProductToCart(items: CartItem[], product: CartProduct, quantity = 1): CartResult {
  if (!Number.isInteger(quantity) || quantity < 1) return { items, error: "A quantidade precisa ser maior que zero." };
  if (items.length > 0 && items[0].storeId !== product.storeId) return { items, error: "Seu pedido só pode reunir produtos da mesma loja." };
  const existing = items.find((item) => item.id === product.id);
  if (existing) {
    return { items: items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item) };
  }
  return { items: [...items, { ...product, quantity }] };
}

export function updateCartQuantity(items: CartItem[], productId: number, quantity: number): CartItem[] {
  if (!Number.isInteger(quantity) || quantity <= 0) return items.filter((item) => item.id !== productId);
  return items.map((item) => item.id === productId ? { ...item, quantity } : item);
}

export function removeCartItem(items: CartItem[], productId: number): CartItem[] {
  return items.filter((item) => item.id !== productId);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
}

export function cartDeliveryFee(items: CartItem[]): number {
  return items.length > 0 ? Number(items[0].deliveryFee) : 0;
}

export function cartTotal(items: CartItem[]): number {
  return cartSubtotal(items) + cartDeliveryFee(items);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
