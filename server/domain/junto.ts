/**
 * Pediu Junto — host-pays shared order model.
 * Feature remains OFF via experience.flags.pediuJunto until go-live.
 * Prefer correct modeling over fake split UX.
 */

export const JUNTO_SHARE_STATUSES = ["draft", "open", "locked", "paid", "cancelled"] as const;
export type JuntoShareStatus = (typeof JUNTO_SHARE_STATUSES)[number];

export const JUNTO_PARTICIPANT_ROLES = ["host", "guest"] as const;
export type JuntoParticipantRole = (typeof JUNTO_PARTICIPANT_ROLES)[number];

export const JUNTO_PARTICIPANT_STATUSES = ["invited", "joined", "left"] as const;
export type JuntoParticipantStatus = (typeof JUNTO_PARTICIPANT_STATUSES)[number];

/** Production path stays disabled until ops explicitly enables the flag. */
export const JUNTO_FEATURE_ENABLED = false;

export const JUNTO_DISABLED_REASON =
  "Pediu Junto ainda não está disponível. O modelo host-pays está preparado no domínio, mas a flag permanece desligada.";

export type PlanJuntoShareInput = {
  hostUserId: number;
  storeId: number;
  maxParticipants?: number;
  hostPaysAll?: boolean;
  note?: string | null;
};

export type PlanJuntoShareResult =
  | {
      ok: true;
      hostUserId: number;
      storeId: number;
      status: "draft";
      maxParticipants: number;
      hostPaysAll: true;
      note: string | null;
      paymentModel: "host_pays";
    }
  | { ok: false; reason: string };

export function planJuntoShare(input: PlanJuntoShareInput): PlanJuntoShareResult {
  if (!Number.isInteger(input.hostUserId) || input.hostUserId <= 0) {
    return { ok: false, reason: "Host inválido" };
  }
  if (!Number.isInteger(input.storeId) || input.storeId <= 0) {
    return { ok: false, reason: "Loja inválida" };
  }
  const max = input.maxParticipants ?? 6;
  if (!Number.isInteger(max) || max < 2 || max > 12) {
    return { ok: false, reason: "Máximo de participantes deve ser entre 2 e 12" };
  }
  // v1 product rule: only host-pays. Split PIX across guests is deferred.
  if (input.hostPaysAll === false) {
    return { ok: false, reason: "Split entre convidados ainda não é suportado; use host-pays" };
  }
  return {
    ok: true,
    hostUserId: input.hostUserId,
    storeId: input.storeId,
    status: "draft",
    maxParticipants: max,
    hostPaysAll: true,
    note: input.note?.trim() || null,
    paymentModel: "host_pays",
  };
}

export function canJoinJuntoShare(input: {
  shareStatus: JuntoShareStatus;
  participantCount: number;
  maxParticipants: number;
  alreadyJoined: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (input.alreadyJoined) return { ok: false, reason: "Você já está neste Pediu Junto" };
  if (input.shareStatus !== "open" && input.shareStatus !== "draft") {
    return { ok: false, reason: "Este Pediu Junto não aceita novos participantes" };
  }
  if (input.participantCount >= input.maxParticipants) {
    return { ok: false, reason: "Limite de participantes atingido" };
  }
  return { ok: true };
}

export function generateJuntoInviteCode(seed = Date.now()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PJ";
  let n = Math.abs(seed);
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + (i + 1) * 17;
  }
  return code;
}
