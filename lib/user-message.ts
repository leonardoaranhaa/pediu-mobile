const TECHNICAL =
  /sql|postgres|drizzle|database|failed query|syntax|typeerror|stack trace|econn|password authentication|jwt|undefined is not|cannot read propert|null is not/i;

export const FRIENDLY_FAILURE =
  "Não foi possível concluir agora. Tente de novo em instantes.";

export function friendlyUserMessage(message: string | null | undefined) {
  const text = message?.trim() ?? "";
  if (!text || TECHNICAL.test(text)) return FRIENDLY_FAILURE;
  return text;
}
