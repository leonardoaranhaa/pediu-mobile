export type InventoryAdjustment = "reserve" | "release" | "consume" | "none";

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
