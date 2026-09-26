import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

const user = {
  id: 42,
  openId: "courier-42",
  name: "Entregador Teste",
  email: "courier@example.com",
  loginMethod: "test",
  role: "user" as const,
  themePreference: "classic" as const,
  lastSignedIn: new Date(),
};

const profile = {
  id: 11,
  userId: 42,
  status: "pending" as const,
  vehicleType: "moto" as const,
  vehiclePlate: "ABC1D23",
  phone: "11999999999",
  availability: "offline" as const,
  locationConsentAt: null,
  approvedAt: null,
  statusReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Pediu courier flow", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a courier application for the authenticated account", async () => {
    const apply = vi
      .spyOn(db, "upsertCourierProfile")
      .mockResolvedValue(profile);
    const caller = appRouter.createCaller({ user } as any);

    const result = await caller.pediu.courier.profile.register({
      vehicleType: "moto",
      vehiclePlate: "ABC1D23",
      phone: "11999999999",
    });

    expect(result.status).toBe("pending");
    expect(apply).toHaveBeenCalledWith({
      userId: 42,
      vehicleType: "moto",
      vehiclePlate: "ABC1D23",
      phone: "11999999999",
    });
  });

  it("does not expose courier onboarding to an anonymous caller", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    await expect(
      caller.pediu.courier.profile.register({
        vehicleType: "bike",
        phone: "11999999999",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("links only an approved courier through the authenticated store owner", async () => {
    const link = vi.spyOn(db, "linkCourierToStore").mockResolvedValue({
      id: 7,
      storeId: 9,
      courierUserId: 42,
      status: "active",
      invitedBy: 77,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller({
      user: { ...user, id: 77, role: "merchant" },
    } as any);

    const result = await caller.pediu.stores.linkCourier({ courierUserId: 42 });

    expect(result.status).toBe("active");
    expect(link).toHaveBeenCalledWith(77, 42);
  });

  it("audits administrative approval after the courier profile changes successfully", async () => {
    const review = vi
      .spyOn(db, "reviewCourierProfile")
      .mockResolvedValue({
        ...profile,
        status: "approved",
        approvedAt: new Date(),
      });
    const audit = vi.spyOn(db, "createAdminAuditLog").mockResolvedValue(99);
    const caller = appRouter.createCaller({
      user: { ...user, id: 1, role: "admin" },
    } as any);

    const result = await caller.admin.courierReview({
      profileId: 11,
      status: "approved",
    });

    expect(result.status).toBe("approved");
    expect(review).toHaveBeenCalledWith(11, "approved", undefined);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 1,
        action: "courier_approved",
        entityType: "courier_profile",
        entityId: 11,
      }),
    );
  });
});
