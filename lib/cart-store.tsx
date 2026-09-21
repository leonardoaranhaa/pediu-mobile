import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { productId: number; storeId: number; name: string; price: number; quantity: number; imageUrl?: string | null };
type CartContextValue = { items: CartItem[]; storeId: number | null; subtotal: number; addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void; removeItem: (productId: number) => void; updateQuantity: (productId: number, quantity: number) => void; clear: () => void };
const KEY = "pediu:cart:v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { AsyncStorage.getItem(KEY).then((raw) => { if (raw) { try { setItems(JSON.parse(raw)); } catch {} } }); }, []);
  useEffect(() => { AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {}); }, [items]);
  const value = useMemo<CartContextValue>(() => ({
    items,
    storeId: items[0]?.storeId ?? null,
    subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    addItem: (item, quantity = 1) => setItems((current) => {
      if (current.length && current[0].storeId !== item.storeId) return current;
      const found = current.find((i) => i.productId === item.productId);
      if (found) return current.map((i) => i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i);
      return [...current, { ...item, quantity }];
    }),
    removeItem: (productId) => setItems((current) => current.filter((i) => i.productId !== productId)),
    updateQuantity: (productId, quantity) => setItems((current) => quantity <= 0 ? current.filter((i) => i.productId !== productId) : current.map((i) => i.productId === productId ? { ...i, quantity } : i)),
    clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart must be used inside CartProvider"); return value; }
