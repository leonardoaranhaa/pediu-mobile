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
import { mascotReactionForPath } from "@/lib/mascot-scenes";
import { useThemeContext } from "@/lib/theme-provider";
import {
  APP_THEMES,
  DEFAULT_CUSTOMIZATION,
  isAppThemeId,
  normalizeCustomization,
  themeForMode,
  type AppCustomization,
  type AppColorScheme,
  type AppMascotStyle,
  type AppTheme,
  type AppThemeId,
  type MascotMoment,
  type MascotMomentReaction,
} from "@/lib/app-preferences-core";

export {
  APP_THEMES,
  DEFAULT_CUSTOMIZATION,
  normalizeCustomization,
  mascotReactionForPath,
};
export type {
  AppCustomization,
  AppColorScheme,
  AppMascotStyle,
  AppTheme,
  AppThemeId,
  MascotMoment,
  MascotMomentReaction,
};

const STORAGE_KEY = "pediu:app-theme:visitor";
const CUSTOMIZATION_STORAGE_KEY = "pediu:customization:visitor";

function storageKeyForUser(userId?: number | null) {
  return userId ? `pediu:app-theme:user:${userId}` : STORAGE_KEY;
}

function customizationStorageKeyForUser(userId?: number | null) {
  return userId
    ? `pediu:customization:user:${userId}`
    : CUSTOMIZATION_STORAGE_KEY;
}

type AppPreferencesValue = {
  themeId: AppThemeId;
  theme: AppTheme;
  colorScheme: AppColorScheme;
  setColorScheme: (scheme: AppColorScheme) => void;
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
  const { colorScheme, setColorScheme } = useThemeContext();
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
        if (isAppThemeId(stored)) setThemeId(stored);
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
      theme: themeForMode(
        APP_THEMES.find((item) => item.id === themeId) ?? APP_THEMES[0],
        colorScheme,
      ),
      colorScheme,
      setColorScheme,
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
      colorScheme,
      customization,
      mascotMoment,
      ready,
      resetCustomization,
      setMascotMoment,
      setColorScheme,
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
