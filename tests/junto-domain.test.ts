import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import {
  JUNTO_DISABLED_REASON,
  JUNTO_FEATURE_ENABLED,
  canJoinJuntoShare,
  generateJuntoInviteCode,
  planJuntoShare,
} from "../server/domain/junto";

const user = {
  id: 42,
  openId: "user-42",
  name: "Host",
  email: "host@test.local",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

describe("Pediu Junto domain foundation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("stays disabled in production feature flags", () => {
    expect(JUNTO_FEATURE_ENABLED).toBe(false);
  });

  it("plans host-pays shares and rejects guest-split", () => {
    expect(planJuntoShare({ hostUserId: 1, storeId: 9, maxParticipants: 4 })).toMatchObject({
      ok: true,
      hostPaysAll: true,
      paymentModel: "host_pays",
      status: "draft",
    });
    expect(planJuntoShare({ hostUserId: 1, storeId: 9, hostPaysAll: false }).ok).toBe(false);
    expect(planJuntoShare({ hostUserId: 0, storeId: 9 }).ok).toBe(false);
  });

  it("enforces join capacity and open status", () => {
    expect(canJoinJuntoShare({
      shareStatus: "open",
      participantCount: 2,
      maxParticipants: 6,
      alreadyJoined: false,
    })).toEqual({ ok: true });
    expect(canJoinJuntoShare({
      shareStatus: "locked",
      participantCount: 2,
      maxParticipants: 6,
      alreadyJoined: false,
    }).ok).toBe(false);
    expect(canJoinJuntoShare({
      shareStatus: "open",
      participantCount: 6,
      maxParticipants: 6,
      alreadyJoined: false,
    }).ok).toBe(false);
  });

  it("generates invite codes with Pediu Junto prefix", () => {
    expect(generateJuntoInviteCode(12345)).toMatch(/^PJ[A-Z0-9]{6}$/);
  });

  it("exposes status/preview stubs and blocks create/join while flag is off", async () => {
    const caller = appRouter.createCaller({ user } as any);

    await expect(caller.pediu.experience.flags()).resolves.toMatchObject({
      pediuJunto: false,
      juntoPaymentModel: "host_pays",
    });
    await expect(caller.pediu.experience.junto.status()).resolves.toMatchObject({
      enabled: false,
      paymentModel: "host_pays",
      reason: JUNTO_DISABLED_REASON,
    });
    await expect(caller.pediu.experience.junto.preview({ storeId: 7, maxParticipants: 4 })).resolves.toMatchObject({
      ok: true,
      enabled: false,
      hostPaysAll: true,
    });
    await expect(
      caller.pediu.experience.junto.create({
        storeId: 7,
        maxParticipants: 4,
        idempotencyKey: "junto-create-test-001",
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(
      caller.pediu.experience.junto.join({
        inviteCode: "PJTEST01",
        idempotencyKey: "junto-join-test-001",
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
