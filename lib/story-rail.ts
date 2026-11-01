export function uniqueStoreStories<T extends { store: string }>(products: T[], limit = 8) {
  const seen = new Set<string>();
  const stories: T[] = [];
  for (const product of products) {
    const key = product.store.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    stories.push(product);
    if (stories.length >= limit) break;
  }
  return stories;
}
