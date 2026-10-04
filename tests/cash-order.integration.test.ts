import { afterAll, describe, expect, it } from "vitest";
import { DEV_PERSONAS } from "../server/_core/dev-auth";
import type { TrpcContext } from "../server/_core/context";
import * as db from "../server/db";
import { appRouter } from "../server/routers";
import type { User } from "../drizzle/schema";

const enabled = process.env.PEDIU_INTEGRATION === "1";

function callerFor(user: User) {
  const ctx: TrpcContext = {
    user,
    req: { protocol: "http", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { clearCookie() {}, cookie() {} } as unknown as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe.skipIf(!enabled)("cash checkout against MySQL", () => {
  afterAll(async () => {
    const database = await db.getDb();
    await (database as { $client?: { end: () => Promise<void> } } | null)?.$client?.end();
  });

  it("quotes the seeded catalog, persists a pending cash order and returns the same order on retry", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL é obrigatório para o teste de checkout");
    const customer = await db.getUserByOpenId(DEV_PERSONAS.customer.openId);
    const merchant = await db.getUserByOpenId(DEV_PERSONAS.merchant.openId);
    if (!customer || !merchant) throw new Error("Rode pnpm db:seed antes do teste de integração");

    const customerApi = callerFor(customer);
    const merchantApi = callerFor(merchant);
    const catalog = await customerApi.pediu.marketplace.search({ query: "X-Burger", limit: 20, offset: 0 });
    const burger = catalog.items.find((item) => item.name === "X-Burger");
    expect(burger).toBeTruthy();

    const quote = await customerApi.pediu.checkout.quote({
      storeId: burger!.storeId,
      items: [{ productId: burger!.id, quantity: 1 }],
    });
    expect(quote).toMatchObject({ subtotal: "28.90", deliveryFee: "5.00", discount: "0.00", total: "33.90" });

    const addresses = await customerApi.pediu.addresses.list();
    const address = addresses.find((item) => item.isDefault === 1);
    expect(address?.street).toBe("Rua dos Pinheiros");

    const idempotencyKey = `integration-cash-${Date.now()}`;
    const input = {
      idempotencyKey,
      storeId: quote.storeId,
      total: quote.total,
      paymentMethod: "cash" as const,
      addressId: address!.id,
      items: quote.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
    };
    const created = await customerApi.pediu.orders.create(input);
    const repeated = await customerApi.pediu.orders.create(input);
    expect(repeated).toEqual(created);
    expect(created.status).toBe("Pendente");

    const order = await customerApi.pediu.orders.get({ orderId: created.orderId });
    expect(order).toMatchObject({ status: "Pendente", total: "33.90", customerId: customer.id });
    expect(order.deliveryAddress).toContain("Rua dos Pinheiros, 450");

    const listed = await customerApi.pediu.orders.mine({ limit: 100, offset: 0 });
    expect(listed.filter((item) => item.id === created.orderId)).toHaveLength(1);

    const payment = await customerApi.pediu.payments.get({ paymentId: created.paymentId! });
    expect(payment).toMatchObject({ method: "cash", status: "pending", orderId: created.orderId });

    const visibleToStore = await merchantApi.pediu.orders.storeMine({ limit: 100, offset: 0 });
    expect(visibleToStore.find((item) => item.id === created.orderId)?.status).toBe("Pendente");

    await expect(customerApi.pediu.orders.create({ ...input, idempotencyKey: `${idempotencyKey}-total`, total: "1.00" })).rejects.toThrow(/Total do pedido inválido/);
  });

  it("lets the seeded merchant deliver the order and the customer read the same final status", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL é obrigatório para o teste de checkout");
    const customer = await db.getUserByOpenId(DEV_PERSONAS.customer.openId);
    const merchant = await db.getUserByOpenId(DEV_PERSONAS.merchant.openId);
    if (!customer || !merchant) throw new Error("Rode pnpm db:seed antes do teste de integração");
    const customerApi = callerFor(customer);
    const merchantApi = callerFor(merchant);

    const catalog = await customerApi.pediu.marketplace.search({ query: "Batata frita", limit: 20, offset: 0 });
    const item = catalog.items.find((product) => product.name === "Batata frita");
    const quote = await customerApi.pediu.checkout.quote({ storeId: item!.storeId, items: [{ productId: item!.id, quantity: 1 }] });
    const address = (await customerApi.pediu.addresses.list()).find((entry) => entry.isDefault === 1);
    const created = await customerApi.pediu.orders.create({
      idempotencyKey: `integration-delivery-${Date.now()}`,
      storeId: quote.storeId,
      total: quote.total,
      paymentMethod: "cash",
      addressId: address!.id,
      items: quote.items.map((quoted) => ({ productId: quoted.productId, quantity: quoted.quantity, unitPrice: quoted.unitPrice })),
    });

    await expect(merchantApi.pediu.orders.status({ orderId: created.orderId, status: "Entregue" })).rejects.toThrow(/Transição de pedido inválida/);
    await expect(customerApi.pediu.orders.status({ orderId: created.orderId, status: "Aceito" })).rejects.toThrow(/cancelar/);

    for (const status of ["Aceito", "Preparando", "Pronto", "A caminho", "Entregue"] as const) {
      await merchantApi.pediu.orders.status({ orderId: created.orderId, status });
      expect((await customerApi.pediu.orders.get({ orderId: created.orderId })).status).toBe(status);
    }

    expect((await merchantApi.pediu.orders.get({ orderId: created.orderId })).status).toBe("Entregue");
    const events = await customerApi.pediu.experience.tracking.events({ orderId: created.orderId });
    expect(events.map((event) => event.eventType)).toEqual(["Entregue", "A caminho", "Pronto", "Preparando", "Aceito", "Pendente"]);
    await expect(merchantApi.pediu.orders.status({ orderId: created.orderId, status: "Cancelado" })).rejects.toThrow(/Transição de pedido inválida/);
  });
});
