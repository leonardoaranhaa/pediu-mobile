import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import * as push from "../server/push";

const merchant = {
  id: 10,
  openId: "merchant-10",
  name: "Operador Loja",
  email: "merchant@test.local",
  loginMethod: "test",
  role: "merchant" as const,
  lastSignedIn: new Date(),
};

const customer = { ...merchant, id: 20, openId: "customer-20", role: "user" as const };
const store = { id: 7, ownerId: 10 } as any;
const pronto = { id: 101, customerId: 20, storeId: 7, status: "Pronto" as const, total: "35.00" } as any;
const emRota = { ...pronto, status: "A caminho" as const };
const assignment = { id: 501, orderId: 101, courierId: 10, courierName: "Operador Loja", courierPhone: null, etaMinutes: 20, status: "assigned", currentLatitude: null, currentLongitude: null, lastLocationAt: null, createdAt: new Date(), updatedAt: new Date() } as any;
const location = { id: 601, assignmentId: 501, orderId: 101, courierId: 10, latitude: "-23.5505200", longitude: "-46.6333080", etaMinutes: 18, idempotencyKey: "location-key-101", createdAt: new Date() } as any;

describe("Pediu delivery operational contract", () => {
  afterEach(() => vi.restoreAllMocks());

  it("assigns a ready order only through its store owner", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(pronto);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store);
    const save = vi.spyOn(db, "upsertDeliveryAssignment").mockResolvedValue(assignment);

    const caller = appRouter.createCaller({ user: merchant } as any);
    const result = await caller.pediu.experience.delivery.assign({ orderId: 101, etaMinutes: 20 });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ orderId: 101, courierId: 10, etaMinutes: 20, status: "assigned" }));
    expect(result.id).toBe(501);
  });

  it("rejects assignment from a user who does not own the store", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(pronto);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(undefined);

    const caller = appRouter.createCaller({ user: customer } as any);
    await expect(caller.pediu.experience.delivery.assign({ orderId: 101 })).rejects.toThrow("loja não autorizada");
  });

  it("records one location and starts the route without duplicating a retry event", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(pronto);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store);
    vi.spyOn(db, "getDeliveryAssignmentByOrder").mockResolvedValue(assignment);
    const record = vi.spyOn(db, "recordDeliveryLocation").mockResolvedValue({ location, assignment: { ...assignment, status: "in_transit" }, created: true });
    const update = vi.spyOn(db, "updateOrderStatus").mockResolvedValue(undefined);
    const event = vi.spyOn(db, "createDeliveryEvent").mockResolvedValue(700);
    const notify = vi.spyOn(push, "sendPushToUser").mockResolvedValue({ sent: 1 });

    const caller = appRouter.createCaller({ user: merchant } as any);
    const result = await caller.pediu.experience.delivery.location({ orderId: 101, latitude: -23.55052, longitude: -46.633308, etaMinutes: 18, idempotencyKey: "location-key-101" });

    expect(record).toHaveBeenCalledWith(expect.objectContaining({ assignmentId: 501, orderId: 101, courierId: 10, idempotencyKey: "location-key-101" }));
    expect(update).toHaveBeenCalledWith(101, "A caminho");
    expect(event).toHaveBeenCalledWith(expect.objectContaining({ orderId: 101, eventType: "A caminho" }));
    expect(notify).toHaveBeenCalled();
    expect(result.status).toBe("A caminho");
  });

  it("completes only an in-route order assigned to the store operator", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(emRota);
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store);
    vi.spyOn(db, "getDeliveryAssignmentByOrder").mockResolvedValue({ ...assignment, status: "in_transit" });
    const update = vi.spyOn(db, "updateOrderStatus").mockResolvedValue(undefined);
    const assignmentUpdate = vi.spyOn(db, "updateDeliveryAssignmentStatus").mockResolvedValue(undefined);
    const event = vi.spyOn(db, "createDeliveryEvent").mockResolvedValue(701);
    vi.spyOn(push, "sendPushToUser").mockResolvedValue({ sent: 1 });

    const caller = appRouter.createCaller({ user: merchant } as any);
    const result = await caller.pediu.experience.delivery.complete({ orderId: 101 });

    expect(update).toHaveBeenCalledWith(101, "Entregue");
    expect(assignmentUpdate).toHaveBeenCalledWith(101, "delivered");
    expect(event).toHaveBeenCalledWith({ orderId: 101, eventType: "Entregue" });
    expect(result.status).toBe("Entregue");
  });

  it("returns the current delivery only for an authorized customer order", async () => {
    vi.spyOn(db, "getOrderForUser").mockResolvedValue(emRota);
    vi.spyOn(db, "getDeliveryAssignmentByOrder").mockResolvedValue(assignment);
    vi.spyOn(db, "getLatestDeliveryLocation").mockResolvedValue(location);

    const caller = appRouter.createCaller({ user: customer } as any);
    const result = await caller.pediu.experience.delivery.current({ orderId: 101 });

    expect(result.assignment?.courierName).toBe("Operador Loja");
    expect(result.latestLocation?.idempotencyKey).toBe("location-key-101");
  });
});
