const TECHNICAL =
  /sql|postgres|drizzle|database|failed query|syntax|typeerror|stack trace|econn|password authentication|jwt|undefined is not|cannot read propert|null is not/i;

export const FRIENDLY_FAILURE =
  "Não foi possível concluir agora. Tente de novo em instantes.";

function zodMessage(text: string) {
  const blob = text.toLowerCase();
  const looksTechnical =
    blob.includes("invalid_format") ||
    blob.includes("invalid email") ||
    blob.includes('"code"') ||
    blob.startsWith("[") ||
    blob.startsWith("{");
  if (!looksTechnical) return null;
  if (blob.includes("email")) return "Esse e-mail não parece válido.";
  if (blob.includes("password") || blob.includes("senha") || blob.includes("too_small")) {
    return "Confira a senha e tente de novo.";
  }
  return "Confira os dados e tente de novo.";
}

export function friendlyUserMessage(message: string | null | undefined) {
  const text = message?.trim() ?? "";
  if (!text || TECHNICAL.test(text)) return FRIENDLY_FAILURE;
  return zodMessage(text) ?? text;
}

export function userFacingError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return friendlyUserMessage(String((error as { message: unknown }).message));
  }
  return FRIENDLY_FAILURE;
}
