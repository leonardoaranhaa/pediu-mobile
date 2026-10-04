// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";
import { assertProductionApiBaseUrl } from "./scripts/production-build-config.js";

assertProductionApiBaseUrl(process.env);

// Expo evaluates app.config.ts through a CommonJS loader that cannot resolve
// extensionless imports of TypeScript files. Keep this build-time value local;
// the runtime OAuth client uses the shared constant in constants/oauth-scheme.ts.
const PEDIU_OAUTH_SCHEME = "pediupediu";

if (process.env.EAS_BUILD_PROFILE === "production") {
  if (!process.env.EXPO_PUBLIC_API_BASE_URL?.trim()) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required for the production store build");
  }
  if (process.env.EXPO_PUBLIC_DEV_AUTH === "true") {
    throw new Error("EXPO_PUBLIC_DEV_AUTH must not be set for the production store build");
  }
}

const rawBundleId = process.env.EXPO_PUBLIC_BUNDLE_ID?.trim() || "app.pediu.mobile";
const bundleId = rawBundleId
  .replace(/[-_]/g, ".")
  .replace(/[^a-zA-Z0-9.]/g, "")
  .replace(/\.+/g, ".")
  .replace(/^\.+|\.+$/g, "")
  .toLowerCase();
const config: ExpoConfig = {
  name: "Pediu",
  slug: "pediu-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: PEDIU_OAUTH_SCHEME,
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    usesAppleSignIn: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E20D2A",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: PEDIU_OAUTH_SCHEME, host: "*" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-apple-authentication",
    "expo-asset",
    [
      "expo-audio",
      {
        microphonePermission:
          "Permita que o Pediu use seu microfone para fazer pedidos por voz.",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Permita que o Pediu use sua localização para encontrar lojas e acompanhar entregas.",
      },
    ],
    ["expo-notifications", { color: "#E20D2A" }],
    "expo-font",
    [
      "expo-video",
      { supportsBackgroundPlayback: true, supportsPictureInPicture: true },
    ],
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#FFF4E8",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
    privacyPolicyPath: "/legal/privacy",
    termsPath: "/legal/terms",
  },
};

export default config;
