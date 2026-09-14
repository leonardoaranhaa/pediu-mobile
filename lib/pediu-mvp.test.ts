import { describe, expect, it } from "vitest";

import { advanceOrderStatus, canPlaceOrder, filterCatalog, formatLocationLabel, orderProgress, pixPaymentLabel } from "./pediu-mvp";

describe("Pediu MVP domain", () => {
  it("advances an order through the delivery lifecycle", () => {
    expect(advanceOrderStatus("Pendente")).toBe("Preparando");
    expect(advanceOrderStatus("Preparando")).toBe("A caminho");
    expect(advanceOrderStatus("A caminho")).toBe("Entregue");
    expect(advanceOrderStatus("Entregue")).toBe("Entregue");
  });

  it("filters catalog by category and availability", () => {
    const products = [
      { id: 1, name: "Cupcake", category: "Doces", available: true },
      { id: 2, name: "Bolo esgotado", category: "Doces", available: false },
      { id: 3, name: "X-Bacon", category: "Lanches", available: true },
    ];

    expect(filterCatalog(products, "Doces").map((product) => product.name)).toEqual(["Cupcake"]);
    expect(filterCatalog(products, "Tudo")).toHaveLength(3);
  });

  it("only allows checkout when the cart has products", () => {
    expect(canPlaceOrder(0)).toBe(false);
    expect(canPlaceOrder(1)).toBe(true);
  });

  it("provides stable progress, PIX and location feedback labels", () => {
    expect(orderProgress("A caminho")).toBe(78);
    expect(pixPaymentLabel("pending")).toContain("aguardando confirmação");
    expect(formatLocationLabel(-23.5505, -46.6333)).toBe("-23.550, -46.633");
  });
});
