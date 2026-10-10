export type AppThemeId = "classic" | "ocean" | "sunset";
export type AppMascotStyle = "classic" | "ocean" | "sunset";
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
    highlight: "#FFCB77",
    highlightText: "#44213B",
    iconBackground: "#FFF0F5",
  },
];

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
