import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { logoutSession } from "@/lib/logout-session";
import { signedInUserChanged } from "@/lib/auth-refresh";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";

type AuthValue = {
  user: Auth.User | null;
  nameConfirmed: boolean;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Auth.User | null>(null);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUser = await Api.getMe();
      if (apiUser) {
        const userInfo: Auth.User = {
          id: apiUser.id,
          openId: apiUser.openId,
          name: apiUser.name,
          email: apiUser.email,
          loginMethod: apiUser.loginMethod,
          role: apiUser.role,
          roles: apiUser.roles,
          usesCustomerApp: apiUser.usesCustomerApp,
          themePreference: apiUser.themePreference,
          lastSignedIn: new Date(apiUser.lastSignedIn),
        };
        setUser(userInfo);
        setNameConfirmed(true);
        await Auth.setUserInfo(userInfo);
        return;
      }
      if (Platform.OS !== "web") {
        const sessionToken = await Auth.getSessionToken();
        if (!sessionToken) {
          setUser(null);
          return;
        }
        const cachedUser = await Auth.getUserInfo();
        if (cachedUser) {
          const unnamed = { ...cachedUser, name: null };
          setUser(unnamed);
          await Auth.setUserInfo(unnamed);
        } else {
          setUser(null);
        }
        setNameConfirmed(false);
        return;
      }
      setUser(null);
      await Auth.clearUserInfo();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Não foi possível entrar agora."));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setNameConfirmed(false);
    setError(null);
    setLoading(false);
    await logoutSession({
      clearToken: async () => {
        await Auth.removeSessionToken();
        await Auth.clearUserInfo();
      },
      clearCache: () => queryClient.clear(),
      goToLogin: () => router.replace("/login"),
      tellServer: () => Api.logout(),
    });
  }, [queryClient]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  // After a sign-in or an account switch, data fetched for the visitor or the
  // previous account (coupons on offer, orders, addresses) is fetched again.
  const settledUserId = useRef<number | null | undefined>(undefined);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (loading) return;
    const changed = signedInUserChanged(settledUserId.current, userId);
    settledUserId.current = userId;
    if (changed) void queryClient.invalidateQueries();
  }, [loading, queryClient, userId]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      nameConfirmed,
      loading,
      error,
      isAuthenticated: Boolean(user),
      refresh: fetchUser,
      logout,
    }),
    [error, fetchUser, loading, logout, nameConfirmed, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("A conta ainda não está pronta.");
  }
  return value;
}
