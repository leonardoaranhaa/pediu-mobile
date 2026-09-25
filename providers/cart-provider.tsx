import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Auth from "@/lib/_core/auth";
import { addProductToCart, cartDeliveryFee, cartItemCount, cartSubtotal, cartTotal, removeCartItem, updateCartNote, updateCartQuantity, type CartItem, type CartProduct } from "@/lib/cart";

const LEGACY_CART_STORAGE_KEY = "pediu:cart:v1";
const userCartStorageKey = (userId: number) => `pediu:cart:user:${userId}:v1`;

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

function parseStoredCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as CartItem[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && Number.isInteger(item.id) && Number.isInteger(item.storeId) && Number.isInteger(item.quantity) && item.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const unsubscribe = Auth.subscribeUserInfo((user) => {
      if (!active) return;
      setSessionUserId(user?.id ?? null);
    });
    if (Platform.OS !== "web") {
      void Auth.getUserInfo().then((user) => {
        if (active) setSessionUserId(user?.id ?? null);
      });
    } else {
      // On web, localStorage is only a hint. The server-authenticated useAuth
      // flow emits the identity event after validating the HttpOnly cookie.
      setSessionUserId(null);
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionUserId === undefined) return;
    let active = true;
    setHydrated(false);
    setItems([]);
    setError(null);

    const load = async () => {
      try {
        if (sessionUserId === null) {
          await AsyncStorage.removeItem(LEGACY_CART_STORAGE_KEY);
          if (active) setHydrated(true);
          return;
        }

        const storageKey = userCartStorageKey(sessionUserId);
        let stored = await AsyncStorage.getItem(storageKey);
        if (!stored) {
          const legacy = await AsyncStorage.getItem(LEGACY_CART_STORAGE_KEY);
          if (legacy) {
            stored = legacy;
            await AsyncStorage.setItem(storageKey, legacy);
            await AsyncStorage.removeItem(LEGACY_CART_STORAGE_KEY);
          }
        }
        if (active) setItems(parseStoredCart(stored));
      } catch {
        if (active) setError("Não foi possível restaurar o carrinho salvo.");
      } finally {
        if (active) setHydrated(true);
      }
    };

    void load();
    return () => { active = false; };
  }, [sessionUserId]);

  useEffect(() => {
    if (!hydrated || sessionUserId === undefined || sessionUserId === null) return;
    void AsyncStorage.setItem(userCartStorageKey(sessionUserId), JSON.stringify(items)).catch(() => setError("Não foi possível salvar o carrinho neste dispositivo."));
  }, [hydrated, items, sessionUserId]);

  const addItem = useCallback((product: CartProduct, quantity = 1) => {
    if (sessionUserId === undefined) return { ok: false, error: "Aguarde a sincronização da sua sessão." };
    if (sessionUserId === null) return { ok: false, error: "Entre para salvar itens no seu carrinho." };
    if (!hydrated) return { ok: false, error: "Aguarde o carrinho terminar de carregar." };
    const result = addProductToCart(items, product, quantity);
    if (result.error) {
      setError(result.error);
      return { ok: false, error: result.error };
    }
    setError(null);
    setItems(result.items);
    return { ok: true };
  }, [hydrated, items, sessionUserId]);

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
