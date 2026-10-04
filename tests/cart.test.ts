import { describe, expect, it } from "vitest";
import { addProductToCart, cartDeliveryFee, cartFlashEligible, cartItemCount, cartStoreKind, cartSubtotal, cartTotal, updateCartNote, updateCartQuantity, type CartProduct } from "../lib/cart";

const burger: CartProduct = {
  id: 1,
  storeId: 7,
  name: "Hambúrguer",
  storeName: "Loja 7",
  category: "Lanches",
  price: "18.00",
  deliveryFee: "5.00",
  storeKind: "restaurant",
  flashEnabled: true,
};
const dessert: CartProduct = { ...burger, id: 2, name: "Bolo", category: "Doces", price: "12.50" };
const otherStore: CartProduct = { ...burger, id: 3, storeId: 8, storeName: "Loja 8" };
const banana: CartProduct = {
  id: 4,
  storeId: 9,
  name: "Banana",
  storeName: "Mercado",
  category: "Hortifruti",
  price: "3.00",
  deliveryFee: "2.00",
  storeKind: "market",
  flashEnabled: false,
};

describe("cart domain", () => {
  it("merges repeated products and calculates subtotal, delivery and total", () => {
    const first = addProductToCart([], burger);
    const second = addProductToCart(first.items, burger, 2);
    const withDessert = addProductToCart(second.items, dessert);

    expect(withDessert.items).toHaveLength(2);
    expect(cartItemCount(withDessert.items)).toBe(4);
    expect(cartSubtotal(withDessert.items)).toBe(66.5);
    expect(cartDeliveryFee(withDessert.items)).toBe(5);
    expect(cartTotal(withDessert.items)).toBe(71.5);
    expect(cartStoreKind(withDessert.items)).toBe("restaurant");
    expect(cartFlashEligible(withDessert.items)).toBe(true);
  });

  it("rejects a product from another store without changing the cart", () => {
    const current = addProductToCart([], burger).items;
    const result = addProductToCart(current, otherStore);

    expect(result.error).toContain("mesma loja");
    expect(result.items).toEqual(current);
  });

  it("blocks multi-vertical bags (market + restaurant)", () => {
    const current = addProductToCart([], burger).items;
    const result = addProductToCart(current, banana);

    expect(result.error).toMatch(/Mercado|Restaurante/);
    expect(result.error).toContain("Não misture");
    expect(result.items).toEqual(current);
  });

  it("removes an item when quantity reaches zero", () => {
    const current = addProductToCart([], burger, 2).items;
    expect(updateCartQuantity(current, burger.id, 1)[0]?.quantity).toBe(1);
    expect(updateCartQuantity(current, burger.id, 0)).toEqual([]);
  });

  it("stores a bounded item note", () => {
    const current = addProductToCart([], burger).items;
    expect(updateCartNote(current, burger.id, "  sem cebola  ")[0]?.note).toBe("sem cebola");
    expect(updateCartNote(current, burger.id, "   ")[0]?.note).toBeUndefined();
  });
});
