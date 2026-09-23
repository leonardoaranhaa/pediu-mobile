import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as Auth from "@/lib/_core/auth";

export type AppThemeId = "classic" | "ocean" | "sunset";

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
    label: "Pediu original",
    tagline: "Coral, caloroso e local",
    primary: "#FF5A4F",
    primarySoft: "#FFF0EC",
    canvas: "#FFF8F1",
    ink: "#163B48",
    text: "#18252B",
    muted: "#7C8A8F",
    line: "#F0E9E3",
    card: "#FFFFFF",
    highlight: "#FFD166",
    highlightText: "#163B48",
    iconBackground: "#FFF0EC",
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

function storageKeyForUser(userId?: number | null) {
  return userId ? `pediu:app-theme:user:${userId}` : STORAGE_KEY;
}

function isAppThemeId(value: string | null | undefined): value is AppThemeId {
  return value === "classic" || value === "ocean" || value === "sunset";
}

type AppPreferencesValue = {
  themeId: AppThemeId;
  theme: AppTheme;
  setTheme: (themeId: AppThemeId) => void;
  setThemeForUser: (userId: number, themeId: AppThemeId) => void;
  ready: boolean;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<AppThemeId>("classic");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "classic" || stored === "ocean" || stored === "sunset") setThemeId(stored);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setTheme = useCallback((nextTheme: AppThemeId) => {
    setThemeId(nextTheme);
    void AsyncStorage.setItem(STORAGE_KEY, nextTheme);
  }, []);

  const setThemeForUser = useCallback((userId: number, nextTheme: AppThemeId) => {
    setThemeId(nextTheme);
    void AsyncStorage.setItem(storageKeyForUser(userId), nextTheme);
  }, []);

  const applyUserTheme = useCallback((user: Auth.User | null) => {
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
  }, [setThemeForUser]);

  useEffect(() => {
    const unsubscribe = Auth.subscribeUserInfo(applyUserTheme);
    void Auth.getUserInfo().then(applyUserTheme);
    return unsubscribe;
  }, [applyUserTheme]);

  const value = useMemo(() => ({
    themeId,
    theme: APP_THEMES.find((item) => item.id === themeId) ?? APP_THEMES[0],
    setTheme,
    setThemeForUser,
    ready,
  }), [ready, setTheme, setThemeForUser, themeId]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences(): AppPreferencesValue {
  const context = useContext(AppPreferencesContext);
  if (!context) throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  return context;
}
