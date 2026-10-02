export type FulfillmentMode = "delivery" | "pickup";

export type ServiceabilityStore = {
  deliveryEnabled?: number | boolean | null;
  pickupEnabled?: number | boolean | null;
  deliveryRadiusKm?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  deliveryFee?: string | number | null;
};

export type ServiceabilityAddress = {
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export type ServiceabilityResult = {
  mode: FulfillmentMode;
  deliveryFee: string;
  distanceKm: string | null;
  serviceable: boolean;
  reason:
    | "ok"
    | "delivery_disabled"
    | "pickup_disabled"
    | "store_location_missing"
    | "address_location_missing"
    | "outside_delivery_radius";
};

function numeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function enabled(
  value: number | boolean | null | undefined,
  fallback: boolean,
) {
  if (value === null || value === undefined) return fallback;
  return value === true || value === 1;
}

function validCoordinatePair(
  latitude: number | null,
  longitude: number | null,
): boolean {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function haversineDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const latitudeA = (from.latitude * Math.PI) / 180;
  const latitudeB = (to.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 *
      Math.cos(latitudeA) *
      Math.cos(latitudeB);
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

export function calculateServiceability(
  mode: FulfillmentMode,
  store: ServiceabilityStore,
  address?: ServiceabilityAddress | null,
): ServiceabilityResult {
  const deliveryFee = Number(store.deliveryFee ?? 0).toFixed(2);
  if (mode === "pickup") {
    return {
      mode,
      deliveryFee: "0.00",
      distanceKm: null,
      serviceable: enabled(store.pickupEnabled, false),
      reason: enabled(store.pickupEnabled, false) ? "ok" : "pickup_disabled",
    };
  }

  if (!enabled(store.deliveryEnabled, true)) {
    return {
      mode,
      deliveryFee,
      distanceKm: null,
      serviceable: false,
      reason: "delivery_disabled",
    };
  }

  const storeLatitude = numeric(store.latitude);
  const storeLongitude = numeric(store.longitude);
  const addressLatitude = numeric(address?.latitude);
  const addressLongitude = numeric(address?.longitude);
  if (!validCoordinatePair(storeLatitude, storeLongitude)) {
    return {
      mode,
      deliveryFee,
      distanceKm: null,
      serviceable: false,
      reason: "store_location_missing",
    };
  }
  if (!validCoordinatePair(addressLatitude, addressLongitude)) {
    return {
      mode,
      deliveryFee,
      distanceKm: null,
      serviceable: false,
      reason: "address_location_missing",
    };
  }

  const distanceKm = haversineDistanceKm(
    { latitude: storeLatitude as number, longitude: storeLongitude as number },
    {
      latitude: addressLatitude as number,
      longitude: addressLongitude as number,
    },
  );
  const radiusKm = numeric(store.deliveryRadiusKm) ?? 10;
  const serviceable = distanceKm <= radiusKm;
  return {
    mode,
    deliveryFee,
    distanceKm: distanceKm.toFixed(2),
    serviceable,
    reason: serviceable ? "ok" : "outside_delivery_radius",
  };
}

export function serviceabilityMessage(result: ServiceabilityResult): string {
  switch (result.reason) {
    case "delivery_disabled":
      return "Esta loja não está aceitando entregas no momento.";
    case "pickup_disabled":
      return "Esta loja não está oferecendo retirada no momento.";
    case "store_location_missing":
      return "A loja ainda não configurou sua área de entrega.";
    case "address_location_missing":
      return "Este endereço precisa de localização para calcular a cobertura.";
    case "outside_delivery_radius":
      return `O endereço está fora da área de entrega (${result.distanceKm} km).`;
    default:
      return "Modalidade disponível.";
  }
}
