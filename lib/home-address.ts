export type HomeAddressSource = {
  street?: string | null;
  number?: string | null;
  isDefault?: number | boolean | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

function timeOf(address: HomeAddressSource) {
  const value = address.updatedAt ?? address.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function isDefaultAddress(address: HomeAddressSource) {
  return address.isDefault === 1 || address.isDefault === true;
}

export function homeAddressLine(
  addresses: readonly HomeAddressSource[] | null | undefined,
) {
  if (!addresses?.length) return null;
  const ranked = [...addresses].sort((left, right) => {
    const byDefault = Number(isDefaultAddress(right)) - Number(isDefaultAddress(left));
    if (byDefault !== 0) return byDefault;
    return timeOf(right) - timeOf(left);
  });
  for (const address of ranked) {
    const street = address.street?.trim() ?? "";
    const number = address.number?.trim() ?? "";
    if (street && number) return `${street}, ${number}`;
    if (street) return street;
  }
  return null;
}
