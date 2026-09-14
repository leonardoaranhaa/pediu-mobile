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

export function orderProgress(status: OrderStatus): number {
  return { Pendente: 25, Preparando: 50, "A caminho": 78, Entregue: 100 }[status];
}

export function pixPaymentLabel(status: "idle" | "pending"): string {
  return status === "pending" ? "PIX criado · aguardando confirmação do gateway" : "Gerar cobrança PIX";
}

export function formatLocationLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
}
