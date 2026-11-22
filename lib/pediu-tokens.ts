/**
 * Hybrid design tokens — pediu2.0 red/cream + pediu-mobile petroleum ink.
 * Keep in sync with theme.config.js and APP_THEMES.classic.
 */
import { Platform, type ViewStyle } from "react-native";
export const PEDIU_TOKENS = {
  fontDisplay: "Fredoka",
  fontBody: "Nunito",
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
  surfaceElevated: "#FFFFFF",
  surfaceMuted: "#FFF0D7",
  text: "#1A120C",
  muted: "#6E635A",
  subtle: "#9A8E84",
  line: "#F0E4D8",
  success: "#0B8A5C",
  warning: "#FF8A3D",
  error: "#C81E1E",
  white: "#FFFFFF",
  inkFg: "#FFF4E8",
  coralLegacy: "#FF5A4F",
  radius: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 28, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
  type: {
    display: 34,
    title: 22,
    section: 18,
    body: 15,
    caption: 12,
  },
  motion: { press: 120, enter: 420, stagger: 50 },
  shadow: {
    card: { shadowOpacity: 0.07, shadowRadius: 16, y: 8 },
    float: { shadowOpacity: 0.22, shadowRadius: 20, y: 10 },
    primary: { shadowOpacity: 0.34, shadowRadius: 18, y: 10 },
  },
} as const;

/** Soft card depth that works on iOS and Android. */
export function cardElevation(level: "rest" | "raised" = "rest"): ViewStyle {
  const raised = level === "raised";
  return Platform.select({
    ios: {
      shadowColor: "#1A120C",
      shadowOffset: { width: 0, height: raised ? 10 : 6 },
      shadowOpacity: raised ? 0.16 : 0.1,
      shadowRadius: raised ? 18 : 12,
    },
    android: { elevation: raised ? 6 : 3 },
    default: {
      shadowColor: "#1A120C",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
  }) as ViewStyle;
}

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
  Hortifruti: "feijoada",
  Laticínios: "cafe",
  Mercearia: "cafe",
  Padaria: "cafe",
  Bebidas: "burger",
};

export function assetForCategory(category?: string | null, seed = 0): number {
  if (category && CATEGORY_ASSET[category])
    return FOOD_ASSETS[CATEGORY_ASSET[category]];
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
