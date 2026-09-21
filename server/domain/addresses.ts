export type CustomerAddressInput = {
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
};

export function normalizeAddressInput(input: CustomerAddressInput): CustomerAddressInput {
  const state = input.state.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error("Invalid state");
  const postalCode = input.postalCode.replace(/\D/g, "");
  if (postalCode.length !== 8) throw new Error("Invalid postal code");
  if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) throw new Error("Invalid latitude");
  if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) throw new Error("Invalid longitude");
  return { ...input, label: input.label.trim(), recipientName: input.recipientName.trim(), street: input.street.trim(), number: input.number.trim(), neighborhood: input.neighborhood.trim(), city: input.city.trim(), state, postalCode, complement: input.complement?.trim() || undefined };
}
