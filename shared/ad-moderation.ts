const BLOCKED = [
  "nudez",
  "pelad",
  "porn",
  "sexo explícito",
  "sexo explicito",
  "partido político",
  "partido politico",
  "vote em",
  "cura milagrosa",
  "emagreça",
  "emagreca",
  "viagra",
  "anabolizante",
];

export function localModerationNote(text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const hit = BLOCKED.find((term) => normalized.includes(term));
  if (!hit) return null;
  return "Este anúncio precisa de uma revisão da equipe antes de aparecer no Explorar.";
}
