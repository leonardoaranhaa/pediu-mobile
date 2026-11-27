import { describe, expect, it } from "vitest";
import {
  BRAZIL_CENTER,
  COUNTRY_PIN_MESSAGE,
  FAR_FROM_CEP_MESSAGE,
  geocodeRejection,
  isCountryLevelPin,
} from "../shared/address-pin";

describe("store pin must be a street, not the country", () => {
  it("rejects the center of Brazil", () => {
    expect(isCountryLevelPin(BRAZIL_CENTER.latitude, BRAZIL_CENTER.longitude)).toBe(true);
    expect(
      geocodeRejection({
        latitude: -14.235,
        longitude: -51.925,
        type: "country",
      }),
    ).toBe(COUNTRY_PIN_MESSAGE);
  });

  it("rejects a state-sized box and a point far from the CEP city", () => {
    expect(
      geocodeRejection({
        latitude: -22.314,
        longitude: -49.06,
        boundingSpanKm: 400,
      }),
    ).toMatch(/cidade ou o estado/);
    expect(
      geocodeRejection(
        { latitude: -23.55, longitude: -46.63, road: "Paulista" },
        { latitude: -22.314, longitude: -49.06 },
      ),
    ).toBe(FAR_FROM_CEP_MESSAGE);
  });

  it("keeps a street point in Bauru", () => {
    expect(
      geocodeRejection(
        { latitude: -22.321, longitude: -49.07, type: "house", road: "Rua Example" },
        { latitude: -22.314, longitude: -49.06 },
      ),
    ).toBeNull();
  });
});
