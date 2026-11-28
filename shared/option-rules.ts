/**
 * Rules for product add-on groups ("Ponto da carne", "Adicionais", "Sabores").
 * Shared by the app (what the customer may tap) and the server (what an order may carry),
 * so both always agree on the minimum and maximum of each group.
 */

export type OptionGroupRule = {
  id: number;
  name: string;
  required?: boolean | number | null;
  minChoices?: number | null;
  maxChoices?: number | null;
  choices: { id: number }[];
};

export type OptionLimits = { min: number; max: number };

/** Selected choice ids per group id. */
export type OptionSelection = Record<number, number[]>;

function legacyRequired(group: Pick<OptionGroupRule, "name" | "required">) {
  if (group.required === true || group.required === 1) return true;
  return /tamanho|size/i.test(group.name);
}

export function optionGroupLimits(group: OptionGroupRule): OptionLimits {
  const available = group.choices.length;
  const declaredMin = Math.max(0, Math.floor(group.minChoices ?? 0));
  const min = Math.min(Math.max(declaredMin, legacyRequired(group) ? 1 : 0), available);
  const declaredMax = Math.floor(group.maxChoices ?? 1);
  const max = Math.min(Math.max(declaredMax, min, 1), Math.max(available, 1));
  return { min, max };
}

export function optionGroupIsRequired(group: OptionGroupRule) {
  return optionGroupLimits(group).min > 0;
}

/** Short hint shown next to the group name. */
export function optionGroupHint(group: OptionGroupRule) {
  const { min, max } = optionGroupLimits(group);
  if (min === 0) return max === 1 ? "opcional · escolha 1" : `opcional · até ${max}`;
  if (min === max) return min === 1 ? "obrigatório · escolha 1" : `obrigatório · escolha ${min}`;
  return `obrigatório · de ${min} a ${max}`;
}

export type ToggleResult = { selection: OptionSelection; notice?: string };

/**
 * Taps a choice. Groups with a maximum of one behave like radio buttons (tapping
 * the chosen one again clears it); other groups add or remove the choice and
 * refuse a tap that would pass the maximum.
 */
export function toggleOptionChoice(
  selection: OptionSelection,
  group: OptionGroupRule,
  choiceId: number,
): ToggleResult {
  const { max } = optionGroupLimits(group);
  const current = selection[group.id] ?? [];
  if (current.includes(choiceId)) {
    return { selection: { ...selection, [group.id]: current.filter((id) => id !== choiceId) } };
  }
  if (max === 1) return { selection: { ...selection, [group.id]: [choiceId] } };
  if (current.length >= max) {
    return {
      selection,
      notice: `Em ${group.name}, escolha até ${max} ${max === 1 ? "opção" : "opções"}.`,
    };
  }
  return { selection: { ...selection, [group.id]: [...current, choiceId] } };
}

/** First group whose minimum is not met, with the message to show. */
export function missingOptionChoice(groups: OptionGroupRule[], selection: OptionSelection) {
  for (const group of groups) {
    const { min } = optionGroupLimits(group);
    const count = (selection[group.id] ?? []).length;
    if (count < min) {
      return {
        group,
        message:
          min === 1
            ? `Escolha ${group.name} para continuar.`
            : `Escolha ${min} opções em ${group.name} para continuar.`,
      };
    }
  }
  return undefined;
}

/** Selected choices in the order the groups and choices are shown. */
export function selectedOptionChoices<G extends OptionGroupRule>(
  groups: G[],
  selection: OptionSelection,
): Array<{ group: G; choice: G["choices"][number] }> {
  return groups.flatMap((group) => {
    const ids = selection[group.id] ?? [];
    return group.choices
      .filter((choice) => ids.includes(choice.id))
      .map((choice) => ({ group, choice }));
  });
}
