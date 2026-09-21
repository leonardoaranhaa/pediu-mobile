export type ChatParticipantRole = "customer" | "store" | "courier" | "support";
export function canAccessOrderChat(role: ChatParticipantRole, hasOrderAccess: boolean): boolean {
  return hasOrderAccess || role === "support";
}

export function validateMessageBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) throw new Error("Mensagem vazia");
  if (normalized.length > 2000) throw new Error("Mensagem muito longa");
  return normalized;
}
