// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const rawBundleId = "space.manus.pediu.mobile";
const bundleId = rawBundleId
  .replace(/[-_]/g, ".")
  .replace(/[^a-zA-Z0-9.]/g, "")
  .replace(/\.+/g, ".")
  .replace(/^\.+|\.+$/g, "")
  .toLowerCase();
import { PEDIU_OAUTH_SCHEME } from "./constants/oauth-scheme";

const timestamp = "pediu";

const config: ExpoConfig = {
  name: "Pediu",
  slug: "pediu-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: PEDIU_OAUTH_SCHEME,
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: { supportsTablet: true, bundleIdentifier: bundleId, infoPlist: { ITSAppUsesNonExemptEncryption: false } },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FF5A4F",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: PEDIU_OAUTH_SCHEME, host: "*" }], category: ["BROWSABLE", "DEFAULT"] }],
  },
  web: { bundler: "metro", output: "static", favicon: "./assets/images/favicon.png" },
  plugins: [
    "expo-router",
    ["expo-audio", { microphonePermission: "Permita que o Pediu use seu microfone para fazer pedidos por voz." }],
    ["expo-location", { locationWhenInUsePermission: "Permita que o Pediu use sua localização para encontrar lojas e acompanhar entregas." }],
    ["expo-notifications", { color: "#FF5A4F" }],
    ["expo-video", { supportsBackgroundPlayback: true, supportsPictureInPicture: true }],
    ["expo-splash-screen", { image: "./assets/images/splash-icon.png", imageWidth: 200, resizeMode: "contain", backgroundColor: "#FFF8F1" }],
    ["expo-build-properties", { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24 } }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
