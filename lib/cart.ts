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
  /** Presente quando o produto é de outra loja e mode !== "replace". */
  conflictStore?: { currentStoreId: number; currentStoreName: string; nextStoreName: string };
};

export type AddToCartMode = "reject" | "replace";

export function addProductToCart(
  items: CartItem[],
  product: CartProduct,
  quantity = 1,
  mode: AddToCartMode = "reject",
): CartResult {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { items, error: "A quantidade precisa ser maior que zero." };
  }

  if (items.length > 0 && items[0].storeId !== product.storeId) {
    if (mode === "replace") {
      return {
        items: [{ ...product, quantity }],
      };
    }
    return {
      items,
      error:
        "Seu pedido só pode reunir produtos da mesma loja. Limpe o carrinho ou troque de loja para continuar.",
      conflictStore: {
        currentStoreId: items[0].storeId,
        currentStoreName: items[0].storeName,
        nextStoreName: product.storeName,
      },
    };
  }

  const existing = items.find((item) => item.id === product.id);
  if (existing) {
    return {
      items: items.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      ),
    };
  }
  return { items: [...items, { ...product, quantity }] };
}

export function updateCartQuantity(
  items: CartItem[],
  productId: number,
  quantity: number,
): CartItem[] {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return items.filter((item) => item.id !== productId);
  }
  return items.map((item) =>
    item.id === productId ? { ...item, quantity } : item,
  );
}

export function updateCartNote(
  items: CartItem[],
  productId: number,
  note: string,
): CartItem[] {
  return items.map((item) =>
    item.id === productId
      ? { ...item, note: note.trim().slice(0, 500) || undefined }
      : item,
  );
}

export function removeCartItem(
  items: CartItem[],
  productId: number,
): CartItem[] {
  return items.filter((item) => item.id !== productId);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );
}

/** Taxa de entrega estimada no cliente: valor da loja no primeiro item. O servidor recalcula no checkout. */
export function cartDeliveryFee(items: CartItem[]): number {
  return items.length > 0 ? Number(items[0].deliveryFee) : 0;
}

export function cartTotal(items: CartItem[]): number {
  return cartSubtotal(items) + cartDeliveryFee(items);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
