export type HomeStoreCard = {
  key: string;
  storeId?: number;
  name: string;
  imageUrl?: string | null;
  fee?: string | null;
  open: boolean;
  nextOpenLabel?: string | null;
  distance?: string | null;
  productId: number;
};

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
  }>,
): HomeStoreCard[] {
  const grouped = new Map<string, HomeStoreCard>();
  for (const product of products) {
    const name = product.store?.trim() || product.name;
    const key = `${product.storeId ?? name.toLowerCase()}`;
    if (grouped.has(key)) continue;
    grouped.set(key, {
      key,
      storeId: product.storeId,
      name,
      imageUrl: product.imageUrl,
      fee: product.deliveryFee,
      open: product.storeOpen !== false,
      nextOpenLabel: product.nextOpenLabel,
      distance: product.distance,
      productId: product.id,
    });
  }
  return [...grouped.values()].slice(0, 12);
}
