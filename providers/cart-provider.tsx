import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addProductToCart, cartDeliveryFee, cartItemCount, cartSubtotal, cartTotal, removeCartItem, updateCartNote, updateCartQuantity, type CartItem, type CartProduct } from "@/lib/cart";

const CART_STORAGE_KEY = "pediu:cart:v1";

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  error: string | null;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (product: CartProduct, quantity?: number) => { ok: boolean; error?: string };
  updateQuantity: (productId: number, quantity: number) => void;
  updateNote: (productId: number, note: string) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((value) => {
        if (!active || !value) return;
        try {
          const parsed = JSON.parse(value) as CartItem[];
          if (Array.isArray(parsed)) setItems(parsed.filter((item) => item && Number.isInteger(item.id) && Number.isInteger(item.storeId) && Number.isInteger(item.quantity) && item.quantity > 0));
        } catch {
          setError("Não foi possível restaurar o carrinho salvo.");
        }
      })
      .catch(() => { if (active) setError("Não foi possível acessar o carrinho salvo."); })
      .finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch(() => setError("Não foi possível salvar o carrinho neste dispositivo."));
  }, [hydrated, items]);

  const addItem = useCallback((product: CartProduct, quantity = 1) => {
    const result = addProductToCart(items, product, quantity);
    if (result.error) {
      setError(result.error);
      return { ok: false, error: result.error };
    }
    setError(null);
    setItems(result.items);
    return { ok: true };
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    error,
    itemCount: cartItemCount(items),
    subtotal: cartSubtotal(items),
    deliveryFee: cartDeliveryFee(items),
    total: cartTotal(items),
    addItem,
    updateQuantity: (productId, quantity) => setItems((current) => updateCartQuantity(current, productId, quantity)),
    updateNote: (productId, note) => setItems((current) => updateCartNote(current, productId, note)),
    removeItem: (productId) => setItems((current) => removeCartItem(current, productId)),
    clear: () => setItems([]),
  }), [addItem, error, hydrated, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
