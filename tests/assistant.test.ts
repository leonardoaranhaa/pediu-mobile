import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/_core/openai", () => ({
  openAiConfigured: () => true,
  openAiToolStep: vi.fn(),
  AI_UNAVAILABLE: "O assistente não está disponível agora. Você pode continuar pelo aplicativo.",
}));

import { openAiToolStep } from "../server/_core/openai";
import { isTrpcMutationAllowed } from "../server/_core/security";
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
    expect(toolsForAudience("guest").map((tool) => tool.name)).toEqual([
      "search_stores",
      "search_catalog",
      "view_menu",
    ]);
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
    expect(turn.cards[0]?.productId).toBe(4);
    expect(openAiToolStep).toHaveBeenCalledTimes(2);
    const followUp = vi.mocked(openAiToolStep).mock.calls[1]?.[0];
    const toolMessage = followUp?.messages.find((message) => message.role === "tool");
    const toolText = String(toolMessage?.content);
    expect(toolText).toContain("Pizza");
    expect(toolText).toContain("Forno");
    expect(toolText).not.toMatch(/storeId|productId|\brefs\b/);
  });

  it("hides technical ids from the reply the person sees", async () => {
    vi.spyOn(db, "listAccountRoles").mockResolvedValue(["customer"]);
    vi.spyOn(db, "getPlatformSettings").mockResolvedValue({ textModel: "gpt-5-mini" } as never);
    vi.mocked(openAiToolStep).mockResolvedValueOnce({
      content: "TESTE Hiki Loja (storeId: 2). Use refs.productId=1. Diga o storeId.",
      toolCalls: [],
    });
    const turn = await runAssistantChat({
      user: customer,
      messages: [{ role: "user", content: "quais lojas estão abertas?" }],
      cart: [],
    });
    expect(turn.reply).not.toMatch(/storeId|productId|\brefs\b/);
    expect(turn.reply).toMatch(/nome/i);
  });

  it("lists open stores as stores, not products", async () => {
    vi.spyOn(db, "searchAvailableProducts").mockResolvedValue({
      items: [
        {
          id: 1,
          name: "Pizza",
          storeName: "Forno",
          storeId: 2,
          storeOpen: true,
          available: 1,
          category: "Salgados",
          price: "30.00",
          storeKind: "restaurant",
        },
        {
          id: 2,
          name: "Refri",
          storeName: "Forno",
          storeId: 2,
          storeOpen: true,
          available: 1,
          category: "Bebidas",
          price: "5.00",
          storeKind: "restaurant",
        },
        {
          id: 3,
          name: "Bolo",
          storeName: "Doce",
          storeId: 3,
          storeOpen: false,
          available: 1,
          category: "Doces",
          price: "10.00",
          storeKind: "restaurant",
        },
      ],
      hasMore: false,
      nextCursor: null,
    } as never);
    const effect = await performAssistantTool("search_stores", { openNow: true }, {
      user: null,
      audience: "guest",
      cart: [],
    });
    expect(effect.cards.map((card) => card.title)).toEqual(["Forno"]);
    expect(effect.cards[0]?.storeId).toBe(2);
    expect(effect.text).not.toMatch(/storeId|productId|\brefs\b/);
    expect(effect.text).not.toMatch(/Pizza|Refri|Bolo/);
  });

  it("shows the menu and asks for the item name when the request is vague", async () => {
    vi.spyOn(db, "getStoreById").mockResolvedValue({
      id: 2,
      name: "Forno",
      ownerId: 1,
      isOpen: 1,
      deliveryFee: "5.00",
      kind: "restaurant",
      flashEnabled: 0,
    } as never);
    vi.spyOn(db, "storeListedForCustomers").mockResolvedValue(true);
    vi.spyOn(db, "listProductsForStore").mockResolvedValue([
      { id: 1, name: "Pizza", category: "Salgados", price: "30.00", available: 1 },
    ] as never);
    vi.spyOn(db, "listProductOptions").mockResolvedValue([]);
    const effect = await performAssistantTool(
      "add_to_cart",
      { storeId: 2, quantity: 1, productName: "item" },
      { user: customer, audience: "customer", cart: [] },
    );
    expect(effect.cards.map((card) => card.title)).toEqual(["Pizza"]);
    expect(effect.cards[0]?.productId).toBe(1);
    expect(effect.text).toMatch(/nome/i);
    expect(effect.text).not.toMatch(/storeId|productId|\brefs\b/);
    expect(effect.clientActions).toEqual([]);
  });
});

describe("guest assistant chat from the native app", () => {
  const chat = {
    method: "POST",
    headers: {} as { cookie?: string; authorization?: string; origin?: string },
    originalUrl: "/api/trpc/pediu.assistant.chat?batch=1",
    baseUrl: "/api/trpc",
    path: "/pediu.assistant.chat",
    url: "/pediu.assistant.chat?batch=1",
  };

  it("allows the guest chat when the phone sends no cookie and no Origin", () => {
    expect(isTrpcMutationAllowed(chat)).toBe(true);
  });

  it("still blocks a cookie session that has no Origin", () => {
    expect(isTrpcMutationAllowed({ ...chat, headers: { cookie: "app_session_id=session-token" } })).toBe(false);
    expect(
      isTrpcMutationAllowed({
        ...chat,
        originalUrl: "/api/trpc/pediu.orders.create?batch=1",
        path: "/pediu.orders.create",
        url: "/pediu.orders.create?batch=1",
        headers: { cookie: "app_session_id=session-token" },
      }),
    ).toBe(false);
  });

  it("does not open other mutations just because there is no cookie", () => {
    expect(
      isTrpcMutationAllowed({
        ...chat,
        originalUrl: "/api/trpc/pediu.orders.create?batch=1",
        path: "/pediu.orders.create",
        url: "/pediu.orders.create?batch=1",
      }),
    ).toBe(false);
    expect(
      isTrpcMutationAllowed({
        ...chat,
        originalUrl: "/api/trpc/pediu.assistant.chat,pediu.orders.create?batch=1",
        path: "/pediu.assistant.chat,pediu.orders.create",
        url: "/pediu.assistant.chat,pediu.orders.create?batch=1",
      }),
    ).toBe(false);
    expect(
      isTrpcMutationAllowed({
        ...chat,
        originalUrl: "/api/trpc/pediu.assistant.confirm?batch=1",
        path: "/pediu.assistant.confirm",
        url: "/pediu.assistant.confirm?batch=1",
      }),
    ).toBe(false);
  });

  it("keeps bearer and login requests working", () => {
    expect(
      isTrpcMutationAllowed({
        ...chat,
        originalUrl: "/api/trpc/pediu.orders.create",
        path: "/pediu.orders.create",
        url: "/pediu.orders.create",
        headers: { authorization: "Bearer session-token-long-enough" },
      }),
    ).toBe(true);
    expect(
      isTrpcMutationAllowed({
        ...chat,
        originalUrl: "/api/trpc/auth.login?batch=1",
        path: "/auth.login",
        url: "/auth.login?batch=1",
      }),
    ).toBe(true);
  });
});
