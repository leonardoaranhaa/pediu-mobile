export type HomePeriod =
  | "dawn"
  | "morning"
  | "lunch"
  | "afternoon"
  | "dinner"
  | "lateNight";

export type HomeStoreKind = "restaurant" | "market" | "service";

export type HomeContext = {
  hour: number;
  period: HomePeriod;
  greeting: string;
  subtitle: string;
  focusLabel: string;
  focusDescription: string;
  priorityKinds: HomeStoreKind[];
  priorityCategories: string[];
};

export type HomeRankableProduct = {
  storeKind?: HomeStoreKind;
  category?: string | null;
  flash?: boolean;
  available?: boolean;
  adId?: number | null;
};

function normalizedHour(hour: number) {
  if (!Number.isFinite(hour)) return 0;
  return Math.min(23, Math.max(0, Math.floor(hour)));
}

export function homePeriodForHour(hour: number): HomePeriod {
  const normalized = normalizedHour(hour);
  if (normalized < 5) return "dawn";
  if (normalized < 11) return "morning";
  if (normalized < 15) return "lunch";
  if (normalized < 18) return "afternoon";
  if (normalized < 23) return "dinner";
  return "lateNight";
}

export function homeContextForHour(hour: number): HomeContext {
  const normalized = normalizedHour(hour);
  const period = homePeriodForHour(normalized);

  switch (period) {
    case "dawn":
      return {
        hour: normalized,
        period,
        greeting: "Boa madrugada",
        subtitle: "Flash e lanches para quando a cidade desacelera.",
        focusLabel: "Flash na madrugada",
        focusDescription: "O que estiver aberto e elegível aparece primeiro.",
        priorityKinds: ["restaurant", "market", "service"],
        priorityCategories: ["Lanches", "Padaria"],
      };
    case "morning":
      return {
        hour: normalized,
        period,
        greeting: "Bom dia",
        subtitle: "Café, padaria e compras da casa sem sair da rotina.",
        focusLabel: "Café e mercado",
        focusDescription: "Padarias e mercados ganham destaque nesta janela.",
        priorityKinds: ["market", "restaurant", "service"],
        priorityCategories: ["Padaria", "Cafés", "Salgados"],
      };
    case "lunch":
      return {
        hour: normalized,
        period,
        greeting: "Bom almoço",
        subtitle: "Almoço na hora, com o mercado por perto quando precisar.",
        focusLabel: "Almoço e compras",
        focusDescription: "Restaurantes lideram; Mercado Pediu continua à mão.",
        priorityKinds: ["restaurant", "market", "service"],
        priorityCategories: ["Brasileira", "Lanches", "Saudável", "Padaria"],
      };
    case "afternoon":
      return {
        hour: normalized,
        period,
        greeting: "Boa tarde",
        subtitle: "Um lanche agora ou a compra da casa resolvem o dia.",
        focusLabel: "Lanche da tarde",
        focusDescription:
          "Padarias, açaí e Mercado Pediu disputam o próximo toque.",
        priorityKinds: ["restaurant", "market", "service"],
        priorityCategories: ["Padaria", "Salgados", "Saudável", "Cafés"],
      };
    case "dinner":
      return {
        hour: normalized,
        period,
        greeting: "Boa noite",
        subtitle:
          "Jantar sem fila, sem dúvida — e compras até onde houver oferta.",
        focusLabel: "Jantar e Flash",
        focusDescription: "Fast-food, restaurantes e Flash ganham ritmo agora.",
        priorityKinds: ["restaurant", "market", "service"],
        priorityCategories: ["Lanches", "Pizza", "Japonesa", "Churrasco"],
      };
    case "lateNight":
      return {
        hour: normalized,
        period,
        greeting: "Boa noite",
        subtitle: "Madrugada pede Flash. A gente corre.",
        focusLabel: "Flash da madrugada",
        focusDescription:
          "Veja primeiro o que ainda está aberto para entregar.",
        priorityKinds: ["restaurant", "market", "service"],
        priorityCategories: ["Lanches", "Pizza", "Padaria"],
      };
  }
}

export function getHomeContext(date = new Date()): HomeContext {
  return homeContextForHour(date.getHours());
}

function scoreProduct(
  product: HomeRankableProduct,
  context: HomeContext,
  originalIndex: number,
) {
  const kind = product.storeKind ?? "restaurant";
  const category = product.category?.trim();
  let score = 0;

  if (product.available !== false) score += 8;
  if (product.adId) score += 2;
  if (product.flash)
    score +=
      context.period === "dinner" || context.period === "lateNight" ? 26 : 9;
  if (context.priorityKinds.indexOf(kind) === 0) score += 18;
  else if (context.priorityKinds.includes(kind)) score += 8;
  if (category && context.priorityCategories.includes(category)) score += 16;

  // Mercado stays visible throughout the day, but gets contextual prominence
  // during its normal local shopping window instead of competing at night.
  if (kind === "market") {
    score += context.hour >= 7 && context.hour < 20 ? 20 : 3;
  }
  if (kind === "restaurant" && context.period === "dawn" && !product.flash) {
    score -= 8;
  }

  return score * 10_000 - originalIndex;
}

export function rankHomeProducts<T extends HomeRankableProduct>(
  products: T[],
  context: HomeContext,
): T[] {
  return products
    .map((product, originalIndex) => ({
      product,
      score: scoreProduct(product, context, originalIndex),
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ product }) => product);
}
