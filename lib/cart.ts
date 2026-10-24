export type StoreKind = "restaurant" | "market" | "service";

export type CartOption = {
  id: number;
  groupId: number;
  groupName: string;
  name: string;
  priceDelta: string;
};

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
  storeKind?: StoreKind;
  flashEnabled?: boolean;
  saleUnit?: string | null;
  packSize?: string | number | null;
  options?: CartOption[];
};

export type CartItem = CartProduct & {
  quantity: number;
  note?: string;
};

export function cartLineKey(item: { id: number; options?: CartOption[] }) {
  const ids = (item.options ?? []).map((option) => option.id).sort((a, b) => a - b);
  return ids.length ? `${item.id}:${ids.join(",")}` : String(item.id);
}

function matchesLine(item: CartItem, key: number | string) {
  if (typeof key === "number") return item.id === key;
  return cartLineKey(item) === key;
}

export type CartResult = {
  items: CartItem[];
  error?: string;
};

const VERTICAL_LABEL: Record<StoreKind, string> = {
  restaurant: "Restaurante",
  market: "Mercado",
  service: "Serviço",
};

export function normalizeStoreKind(kind?: string | null): StoreKind {
  if (kind === "market" || kind === "service" || kind === "restaurant") return kind;
  return "restaurant";
}

export function storeKindLabel(kind?: string | null): string {
  return VERTICAL_LABEL[normalizeStoreKind(kind)];
}

export function addProductToCart(items: CartItem[], product: CartProduct, quantity = 1): CartResult {
  if (!Number.isInteger(quantity) || quantity < 1) return { items, error: "A quantidade precisa ser maior que zero." };

  const nextKind = normalizeStoreKind(product.storeKind);
  const nextProduct: CartProduct = { ...product, storeKind: nextKind, flashEnabled: Boolean(product.flashEnabled) };

  if (items.length > 0) {
    const currentKind = normalizeStoreKind(items[0].storeKind);
    if (currentKind !== nextKind) {
      return {
        items,
        error: `Sua sacola é de ${storeKindLabel(currentKind)}. Não misture com ${storeKindLabel(nextKind)} no mesmo pedido.`,
      };
    }
    if (items[0].storeId !== nextProduct.storeId) {
      return { items, error: "Seu pedido só pode reunir produtos da mesma loja." };
    }
  }

  const lineKey = cartLineKey(nextProduct);
  const existing = items.find((item) => cartLineKey(item) === lineKey);
  if (existing) {
    return {
      items: items.map((item) =>
        cartLineKey(item) === lineKey ? { ...item, quantity: item.quantity + quantity } : item,
      ),
    };
  }
  return { items: [...items, { ...nextProduct, quantity }] };
}

export function updateCartQuantity(items: CartItem[], productId: number | string, quantity: number): CartItem[] {
  if (!Number.isInteger(quantity) || quantity <= 0) return items.filter((item) => !matchesLine(item, productId));
  return items.map((item) => matchesLine(item, productId) ? { ...item, quantity } : item);
}

export function updateCartNote(items: CartItem[], productId: number | string, note: string): CartItem[] {
  return items.map((item) => matchesLine(item, productId) ? { ...item, note: note.trim().slice(0, 500) || undefined } : item);
}

export function removeCartItem(items: CartItem[], productId: number | string): CartItem[] {
  return items.filter((item) => !matchesLine(item, productId));
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

export function cartStoreKind(items: CartItem[]): StoreKind | null {
  return items.length ? normalizeStoreKind(items[0].storeKind) : null;
}

export function cartFlashEligible(items: CartItem[]): boolean {
  return items.length > 0 && Boolean(items[0].flashEnabled);
}
