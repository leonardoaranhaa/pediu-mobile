export type OrderStatus = "Pendente" | "Preparando" | "A caminho" | "Entregue";

export type CatalogProduct = {
  id: number;
  name: string;
  category: string;
  available: boolean;
};

const STATUS_ORDER: OrderStatus[] = ["Pendente", "Preparando", "A caminho", "Entregue"];

export function advanceOrderStatus(status: OrderStatus): OrderStatus {
  const index = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[Math.min(index + 1, STATUS_ORDER.length - 1)];
}

export function filterCatalog(products: CatalogProduct[], category: string): CatalogProduct[] {
  if (category === "Tudo") return products;
  return products.filter((product) => product.category === category && product.available);
}

export function canPlaceOrder(cartSize: number): boolean {
  return cartSize > 0;
}
