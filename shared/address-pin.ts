export const BRAZIL_CENTER = { latitude: -14.235004, longitude: -51.92528 };

export const COUNTRY_PIN_MESSAGE =
  "Esse ponto ficou no meio do Brasil. Confira o CEP, o número e arraste o pino até a porta.";

export const COARSE_PIN_MESSAGE =
  "O mapa achou só a cidade ou o estado. Confira o CEP e o número, depois arraste o pino até a porta.";

export const FAR_FROM_CEP_MESSAGE =
  "O ponto ficou longe da cidade do CEP. Confira o CEP e o número.";

const COARSE_TYPES = new Set([
  "country",
  "state",
  "region",
  "administrative",
  "continent",
]);

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earth = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(a));
}

export function isCountryLevelPin(latitude: number, longitude: number) {
  return distanceKm({ latitude, longitude }, BRAZIL_CENTER) < 25;
}

export type GeocodeHit = {
  latitude: number;
  longitude: number;
  type?: string | null;
  addressType?: string | null;
  road?: string | null;
  boundingSpanKm?: number | null;
};

export function geocodeRejection(
  hit: GeocodeHit,
  cepCity?: { latitude?: number | null; longitude?: number | null } | null,
): string | null {
  if (!Number.isFinite(hit.latitude) || !Number.isFinite(hit.longitude)) {
    return "Não achamos esse endereço. Confira o CEP e o número.";
  }
  if (isCountryLevelPin(hit.latitude, hit.longitude)) return COUNTRY_PIN_MESSAGE;
  const kind = `${hit.type ?? ""} ${hit.addressType ?? ""}`.toLowerCase();
  const coarse = [...COARSE_TYPES].some((type) => kind.includes(type));
  if (coarse && !hit.road) return COARSE_PIN_MESSAGE;
  if ((hit.boundingSpanKm ?? 0) > 80) return COARSE_PIN_MESSAGE;
  const cepLatitude = cepCity?.latitude;
  const cepLongitude = cepCity?.longitude;
  if (
    cepLatitude != null &&
    cepLongitude != null &&
    Number.isFinite(cepLatitude) &&
    Number.isFinite(cepLongitude) &&
    distanceKm(
      { latitude: hit.latitude, longitude: hit.longitude },
      { latitude: cepLatitude, longitude: cepLongitude },
    ) > 40
  ) {
    return FAR_FROM_CEP_MESSAGE;
  }
  return null;
}

export function boundingSpanKm(box: {
  south: number;
  north: number;
  west: number;
  east: number;
}) {
  return distanceKm(
    { latitude: box.south, longitude: box.west },
    { latitude: box.north, longitude: box.east },
  );
}
