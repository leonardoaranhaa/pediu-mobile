export type DeliveryEvent = "assigned" | "picked_up" | "out_for_delivery" | "arrived" | "delivered";
export type DeliveryPosition = { latitude: number; longitude: number; recordedAt: Date };

export function validateDeliveryPosition(position: DeliveryPosition) {
  if (!Number.isFinite(position.latitude) || position.latitude < -90 || position.latitude > 90) throw new Error("Invalid latitude");
  if (!Number.isFinite(position.longitude) || position.longitude < -180 || position.longitude > 180) throw new Error("Invalid longitude");
}

export function canPublishDeliveryEvent(status: string, event: DeliveryEvent): boolean {
  if (event === "assigned") return ["Pendente", "Aceito", "Preparando", "Pronto"].includes(status);
  if (event === "picked_up" || event === "out_for_delivery") return status === "Pronto";
  if (event === "arrived") return status === "A caminho";
  return event === "delivered" && status === "A caminho";
}
