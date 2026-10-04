/**
 * Hybrid design tokens — pediu2.0 red/cream + pediu-mobile petroleum ink.
 * Keep in sync with theme.config.js and APP_THEMES.classic.
 */
export const PEDIU_TOKENS = {
  primary: "#E20D2A",
  primarySoft: "#FFE8EB",
  primaryFg: "#FFF7F5",
  accent: "#FFC400",
  accentFg: "#1A120C",
  ink: "#163B48",
  inkDeep: "#111111",
  canvas: "#FFF4E8",
  canvasDeep: "#FFE2C4",
  surface: "#FFFDF9",
  surface2: "#FFF7EE",
  text: "#1A120C",
  muted: "#6E635A",
  subtle: "#9A8E84",
  line: "#F0E4D8",
  success: "#0B8A5C",
  warning: "#FF8A3D",
  error: "#C81E1E",
  white: "#FFFFFF",
  coralLegacy: "#FF5A4F",
  radius: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 28, pill: 999 },
} as const;

export type FoodAssetKey =
  | "acai"
  | "burger"
  | "cafe"
  | "churrasco"
  | "feijoada"
  | "pasta"
  | "pizza"
  | "poke"
  | "sushi"
  | "thai";

export const FOOD_ASSETS: Record<FoodAssetKey, number> = {
  acai: require("../assets/images/food/acai.jpg"),
  burger: require("../assets/images/food/burger.jpg"),
  cafe: require("../assets/images/food/cafe.jpg"),
  churrasco: require("../assets/images/food/churrasco.jpg"),
  feijoada: require("../assets/images/food/feijoada.jpg"),
  pasta: require("../assets/images/food/pasta.jpg"),
  pizza: require("../assets/images/food/pizza.jpg"),
  poke: require("../assets/images/food/poke.jpg"),
  sushi: require("../assets/images/food/sushi.jpg"),
  thai: require("../assets/images/food/thai.jpg"),
};

const CATEGORY_ASSET: Record<string, FoodAssetKey> = {
  Doces: "acai",
  Lanches: "burger",
  Serviços: "cafe",
  Pizza: "pizza",
  Japonesa: "sushi",
  Massas: "pasta",
  Mercado: "feijoada",
};

export function assetForCategory(category?: string | null, seed = 0): number {
  if (category && CATEGORY_ASSET[category]) return FOOD_ASSETS[CATEGORY_ASSET[category]];
  const keys = Object.keys(FOOD_ASSETS) as FoodAssetKey[];
  return FOOD_ASSETS[keys[Math.abs(seed) % keys.length]];
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 6) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function hungerLine(hour = new Date().getHours()): string {
  if (hour < 11) return "Café, pão ou aquele açaí matinal?";
  if (hour < 15) return "Almoço perto, sem fila no chat.";
  if (hour < 18) return "Lanche da tarde com entrega Flash.";
  return "Janta resolvida. O bairro entrega.";
}
