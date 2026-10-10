export type AppThemeId = "classic" | "ocean" | "sunset";
export type AppMascotStyle = "classic" | "ocean" | "sunset";
export type AppColorScheme = "light" | "dark";
export type MascotMomentReaction =
  | "idle"
  | "hungry"
  | "happy"
  | "full"
  | "sleepy"
  | "avoid"
  | "curious"
  | "celebrate";

export type MascotMoment = {
  reaction: MascotMomentReaction;
  key: number;
};

export type AppCustomization = {
  mascotStyle: AppMascotStyle;
  mascotEnabled: boolean;
  motionEnabled: boolean;
  showHints: boolean;
  smartHomeEnabled: boolean;
  analyticsEnabled: boolean;
  locationEnabled: boolean;
  diagnosticsEnabled: boolean;
};

export type AppTheme = {
  id: AppThemeId;
  label: string;
  tagline: string;
  primary: string;
  primarySoft: string;
  canvas: string;
  ink: string;
  text: string;
  muted: string;
  line: string;
  card: string;
  deep: string;
  onDeep: string;
  highlight: string;
  highlightText: string;
  iconBackground: string;
};

export const APP_THEMES: AppTheme[] = [
  {
    id: "classic",
    label: "Pediu 2.0",
    tagline: "Vermelho vivo, calor local e muita atitude",
    primary: "#E20D2A",
    primarySoft: "#FFE7E7",
    canvas: "#FFF4E8",
    ink: "#111111",
    text: "#1A120C",
    muted: "#6E635A",
    line: "#E9DED3",
    card: "#FFFDF9",
    deep: "#111111",
    onDeep: "#FFFDF9",
    highlight: "#FFC400",
    highlightText: "#1A120C",
    iconBackground: "#FFE7E7",
  },
  {
    id: "ocean",
    label: "Onda local",
    tagline: "Fresco, confiante e vibrante",
    primary: "#008C95",
    primarySoft: "#E2F7F5",
    canvas: "#F1FBFA",
    ink: "#073B4C",
    text: "#12343B",
    muted: "#68858A",
    line: "#D8ECEB",
    card: "#FFFFFF",
    deep: "#073B4C",
    onDeep: "#FFFFFF",
    highlight: "#7BDFF2",
    highlightText: "#073B4C",
    iconBackground: "#E2F7F5",
  },
  {
    id: "sunset",
    label: "Pôr do sol",
    tagline: "Criativo, doce e compartilhável",
    primary: "#E64980",
    primarySoft: "#FFF0F5",
    canvas: "#FFF8FC",
    ink: "#44213B",
    text: "#382332",
    muted: "#92788D",
    line: "#F2DDE8",
    card: "#FFFFFF",
    deep: "#44213B",
    onDeep: "#FFF8FC",
    highlight: "#FFCB77",
    highlightText: "#44213B",
    iconBackground: "#FFF0F5",
  },
];

const DARK_THEME_OVERRIDES: Record<
  AppThemeId,
  Omit<
    AppTheme,
    "id" | "label" | "tagline" | "primary" | "highlight"
  > & {
    primary: string;
    highlight: string;
  }
> = {
  classic: {
    primary: "#FF5268",
    primarySoft: "#4A2026",
    canvas: "#1A120C",
    ink: "#FFF4E8",
    text: "#FFF4E8",
    muted: "#CDBFB4",
    line: "#5A493D",
    card: "#2B2018",
    deep: "#100B08",
    onDeep: "#FFF4E8",
    highlight: "#FFD85C",
    highlightText: "#2B2018",
    iconBackground: "#4A2026",
  },
  ocean: {
    primary: "#4FD1D9",
    primarySoft: "#163C41",
    canvas: "#071C20",
    ink: "#E9FFFF",
    text: "#E9FFFF",
    muted: "#A7C7C9",
    line: "#31575C",
    card: "#102D32",
    deep: "#061418",
    onDeep: "#E9FFFF",
    highlight: "#9BEAF0",
    highlightText: "#073B4C",
    iconBackground: "#163C41",
  },
  sunset: {
    primary: "#FF7DA5",
    primarySoft: "#4C2435",
    canvas: "#21101A",
    ink: "#FFF0F6",
    text: "#FFF0F6",
    muted: "#D2A9B8",
    line: "#593547",
    card: "#321A26",
    deep: "#190C13",
    onDeep: "#FFF0F6",
    highlight: "#FFD38D",
    highlightText: "#44213B",
    iconBackground: "#4C2435",
  },
};

export const DEFAULT_CUSTOMIZATION: AppCustomization = {
  mascotStyle: "classic",
  mascotEnabled: true,
  motionEnabled: true,
  showHints: true,
  smartHomeEnabled: true,
  analyticsEnabled: true,
  locationEnabled: false,
  diagnosticsEnabled: false,
};

export function themeForMode(
  theme: AppTheme,
  mode: AppColorScheme,
): AppTheme {
  if (mode === "light") return theme;
  const overrides = DARK_THEME_OVERRIDES[theme.id];
  return {
    ...theme,
    ...overrides,
  };
}

export function normalizeCustomization(value: unknown): AppCustomization {
  if (!value || typeof value !== "object") return DEFAULT_CUSTOMIZATION;
  const candidate = value as Partial<AppCustomization>;
  return {
    mascotStyle:
      candidate.mascotStyle === "classic" ||
      candidate.mascotStyle === "ocean" ||
      candidate.mascotStyle === "sunset"
        ? candidate.mascotStyle
        : DEFAULT_CUSTOMIZATION.mascotStyle,
    mascotEnabled: candidate.mascotEnabled !== false,
    motionEnabled: candidate.motionEnabled !== false,
    showHints: candidate.showHints !== false,
    smartHomeEnabled: candidate.smartHomeEnabled !== false,
    analyticsEnabled: candidate.analyticsEnabled !== false,
    locationEnabled: candidate.locationEnabled === true,
    diagnosticsEnabled: candidate.diagnosticsEnabled === true,
  };
}

export function isAppThemeId(
  value: string | null | undefined,
): value is AppThemeId {
  return value === "classic" || value === "ocean" || value === "sunset";
}
