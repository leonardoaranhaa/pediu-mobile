export function groupRequiresChoice(group: {
  name: string;
  required?: boolean | number | null;
}) {
  if (group.required === true || group.required === 1) return true;
  return /tamanho|size/i.test(group.name);
}

export function defaultOptionSelection(
  groups: {
    id: number;
    name: string;
    required?: boolean | number | null;
    choices: { id: number }[];
  }[],
) {
  const selected: Record<number, number> = {};
  for (const group of groups) {
    if (!groupRequiresChoice(group)) continue;
    const first = group.choices[0];
    if (first) selected[group.id] = first.id;
  }
  return selected;
}
