import { describe, expect, it } from "vitest";
import { assertProductionApiBaseUrl } from "../scripts/production-build-config.js";
import {
  buildDevicePreflightReport,
  summarizeDevicePreflight,
} from "../scripts/device-preflight";

const baseInput = {
  appConfig: {
    name: "Pediu",
    version: "1.0.0",
    scheme: "pediupediu",
    ios: { bundleIdentifier: "space.manus.pediu.mobile" },
    android: {
      package: "space.manus.pediu.mobile",
      permissions: ["POST_NOTIFICATIONS"],
    },
    plugins: [
      "expo-router",
      "expo-asset",
      ["expo-audio", {}] as [string, unknown],
      ["expo-location", {}] as [string, unknown],
      ["expo-notifications", {}] as [string, unknown],
      "expo-font",
      ["expo-video", {}] as [string, unknown],
      "expo-web-browser",
      ["expo-splash-screen", {}] as [string, unknown],
      ["expo-build-properties", {}] as [string, unknown],
    ],
  },
  packageJson: {
    dependencies: {
      "expo-linking": "1",
      "expo-location": "1",
      "expo-notifications": "1",
      "expo-secure-store": "1",
      "expo-asset": "1",
      "expo-audio": "1",
      "expo-font": "1",
      "expo-video": "1",
      "expo-web-browser": "1",
    },
  },
  easConfig: {
    build: { preview: {}, production: {} },
  },
  env: {
    EXPO_PUBLIC_API_BASE_URL: "https://api.example.com",
    EXPO_PUBLIC_APP_ID: "pediu-app",
    VITE_APP_ID: "pediu-app",
    EXPO_PUBLIC_OAUTH_PORTAL_URL: "https://oauth.example.com",
    EXPO_PUBLIC_OAUTH_SERVER_URL: "https://oauth.example.com",
    OAUTH_SERVER_URL: "https://oauth.example.com",
    BUILT_IN_FORGE_API_URL: "https://forge.example.com",
    BUILT_IN_FORGE_API_KEY: "forge-key",
    PIX_PROVIDER: "mercado_pago",
    MERCADO_PAGO_ACCESS_TOKEN: "mp-access-secret",
    MERCADO_PAGO_NOTIFICATION_URL:
      "https://api.example.com/api/webhooks/payments",
    MERCADO_PAGO_WEBHOOK_SECRET: "webhook-secret",
  },
};

describe("go-live device preflight", () => {
  it("blocks EAS production builds without a public HTTPS API endpoint", () => {
    expect(() =>
      assertProductionApiBaseUrl({ EAS_BUILD_PROFILE: "production" }),
    ).toThrow("EXPO_PUBLIC_API_BASE_URL must be configured");
    expect(() =>
      assertProductionApiBaseUrl({
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000",
      }),
    ).toThrow("EXPO_PUBLIC_API_BASE_URL must be configured");
  });

  it("allows a configured public HTTPS endpoint and leaves non-production builds alone", () => {
    expect(() =>
      assertProductionApiBaseUrl({
        EAS_BUILD_PROFILE: "production",
        EXPO_PUBLIC_API_BASE_URL: "https://api.example.com",
      }),
    ).not.toThrow();
    expect(() => assertProductionApiBaseUrl({})).not.toThrow();
  });

  it("passes native identity, dependencies, EAS profiles and public API", () => {
    const checks = buildDevicePreflightReport(baseInput);

    expect(checks.find((check) => check.id === "native-identity")?.status).toBe(
      "PASS",
    );
    expect(checks.find((check) => check.id === "native-packages")?.status).toBe(
      "PASS",
    );
    expect(checks.find((check) => check.id === "eas-profiles")?.status).toBe(
      "PASS",
    );
    expect(checks.find((check) => check.id === "device-api-url")?.status).toBe(
      "PASS",
    );
  });

  it("does not mark PIX ready for a provider other than Mercado Pago", () => {
    const checks = buildDevicePreflightReport({
      ...baseInput,
      env: { ...baseInput.env, PIX_PROVIDER: "other-provider" },
    });

    expect(checks.find((check) => check.id === "pix")).toMatchObject({
      status: "NOT_CONFIGURED",
    });
  });

  it("blocks a localhost API because physical devices cannot reach it", () => {
    const checks = buildDevicePreflightReport({
      ...baseInput,
      env: {
        ...baseInput.env,
        EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000",
      },
    });

    expect(checks.find((check) => check.id === "device-api-url")?.status).toBe(
      "BLOCKED",
    );
    expect(summarizeDevicePreflight(checks).BLOCKED).toBeGreaterThan(0);
  });

  it("blocks an app ID mismatch instead of silently shipping an unusable session", () => {
    const checks = buildDevicePreflightReport({
      ...baseInput,
      env: { ...baseInput.env, EXPO_PUBLIC_APP_ID: "different-app" },
    });

    expect(
      checks.find((check) => check.id === "app-id-alignment")?.status,
    ).toBe("BLOCKED");
  });

  it("blocks a native bundle without expo-asset required by expo-audio", () => {
    const dependencies = Object.fromEntries(
      Object.entries(baseInput.packageJson.dependencies).filter(
        ([name]) => name !== "expo-asset",
      ),
    );
    const checks = buildDevicePreflightReport({
      ...baseInput,
      packageJson: { dependencies },
    });

    expect(checks.find((check) => check.id === "native-packages")?.status).toBe(
      "BLOCKED",
    );
  });

  it("keeps physical evidence external and does not fake a device pass", () => {
    const checks = buildDevicePreflightReport({
      ...baseInput,
      env: {},
    });

    expect(
      checks.find((check) => check.id === "physical-evidence")?.status,
    ).toBe("NOT_CONFIGURED");
    expect(summarizeDevicePreflight(checks).NOT_CONFIGURED).toBeGreaterThan(0);
  });
});
