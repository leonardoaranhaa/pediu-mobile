import { describe, expect, it } from "vitest";
import { addProductToCart, cartDeliveryFee, cartItemCount, cartSubtotal, cartTotal, updateCartQuantity, type CartProduct } from "../lib/cart";

const burger: CartProduct = {
  id: 1,
  storeId: 7,
  name: "Hambúrguer",
  storeName: "Loja 7",
  category: "Lanches",
  price: "18.00",
  deliveryFee: "5.00",
};
const dessert: CartProduct = { ...burger, id: 2, name: "Bolo", category: "Doces", price: "12.50" };
const otherStore: CartProduct = { ...burger, id: 3, storeId: 8, storeName: "Loja 8" };

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
  });

  it("rejects a product from another store without changing the cart", () => {
    const current = addProductToCart([], burger).items;
    const result = addProductToCart(current, otherStore);

    expect(result.error).toContain("mesma loja");
    expect(result.items).toEqual(current);
  });

  it("removes an item when quantity reaches zero", () => {
    const current = addProductToCart([], burger, 2).items;
    expect(updateCartQuantity(current, burger.id, 1)[0]?.quantity).toBe(1);
    expect(updateCartQuantity(current, burger.id, 0)).toEqual([]);
  });
});
