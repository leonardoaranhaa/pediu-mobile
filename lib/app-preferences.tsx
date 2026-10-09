import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Auth from "@/lib/_core/auth";
export { mascotReactionForPath } from "@/lib/mascot-scenes";

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

const STORAGE_KEY = "pediu:app-theme:visitor";
const CUSTOMIZATION_STORAGE_KEY = "pediu:customization:visitor";

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

function storageKeyForUser(userId?: number | null) {
  return userId ? `pediu:app-theme:user:${userId}` : STORAGE_KEY;
}

function customizationStorageKeyForUser(userId?: number | null) {
  return userId
    ? `pediu:customization:user:${userId}`
    : CUSTOMIZATION_STORAGE_KEY;
}

function normalizeCustomization(value: unknown): AppCustomization {
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

function isAppThemeId(value: string | null | undefined): value is AppThemeId {
  return value === "classic" || value === "ocean" || value === "sunset";
}

type AppPreferencesValue = {
  themeId: AppThemeId;
  theme: AppTheme;
  setTheme: (themeId: AppThemeId) => void;
  setThemeForUser: (userId: number, themeId: AppThemeId) => void;
  customization: AppCustomization;
  updateCustomization: (changes: Partial<AppCustomization>) => void;
  resetCustomization: () => void;
  mascotMoment: MascotMoment | null;
  setMascotMoment: (reaction: MascotMomentReaction) => void;
  ready: boolean;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<AppThemeId>("classic");
  const [customization, setCustomization] = useState<AppCustomization>(
    DEFAULT_CUSTOMIZATION,
  );
  const [mascotMoment, setMascotMomentState] = useState<MascotMoment | null>(
    null,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "classic" || stored === "ocean" || stored === "sunset")
          setThemeId(stored);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(CUSTOMIZATION_STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          setCustomization(normalizeCustomization(JSON.parse(stored)));
        } catch {
          setCustomization(DEFAULT_CUSTOMIZATION);
        }
      })
      .catch(() => undefined);
  }, []);

  const setTheme = useCallback((nextTheme: AppThemeId) => {
    setThemeId(nextTheme);
    void AsyncStorage.setItem(STORAGE_KEY, nextTheme);
  }, []);

  const setThemeForUser = useCallback(
    (userId: number, nextTheme: AppThemeId) => {
      setThemeId(nextTheme);
      void AsyncStorage.setItem(storageKeyForUser(userId), nextTheme);
    },
    [],
  );

  const updateCustomization = useCallback(
    (changes: Partial<AppCustomization>) => {
      setCustomization((current) => {
        const next = normalizeCustomization({ ...current, ...changes });
        void Auth.getUserInfo().then((user) =>
          AsyncStorage.setItem(
            customizationStorageKeyForUser(user?.id),
            JSON.stringify(next),
          ),
        );
        return next;
      });
    },
    [],
  );

  const resetCustomization = useCallback(() => {
    setCustomization(DEFAULT_CUSTOMIZATION);
    void Auth.getUserInfo().then((user) =>
      AsyncStorage.setItem(
        customizationStorageKeyForUser(user?.id),
        JSON.stringify(DEFAULT_CUSTOMIZATION),
      ),
    );
  }, []);

  const setMascotMoment = useCallback((reaction: MascotMomentReaction) => {
    setMascotMomentState({ reaction, key: Date.now() });
  }, []);

  const applyUserTheme = useCallback(
    (user: Auth.User | null) => {
      if (!user?.id) {
        void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
          if (isAppThemeId(stored)) setThemeId(stored);
        });
        return;
      }

      if (isAppThemeId(user.themePreference)) {
        setThemeForUser(user.id, user.themePreference);
        return;
      }

      void AsyncStorage.getItem(storageKeyForUser(user.id)).then((stored) => {
        if (isAppThemeId(stored)) setThemeId(stored);
      });
    },
    [setThemeForUser],
  );

  useEffect(() => {
    const unsubscribe = Auth.subscribeUserInfo(applyUserTheme);
    void Auth.getUserInfo().then(applyUserTheme);
    return unsubscribe;
  }, [applyUserTheme]);

  useEffect(() => {
    let active = true;
    const loadCustomization = (user: Auth.User | null) => {
      void AsyncStorage.getItem(customizationStorageKeyForUser(user?.id)).then(
        (stored) => {
          if (!active) return;
          if (!stored) {
            setCustomization(DEFAULT_CUSTOMIZATION);
            return;
          }
          try {
            setCustomization(normalizeCustomization(JSON.parse(stored)));
          } catch {
            setCustomization(DEFAULT_CUSTOMIZATION);
          }
        },
      );
    };
    void Auth.getUserInfo().then(loadCustomization);
    const unsubscribe = Auth.subscribeUserInfo(loadCustomization);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      theme: APP_THEMES.find((item) => item.id === themeId) ?? APP_THEMES[0],
      setTheme,
      setThemeForUser,
      customization,
      updateCustomization,
      resetCustomization,
      mascotMoment,
      setMascotMoment,
      ready,
    }),
    [
      customization,
      mascotMoment,
      ready,
      resetCustomization,
      setMascotMoment,
      setTheme,
      setThemeForUser,
      themeId,
      updateCustomization,
    ],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences(): AppPreferencesValue {
  const context = useContext(AppPreferencesContext);
  if (!context)
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider",
    );
  return context;
}
