import { describe, expect, it } from "vitest";
import {
  MARKET_CATEGORY_SUGGESTIONS,
  MERCHANT_CATEGORY_SUGGESTIONS,
  SEARCH_QUICK_CATEGORIES,
  catalogPlaceholder,
} from "../lib/catalog-copy";
import {
  orderStatusCopy,
  paymentStatusLabel,
  trackingEventLabel,
  trackingFreshnessLabel,
} from "../lib/order-copy";

describe("Pediu catalog and order copy", () => {
  it("keeps local catalog suggestions useful for food and market stores", () => {
    expect(MERCHANT_CATEGORY_SUGGESTIONS).toContain("Pizza");
    expect(MERCHANT_CATEGORY_SUGGESTIONS).toContain("Açaí");
    expect(MARKET_CATEGORY_SUGGESTIONS).toContain("Hortifruti");
    expect(MARKET_CATEGORY_SUGGESTIONS).toContain("Mercearia");
    expect(SEARCH_QUICK_CATEGORIES).toContain("Flash");
    expect(catalogPlaceholder.price).toContain(",");
  });

  it("translates persisted order states without changing domain values", () => {
    expect(orderStatusCopy("Preparando")).toMatchObject({
      label: "Em preparo",
    });
    expect(orderStatusCopy("A caminho").detail).toContain("saiu para entrega");
    expect(orderStatusCopy("Cancelado").label).toBe("Pedido cancelado");
    expect(trackingEventLabel("Entregue")).toBe("Pedido entregue");
  });

  it("keeps payment and tracking freshness labels customer-friendly", () => {
    expect(paymentStatusLabel("failed")).toBe("não aprovado");
    expect(paymentStatusLabel("pending")).toBe("aguardando confirmação");
    expect(trackingFreshnessLabel("fresh")).toBe("Posição atualizada recentemente");
  });
});
