import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import * as push from "../server/push";

const customer = {
  id: 20,
  openId: "customer-20",
  name: "Cliente Vertical",
  email: "cliente.vertical@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

const merchant = {
  id: 30,
  openId: "merchant-30",
  name: "Prestador Vertical",
  email: "prestador.vertical@test.local",
  loginMethod: "test",
  role: "merchant" as const,
  lastSignedIn: new Date(),
};

const courier = {
  id: 42,
  openId: "courier-42",
  name: "Motoboy Vertical",
  email: "motoboy.vertical@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

const store = {
  id: 7,
  ownerId: merchant.id,
  name: "Loja Vertical",
  kind: "restaurant",
  isOpen: 1,
  deliveryEnabled: 1,
  pickupEnabled: 0,
  deliveryRadiusKm: "5.00",
  deliveryFee: "5.00",
  latitude: "-23.550520",
  longitude: "-46.633308",
  flashEnabled: 0,
} as any;

const address = {
  id: 900,
  latitude: "-23.550520",
  longitude: "-46.633308",
  street: "Rua Vertical",
  number: "10",
  complement: null,
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  postalCode: "01311000",
} as any;

const product = {
  id: 101,
  storeId: store.id,
  name: "Combo Vertical",
  category: "Lanches",
  description: "Produto usado no cenário integrado",
  price: "30.00",
  available: 1,
} as any;

const profile = {
  id: 11,
  userId: courier.id,
  status: "approved" as const,
  vehicleType: "moto" as const,
  vehiclePlate: "ABC1D23",
  phone: "11999999999",
  availability: "available" as const,
  locationConsentAt: new Date(),
  approvedAt: new Date(),
  statusReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

describe("Pediu jornada vertical cliente → prestador → motoboy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("conclui pedido delivery com oferta, aceite, tracking, entrega e avaliação", async () => {
    let status: "Pendente" | "Aceito" | "Preparando" | "Pronto" | "A caminho" | "Entregue" = "Pendente";
    let assignment: any = undefined;
    let location: any = undefined;
    let offer: any = {
      id: 700,
      orderId: 501,
      storeId: store.id,
      courierUserId: courier.id,
      status: "pending",
      etaMinutes: 25,
      message: "Entrega vertical",
      expiresAt: new Date(Date.now() + 10 * 60_000),
      idempotencyKey: "vertical-offer-501",
      createdAt: new Date(),
    };

    const order = () => ({
      id: 501,
      customerId: customer.id,
      storeId: store.id,
      status,
      total: "35.00",
      fulfillmentMode: "delivery",
      fulfillment: "standard",
      deliveryAddress: "Rua Vertical, 10, Centro · São Paulo/SP, 01311000",
      isFlash: 0,
      tipAmount: "0.00",
    }) as any;

    vi.spyOn(db, "getOrderByIdempotencyKey").mockResolvedValue(undefined);
    vi.spyOn(db, "getStoreById").mockResolvedValue(store);
    vi.spyOn(db, "getCustomerAddress").mockResolvedValue(address);
    vi.spyOn(db, "getAvailableProductForStore").mockResolvedValue(product);
    const createOrder = vi
      .spyOn(db, "createOrderWithPayment")
      .mockResolvedValue({ orderId: 501, paymentId: 801 });
    vi.spyOn(db, "getStoreForOwner").mockImplementation(async (userId) =>
      userId === merchant.id ? store : undefined,
    );
    vi.spyOn(db, "getOrderForUser").mockImplementation(async (orderId) =>
      orderId === 501 ? order() : undefined,
    );
    vi.spyOn(db, "transitionOrderStatus").mockImplementation(
      async (_orderId, next) => {
        status = next as typeof status;
        return { changed: true, status } as any;
      },
    );
    vi.spyOn(db, "createDeliveryOffer").mockImplementation(async () => offer);
    vi.spyOn(db, "listPendingDeliveryOffers").mockResolvedValue([offer]);
    vi.spyOn(db, "respondToDeliveryOffer").mockImplementation(async () => {
      offer = { ...offer, status: "accepted", respondedAt: new Date() };
      assignment = {
        id: 701,
        orderId: 501,
        courierId: courier.id,
        courierName: courier.name,
        courierPhone: profile.phone,
        etaMinutes: 25,
        status: "assigned",
        currentLatitude: null,
        currentLongitude: null,
        lastLocationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return { offer, assignment } as any;
    });
    vi.spyOn(db, "getDeliveryAssignmentByOrder").mockImplementation(
      async () => assignment,
    );
    vi.spyOn(db, "getLatestDeliveryLocation").mockImplementation(
      async () => location,
    );
    vi.spyOn(db, "getCourierProfileByUser").mockResolvedValue(profile);
    vi.spyOn(db, "recordDeliveryLocation").mockImplementation(async (input) => {
      status = "A caminho";
      assignment = { ...assignment, status: "in_transit" };
      location = {
        id: 702,
        assignmentId: assignment.id,
        orderId: 501,
        courierId: courier.id,
        latitude: input.latitude,
        longitude: input.longitude,
        etaMinutes: input.etaMinutes,
        capturedAt: input.capturedAt,
        idempotencyKey: input.idempotencyKey,
        createdAt: new Date(),
      };
      return { location, assignment, created: true, dispatched: true } as any;
    });
    vi.spyOn(db, "completeDelivery").mockImplementation(async () => {
      status = "Entregue";
      assignment = { ...assignment, status: "delivered" };
      return { changed: true, status } as any;
    });
    vi.spyOn(db, "setCourierAvailability").mockResolvedValue({
      ...profile,
      availability: "available",
    } as any);
    vi.spyOn(db, "getOrderReviewByIdempotencyKey").mockResolvedValue(undefined);
    vi.spyOn(db, "createOrderReview").mockResolvedValue({
      id: 703,
      duplicate: false,
    });
    vi.spyOn(push, "sendPushToUser").mockResolvedValue({ sent: 1 });

    const client = appRouter.createCaller({ user: customer } as any);
    const seller = appRouter.createCaller({ user: merchant } as any);
    const rider = appRouter.createCaller({ user: courier } as any);

    const created = await client.pediu.orders.create({
      idempotencyKey: "vertical-order-501",
      storeId: store.id,
      addressId: address.id,
      total: "35.00",
      paymentMethod: "pix",
      fulfillmentMode: "delivery",
      items: [{ productId: product.id, quantity: 1, unitPrice: "999.99" }],
    });
    expect(created).toMatchObject({ orderId: 501, paymentId: 801, status: "Pendente" });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: customer.id, storeId: store.id, total: "35.00" }),
      [{ productId: product.id, quantity: 1, unitPrice: product.price }],
      "pix",
    );

    await seller.pediu.orders.status({ orderId: 501, status: "Aceito" });
    await seller.pediu.orders.status({ orderId: 501, status: "Preparando" });
    await seller.pediu.orders.status({ orderId: 501, status: "Pronto" });
    expect(status).toBe("Pronto");

    const sellerQueue = await seller.pediu.experience.delivery.queue();
    expect(sellerQueue.storeId).toBe(store.id);
    const createdOffer = await seller.pediu.experience.delivery.offer({
      orderId: 501,
      courierUserId: courier.id,
      etaMinutes: 25,
      idempotencyKey: "vertical-offer-501",
    });
    expect(createdOffer).toMatchObject({ orderId: 501, courierUserId: courier.id, status: "pending" });

    const offers = await rider.pediu.courier.offers();
    expect(offers).toHaveLength(1);
    const accepted = await rider.pediu.courier.acceptOffer({ offerId: offers[0]!.id });
    expect(accepted.assignment).toMatchObject({ orderId: 501, courierId: courier.id, status: "assigned" });

    const update = await rider.pediu.experience.delivery.location({
      orderId: 501,
      latitude: -23.55052,
      longitude: -46.633308,
      etaMinutes: 12,
      capturedAt: new Date(),
      idempotencyKey: "vertical-location-501",
    });
    expect(update.status).toBe("A caminho");

    const customerTracking = await client.pediu.experience.delivery.current({ orderId: 501 });
    expect(customerTracking).toMatchObject({
      status: "A caminho",
      assignment: { courierId: courier.id },
      latestLocation: { idempotencyKey: "vertical-location-501" },
    });

    const completed = await rider.pediu.experience.delivery.complete({ orderId: 501 });
    expect(completed).toMatchObject({ success: true, status: "Entregue" });

    const review = await client.pediu.experience.reviews.create({
      orderId: 501,
      target: "courier",
      rating: 5,
      comment: "Entrega concluída com segurança",
      idempotencyKey: "vertical-review-courier-501",
    });
    expect(review).toMatchObject({ success: true, reviewId: 703, duplicate: false });
  });
});
