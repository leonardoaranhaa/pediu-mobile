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
