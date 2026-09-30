import { describe, expect, it } from "vitest";

import {
  calculateServiceability,
  haversineDistanceKm,
  serviceabilityMessage,
} from "../server/domain/serviceability";

describe("serviceability domain", () => {
  const store = {
    deliveryEnabled: 1,
    pickupEnabled: 1,
    deliveryFee: "7.50",
    deliveryRadiusKm: "5.00",
    latitude: "-23.550520",
    longitude: "-46.633308",
  };

  it("calculates a stable Haversine distance", () => {
    expect(
      haversineDistanceKm(
        { latitude: -23.55052, longitude: -46.633308 },
        { latitude: -23.55052, longitude: -46.633308 },
      ),
    ).toBe(0);
  });

  it("accepts delivery inside the configured radius", () => {
    const result = calculateServiceability("delivery", store, {
      latitude: "-23.551000",
      longitude: "-46.634000",
    });

    expect(result).toMatchObject({
      serviceable: true,
      reason: "ok",
      deliveryFee: "7.50",
    });
    expect(Number(result.distanceKm)).toBeLessThan(5);
  });

  it("rejects delivery outside the configured radius", () => {
    const result = calculateServiceability("delivery", store, {
      latitude: "-23.600000",
      longitude: "-46.700000",
    });

    expect(result).toMatchObject({
      serviceable: false,
      reason: "outside_delivery_radius",
    });
    expect(serviceabilityMessage(result)).toContain("fora da área");
  });

  it("supports pickup with zero delivery fee and no address", () => {
    expect(calculateServiceability("pickup", store)).toMatchObject({
      serviceable: true,
      reason: "ok",
      deliveryFee: "0.00",
      distanceKm: null,
    });
  });

  it("fails closed when delivery is enabled but locations are missing", () => {
    const result = calculateServiceability(
      "delivery",
      { ...store, latitude: null },
      { latitude: "-23.55", longitude: "-46.63" },
    );

    expect(result).toMatchObject({
      serviceable: false,
      reason: "store_location_missing",
    });
  });

  it("rejects delivery without an address location", () => {
    const result = calculateServiceability("delivery", store, {
      latitude: null,
      longitude: null,
    });

    expect(result).toMatchObject({
      serviceable: false,
      reason: "address_location_missing",
    });
  });

  it("fails closed for coordinates outside geographic bounds", () => {
    expect(
      calculateServiceability("delivery", {
        ...store,
        latitude: "91",
      }),
    ).toMatchObject({
      serviceable: false,
      reason: "store_location_missing",
    });
    expect(
      calculateServiceability("delivery", store, {
        latitude: "-23.55",
        longitude: "181",
      }),
    ).toMatchObject({
      serviceable: false,
      reason: "address_location_missing",
    });
  });

  it("rejects disabled delivery and pickup explicitly", () => {
    expect(
      calculateServiceability("delivery", {
        ...store,
        deliveryEnabled: 0,
      }),
    ).toMatchObject({ serviceable: false, reason: "delivery_disabled" });
    expect(
      calculateServiceability("pickup", {
        ...store,
        pickupEnabled: 0,
      }),
    ).toMatchObject({ serviceable: false, reason: "pickup_disabled" });
  });
});
