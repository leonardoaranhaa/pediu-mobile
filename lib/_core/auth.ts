import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role?: "user" | "merchant" | "courier" | "admin";
  themePreference?: "classic" | "ocean" | "sunset";
  lastSignedIn: Date;
};

type UserInfoListener = (user: User | null) => void;
const userInfoListeners = new Set<UserInfoListener>();

function notifyUserInfoListeners(user: User | null) {
  userInfoListeners.forEach((listener) => {
    try {
      listener(user);
    } catch {
      // UI listeners are best-effort and must not affect authentication.
    }
  });
}

export function subscribeUserInfo(listener: UserInfoListener): () => void {
  userInfoListeners.add(listener);
  return () => userInfoListeners.delete(listener);
}

export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } catch {
    throw new Error("Não foi possível armazenar a sessão com segurança");
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch {
    // Logout remains best-effort when secure storage is unavailable.
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    const info = Platform.OS === "web"
      ? window.localStorage.getItem(USER_INFO_KEY)
      : await SecureStore.getItemAsync(USER_INFO_KEY);
    if (!info) return null;
    return JSON.parse(info) as User;
  } catch {
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    const value = JSON.stringify(user);
    if (Platform.OS === "web") {
      window.localStorage.setItem(USER_INFO_KEY, value);
    } else {
      await SecureStore.setItemAsync(USER_INFO_KEY, value);
    }
  } catch {
    // Cached identity is optional and never replaces server authorization.
  }
  notifyUserInfoListeners(user);
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") window.localStorage.removeItem(USER_INFO_KEY);
    else await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch {
    // Clearing local identity is best-effort.
  }
  notifyUserInfoListeners(null);
}
