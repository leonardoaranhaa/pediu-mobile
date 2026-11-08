export type QueueableOrder = {
  id: number;
  isFlash?: number | boolean | null;
  status: string;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

const ACTIVE_DELIVERY_STATUSES = new Set(["Pronto", "A caminho"]);

function asFlash(value: number | boolean | null | undefined): boolean {
  return value === true || value === 1;
}

function timeKey(order: QueueableOrder): number {
  const raw = order.updatedAt ?? order.createdAt;
  if (!raw) return order.id;
  const ms = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : order.id;
}

/** Flash first, then oldest updated — real domain ordering for courier assignment. */
export function prioritizeFlashDeliveryQueue<T extends QueueableOrder>(orders: T[]): T[] {
  return [...orders]
    .filter((order) => ACTIVE_DELIVERY_STATUSES.has(order.status))
    .sort((a, b) => {
      const flashDelta = Number(asFlash(b.isFlash)) - Number(asFlash(a.isFlash));
      if (flashDelta !== 0) return flashDelta;
      const timeDelta = timeKey(a) - timeKey(b);
      if (timeDelta !== 0) return timeDelta;
      return a.id - b.id;
    });
}

export function suggestedFlashEtaMinutes(
  order: { isFlash?: number | boolean | null },
  store: { flashEtaMaxMinutes?: number | null } | null | undefined,
  requested?: number,
): number | undefined {
  if (requested != null) return requested;
  if (!asFlash(order.isFlash)) return undefined;
  return store?.flashEtaMaxMinutes ?? 20;
}
