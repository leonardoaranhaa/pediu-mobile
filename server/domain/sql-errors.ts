function walkError(error: unknown, accept: (record: { code?: string; message?: string }) => boolean) {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as { code?: string; message?: string; cause?: unknown };
    if (accept(record)) return true;
    if (record.cause) queue.push(record.cause);
  }
  return false;
}

export function isUndefinedColumn(error: unknown) {
  return walkError(error, (record) => {
    if (record.code === "42703") return true;
    return typeof record.message === "string" && /column .* does not exist/i.test(record.message);
  });
}
