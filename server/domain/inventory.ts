export type InventoryAdjustment = "reserve" | "release" | "consume" | "none";

export const DEFAULT_INVENTORY_RESERVATION_TTL_MS = 30 * 60_000;

export function inventoryReservationCutoff(
  now = new Date(),
  ttlMs = DEFAULT_INVENTORY_RESERVATION_TTL_MS,
): Date {
  if (!Number.isFinite(ttlMs) || ttlMs < 0)
    throw new Error("TTL de reserva inválido");
  return new Date(now.getTime() - ttlMs);
}

export function isPendingReservationExpired(
  status:
    | "Pendente"
    | "Aceito"
    | "Preparando"
    | "Pronto"
    | "A caminho"
    | "Entregue"
    | "Cancelado",
  createdAt: Date,
  now = new Date(),
  ttlMs = DEFAULT_INVENTORY_RESERVATION_TTL_MS,
): boolean {
  return (
    status === "Pendente" &&
    createdAt.getTime() <= inventoryReservationCutoff(now, ttlMs).getTime()
  );
}

export function availableInventoryQuantity(
  stockQuantity: number,
  reservedQuantity: number,
): number {
  return Math.max(0, stockQuantity - reservedQuantity);
}

export function inventoryAdjustmentForStatusChange(
  from:
    | "Pendente"
    | "Aceito"
    | "Preparando"
    | "Pronto"
    | "A caminho"
    | "Entregue"
    | "Cancelado",
  to:
    | "Pendente"
    | "Aceito"
    | "Preparando"
    | "Pronto"
    | "A caminho"
    | "Entregue"
    | "Cancelado",
): InventoryAdjustment {
  if (from === to) return "none";
  if (to === "Cancelado" && from !== "Cancelado") return "release";
  if (to === "Entregue" && from !== "Entregue") return "consume";
  return "none";
}

export function normalizeInventoryQuantity(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new Error("Quantidade de estoque inválida");
  }
  return value;
}
