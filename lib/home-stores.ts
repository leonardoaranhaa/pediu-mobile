export type HomeStoreCard = {
  key: string;
  storeId?: number;
  name: string;
  imageUrl?: string | null;
  fee?: string | null;
  open: boolean;
  fast: boolean;
  nextOpenLabel?: string | null;
  distance?: string | null;
  productId: number;
};

export type HomeStoreFilter = "abertas" | "gratis" | "rapidas";

export function groupHomeStores(
  products: Array<{
    id: number;
    storeId?: number;
    store: string;
    name: string;
    imageUrl?: string | null;
    deliveryFee?: string | null;
    storeOpen?: boolean;
    nextOpenLabel?: string | null;
    distance?: string | null;
    flash?: boolean;
  }>,
): HomeStoreCard[] {
  const grouped = new Map<string, HomeStoreCard>();
  for (const product of products) {
    const name = product.store?.trim() || product.name;
    const key = `${product.storeId ?? name.toLowerCase()}`;
    const existing = grouped.get(key);
    if (existing) {
      if (product.flash) existing.fast = true;
      continue;
    }
    grouped.set(key, {
      key,
      storeId: product.storeId,
      name,
      imageUrl: product.imageUrl,
      fee: product.deliveryFee,
      open: product.storeOpen !== false,
      fast: Boolean(product.flash),
      nextOpenLabel: product.nextOpenLabel,
      distance: product.distance,
      productId: product.id,
    });
  }
  return [...grouped.values()].slice(0, 12);
}

export function filterHomeStores(stores: HomeStoreCard[], filter: HomeStoreFilter | null) {
  if (filter === "abertas") return stores.filter((store) => store.open);
  if (filter === "gratis") return stores.filter((store) => Number(store.fee ?? 0) <= 0);
  if (filter === "rapidas") return stores.filter((store) => store.fast);
  return stores;
}
