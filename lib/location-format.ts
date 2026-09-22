export type GeocodedAddressLike = {
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  subregion?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
};

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

export function formatCompleteAddress(result: GeocodedAddressLike | undefined) {
  if (!result) return "";
  const street = [clean(result.street), clean(result.streetNumber)].filter(Boolean).join(", ");
  const neighborhood = clean(result.district) || clean(result.subregion);
  const locality = [clean(result.city) || clean(result.subregion), clean(result.region)].filter(Boolean).join("/");
  const postalCode = clean(result.postalCode);
  return [street, neighborhood, locality, postalCode].filter(Boolean).join(" · ");
}

export function formatShortAddress(result: GeocodedAddressLike | undefined) {
  if (!result) return "Localização atual";
  const neighborhood = clean(result.district) || clean(result.subregion);
  const city = clean(result.city);
  return [neighborhood, city].filter(Boolean).join(", ") || "Localização atual";
}
