import { describe, expect, it } from "vitest";
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
      ["expo-location", {}] as [string, unknown],
      ["expo-notifications", {}] as [string, unknown],
    ],
  },
  packageJson: {
    dependencies: {
      "expo-linking": "1",
      "expo-location": "1",
      "expo-notifications": "1",
      "expo-secure-store": "1",
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
    PIX_API_URL: "https://pix.example.com",
    PIX_API_KEY: "pix-key",
    PAYMENT_WEBHOOK_SECRET: "webhook-secret",
  },
};

describe("go-live device preflight", () => {
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
