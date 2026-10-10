export const SALE_UNITS = ["unit", "kg", "g", "L", "ml", "pack"] as const;
export type SaleUnit = (typeof SALE_UNITS)[number];

export const SALE_UNIT_LABELS: Record<SaleUnit, string> = {
  unit: "un",
  kg: "kg",
  g: "g",
  L: "L",
  ml: "ml",
  pack: "cx",
};

export function normalizeSaleUnit(value?: string | null): SaleUnit {
  if (value && (SALE_UNITS as readonly string[]).includes(value)) return value as SaleUnit;
  return "unit";
}

/** Default unit suggestion for market vertical categories (seller UX). */
export function suggestedSaleUnitForCategory(category?: string | null, storeKind?: string | null): SaleUnit {
  if (storeKind !== "market") return "unit";
  const key = (category ?? "").toLowerCase();
  if (/horti|fruta|legume|verdura|banana|tomate|alface/.test(key)) return "kg";
  if (/latic|leite|bebida|suco|refri/.test(key)) return "L";
  if (/ovo|kit|pack|caixa/.test(key)) return "pack";
  if (/merce|padaria|pão|pao|queijo/.test(key)) return "unit";
  return "unit";
}

export function formatPackSize(packSize?: string | number | null): string | null {
  if (packSize == null || packSize === "") return null;
  const n = Number(packSize);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Human price line for catalog cards, e.g. "R$ 8,90 / kg" or "R$ 16,90 / cx (12un)". */
export function formatCatalogPrice(
  price: string | number,
  saleUnit?: string | null,
  packSize?: string | number | null,
): string {
  const amount = Number(price);
  const money = `R$ ${(Number.isFinite(amount) ? amount : 0).toFixed(2).replace(".", ",")}`;
  const unit = normalizeSaleUnit(saleUnit);
  if (unit === "unit") return money;
  const label = SALE_UNIT_LABELS[unit];
  const pack = formatPackSize(packSize);
  if (unit === "pack" && pack) return `${money} / ${label} (${pack}un)`;
  if (pack && unit !== "pack") return `${money} / ${pack}${label}`;
  return `${money} / ${label}`;
}

export function unitSubtitle(saleUnit?: string | null, packSize?: string | number | null): string | null {
  const unit = normalizeSaleUnit(saleUnit);
  if (unit === "unit") return null;
  const pack = formatPackSize(packSize);
  if (unit === "pack") return pack ? `Caixa com ${pack} unidades` : "Vendido em caixa";
  if (pack) return `Por ${pack}${SALE_UNIT_LABELS[unit]}`;
  return `Por ${SALE_UNIT_LABELS[unit]}`;
}
