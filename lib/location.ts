import * as Location from "expo-location";
import { formatCompleteAddress, formatShortAddress } from "@/lib/location-format";
import type { GeocodedAddressLike } from "@/lib/location-format";

export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  address: string;
  shortAddress: string;
  details: GeocodedAddressLike;
};

async function geocodeWithNominatim(
  query: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Pediu/1.0 (aplicativo de entrega local)",
      },
    },
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const first = rows[0];
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export async function geocodeTypedAddress(
  query: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const trimmed = query.trim();
  if (trimmed.length < 8) return null;
  try {
    const results = await Location.geocodeAsync(trimmed);
    const first = results.find(
      (item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
    );
    if (first) return { latitude: first.latitude, longitude: first.longitude };
  } catch {
    // The device geocoder is optional. OpenStreetMap is the fallback.
  }
  return geocodeWithNominatim(trimmed);
}

export async function resolveCurrentLocation(): Promise<ResolvedLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Permissão de localização não concedida");
  const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const [result] = await Location.reverseGeocodeAsync({
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  });
  const address = formatCompleteAddress(result);
  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    address: address || `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`,
    shortAddress: formatShortAddress(result),
    details: result ?? {},
  };
}
