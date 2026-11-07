export const STORE_NEVER_ACCEPTED_REASON =
  "A loja não aceitou o pedido a tempo. Por isso ele foi cancelado.";

export const STORE_ACCEPT_TIMEOUT_MS = 5 * 60_000;

export const CITY_OFFER_TTL_MS = 90_000;

export const NEARBY_COURIER_RADIUS_KM = 8;

export type WeekdayHours = {
  open: string;
  close: string;
  closed?: boolean;
};

export type OpeningHours = Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", WeekdayHours>>;

const WEEKDAY_LABELS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

export function parseOptionalPrice(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function ignoreEmptyPriceBand(minPrice?: number, maxPrice?: number) {
  if (minPrice === 0 && maxPrice === 0) {
    return { minPrice: undefined, maxPrice: undefined };
  }
  return { minPrice, maxPrice };
}

export function haversineKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatKm(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "distância a calcular";
  if (value < 1) return `${Math.max(1, Math.round(value * 1000))} m`;
  return `${value.toFixed(1).replace(".", ",")} km`;
}

export function courierEarning(deliveryFee: unknown, tipAmount: unknown): number {
  const fee = Number(deliveryFee ?? 0);
  const tip = Number(tipAmount ?? 0);
  const total = (Number.isFinite(fee) ? fee : 0) + (Number.isFinite(tip) ? tip : 0);
  return Math.round(total * 100) / 100;
}

export function formatMoney(value: unknown): string {
  return `R$ ${Number(value ?? 0)
    .toFixed(2)
    .replace(".", ",")}`;
}

export function createDeliveryCode(random: () => number = Math.random): string {
  const sample = Math.floor(Math.abs(random()) * 10000) % 10000;
  return String(sample).padStart(4, "0");
}

export function deliveryCodesMatch(expected: string | null | undefined, typed: string): boolean {
  if (!expected) return true;
  return expected === typed.trim();
}

export function countdownLabel(expiresAt: Date | string, now = new Date()): string {
  const end = new Date(expiresAt).getTime();
  const left = Math.max(0, Math.ceil((end - now.getTime()) / 1000));
  const minutes = Math.floor(left / 60);
  const seconds = left % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function mapsNavigationUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
}

export function wazeNavigationUrl(latitude: number, longitude: number): string {
  return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
}

export function parseOpeningHours(raw: string | null | undefined): OpeningHours | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as OpeningHours;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function minutesOf(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function withinWindow(now: Date, open: string, close: string): boolean {
  const start = minutesOf(open);
  const end = minutesOf(close);
  if (start == null || end == null) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  if (end === start) return true;
  if (end > start) return current >= start && current < end;
  return current >= start || current < end;
}

export function resolveStoreAvailability(input: {
  isOpen: number | boolean;
  openingHours?: string | null;
  now?: Date;
}): { open: boolean; nextOpenLabel: string | null } {
  const paused = input.isOpen === 0 || input.isOpen === false;
  const hours = parseOpeningHours(input.openingHours);
  if (paused) {
    return {
      open: false,
      nextOpenLabel: "A loja pausou os pedidos",
    };
  }
  if (!hours) return { open: true, nextOpenLabel: null };
  const now = input.now ?? new Date();
  const todayKey = String(now.getDay()) as keyof OpeningHours;
  const today = hours[todayKey];
  if (today && !today.closed && withinWindow(now, today.open, today.close)) {
    return { open: true, nextOpenLabel: null };
  }
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (now.getDay() + offset) % 7;
    const window = hours[String(day) as keyof OpeningHours];
    if (!window || window.closed) continue;
    const when =
      offset === 0 ? "hoje" : offset === 1 ? "amanhã" : WEEKDAY_LABELS[day];
    return {
      open: false,
      nextOpenLabel: `Abre ${when} às ${window.open}`,
    };
  }
  return { open: false, nextOpenLabel: "Sem horário de abertura" };
}

export function defaultOpeningHours(): OpeningHours {
  const weekday = { open: "11:00", close: "23:00", closed: false };
  return {
    "0": { open: "11:00", close: "23:00", closed: true },
    "1": weekday,
    "2": weekday,
    "3": weekday,
    "4": weekday,
    "5": weekday,
    "6": { open: "11:00", close: "23:59", closed: false },
  };
}
