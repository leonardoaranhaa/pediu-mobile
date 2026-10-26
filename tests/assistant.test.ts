import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/_core/openai", () => ({
  openAiConfigured: () => true,
  openAiToolStep: vi.fn(),
  AI_UNAVAILABLE: "O assistente não está disponível agora. Você pode continuar pelo aplicativo.",
}));

import { openAiToolStep } from "../server/_core/openai";
import * as db from "../server/db";
import {
  cancelAssistantTurn,
  confirmAssistantTurn,
  runAssistantChat,
} from "../server/assistant";
import { performAssistantTool } from "../server/assistant-actions";
import { resetAssistantConfirmationsForTests, saveAssistantConfirmation } from "../server/assistant-confirmations";
import { toolsForAudience } from "../server/assistant-tools";

const customer = { id: 7, role: "user", email: "cliente@example.com", name: "Cliente" };
const merchant = { id: 8, role: "merchant", email: "loja@example.com", name: "Loja" };

describe("assistant tools by role", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetAssistantConfirmationsForTests();
  });

  it("hides lojista tools from a customer account", async () => {
    expect(toolsForAudience("customer").map((tool) => tool.name)).not.toContain("pause_store");
    expect(toolsForAudience("merchant").map((tool) => tool.name)).not.toContain("place_order");
    expect(toolsForAudience("guest").map((tool) => tool.name)).toEqual(["search_catalog", "view_menu"]);
    const pause = vi.spyOn(db, "saveStoreOps");
    const effect = await performAssistantTool("pause_store", { minutes: 30 }, {
      user: customer,
      audience: "customer",
      cart: [],
    });
    expect(effect.text).toMatch(/não pode/);
    expect(effect.pending).toBeUndefined();
    expect(pause).not.toHaveBeenCalled();
  });

  it("does not cancel another person's order", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(undefined as never);
    const transition = vi.spyOn(db, "transitionOrderStatus");
    const effect = await performAssistantTool("cancel_order", { orderId: 99 }, {
      user: customer,
      audience: "customer",
      cart: [],
    });
    expect(effect.text).toMatch(/Não encontrei/);
    expect(effect.pending).toBeUndefined();
    expect(transition).not.toHaveBeenCalled();
  });

  it("asks for confirmation before changing a price and uses the token once", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue({ id: 3, isOpen: 1 } as never);
    vi.spyOn(db, "listProductsForStore").mockResolvedValue([
      { id: 11, name: "Pizza", category: "Salgados", price: "40.00" },
    ] as never);
    vi.spyOn(db, "getProductForStore").mockResolvedValue({
      id: 11,
      name: "Pizza",
      category: "Salgados",
      description: null,
      price: "40.00",
      saleUnit: "unit",
      packSize: null,
      inventoryTracked: 0,
      stockQuantity: 0,
      imageData: null,
    } as never);
    const update = vi.spyOn(db, "updateStoreProduct").mockResolvedValue(undefined as never);
    vi.spyOn(db, "listAccountRoles").mockResolvedValue(["merchant"]);

    const planned = await performAssistantTool(
      "change_product_price",
      { productId: 11, price: "45.00" },
      { user: merchant, audience: "merchant", cart: [] },
    );
    expect(planned.pending?.summary).toMatch(/45,00/);
    expect(update).not.toHaveBeenCalled();

    const saved = await saveAssistantConfirmation({
      userId: merchant.id,
      tool: planned.pending!.tool,
      payload: planned.pending!.payload,
      summary: planned.pending!.summary,
    });
    const done = await confirmAssistantTurn({
      user: merchant,
      token: saved.token,
      audience: "merchant",
      cart: [],
    });
    expect(done.reply).toMatch(/45,00/);
    expect(update).toHaveBeenCalledTimes(1);

    const again = await confirmAssistantTurn({
      user: merchant,
      token: saved.token,
      audience: "merchant",
      cart: [],
    });
    expect(again.reply).toMatch(/já foi usada/);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("rejects an expired confirmation without changing the price", async () => {
    const update = vi.spyOn(db, "updateStoreProduct").mockResolvedValue(undefined as never);
    const saved = await saveAssistantConfirmation({
      userId: merchant.id,
      tool: "change_product_price",
      payload: { productId: 11, price: "10.00" },
      summary: "Mudar o preço.",
      ttlMs: -1_000,
    });
    const result = await confirmAssistantTurn({
      user: merchant,
      token: saved.token,
      audience: "merchant",
      cart: [],
    });
    expect(result.reply).toMatch(/venceu/);
    expect(update).not.toHaveBeenCalled();
  });

  it("drops a confirmation when the person cancels", async () => {
    const update = vi.spyOn(db, "updateStoreProduct").mockResolvedValue(undefined as never);
    const saved = await saveAssistantConfirmation({
      userId: merchant.id,
      tool: "change_product_price",
      payload: { productId: 11, price: "10.00" },
      summary: "Mudar o preço.",
    });
    const cancelled = await cancelAssistantTurn({ user: merchant, token: saved.token });
    expect(cancelled.reply).toMatch(/Nada foi alterado/);
    const later = await confirmAssistantTurn({
      user: merchant,
      token: saved.token,
      audience: "merchant",
      cart: [],
    });
    expect(later.reply).toMatch(/já foi usada|Não encontrei/);
    expect(update).not.toHaveBeenCalled();
  });

  it("does not place an order while only preparing the confirmation", async () => {
    vi.spyOn(db, "getProductById").mockResolvedValue({
      id: 4,
      storeId: 2,
      name: "Pizza",
      price: "30.00",
      available: 1,
      category: "Salgados",
    } as never);
    vi.spyOn(db, "listProductOptions").mockResolvedValue([]);
    vi.spyOn(db, "getStoreById").mockResolvedValue({ id: 2, name: "Forno" } as never);
    vi.spyOn(db, "listCustomerAddresses").mockResolvedValue([
      { id: 6, label: "Casa", street: "Rua A", number: "10", isDefault: 1 },
    ] as never);
    vi.spyOn(db, "getCustomerAddress").mockResolvedValue({ id: 6 } as never);
    const create = vi.spyOn(db, "createOrderWithPayment");
    const effect = await performAssistantTool(
      "place_order",
      { paymentMethod: "pix" },
      {
        user: customer,
        audience: "customer",
        cart: [{ productId: 4, quantity: 2, optionIds: [] }],
      },
    );
    expect(effect.pending?.tool).toBe("place_order");
    expect(effect.text).toMatch(/Confirmar/);
    expect(create).not.toHaveBeenCalled();
  });

  it("runs a tool loop with a fake OpenAI reply", async () => {
    vi.spyOn(db, "listAccountRoles").mockResolvedValue(["customer"]);
    vi.spyOn(db, "getPlatformSettings").mockResolvedValue({ textModel: "gpt-5-mini" } as never);
    vi.spyOn(db, "searchAvailableProducts").mockResolvedValue({
      items: [
        {
          id: 4,
          name: "Pizza",
          storeName: "Forno",
          category: "Salgados",
          price: "30.00",
          available: 1,
          storeOpen: true,
          storeId: 2,
        },
      ],
      hasMore: false,
      nextCursor: null,
    } as never);
    vi.mocked(openAiToolStep)
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [{ id: "call-1", name: "search_catalog", arguments: JSON.stringify({ query: "pizza" }) }],
      })
      .mockResolvedValueOnce({ content: "Achei pizza no Forno.", toolCalls: [] });

    const turn = await runAssistantChat({
      user: customer,
      messages: [{ role: "user", content: "quero pizza" }],
      cart: [],
    });
    expect(turn.reply).toBe("Achei pizza no Forno.");
    expect(turn.cards[0]?.title).toBe("Pizza");
    expect(openAiToolStep).toHaveBeenCalledTimes(2);
    const followUp = vi.mocked(openAiToolStep).mock.calls[1]?.[0];
    const toolMessage = followUp?.messages.find((message) => message.role === "tool");
    expect(String(toolMessage?.content)).toContain('"productId":4');
    expect(String(toolMessage?.content)).toContain('"storeId":2');
  });
});
