import { isPublicDeviceUrl } from "./production-build-config.js";

export type DevicePreflightStatus = "PASS" | "BLOCKED" | "NOT_CONFIGURED";

export type DevicePreflightCheck = {
  id: string;
  status: DevicePreflightStatus;
  message: string;
};

export type DevicePreflightInput = {
  appConfig: {
    name?: string;
    version?: string;
    scheme?: string | string[];
    ios?: { bundleIdentifier?: string };
    android?: { package?: string; permissions?: string[] };
    plugins?: Array<string | unknown[]>;
  };
  packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  easConfig: {
    build?: Record<string, unknown>;
  } | null;
  env: Record<string, string | undefined>;
};

const requiredNativePackages = [
  "expo-linking",
  "expo-location",
  "expo-notifications",
  "expo-secure-store",
  "expo-asset",
  "expo-audio",
  "expo-font",
  "expo-video",
  "expo-web-browser",
];

const requiredPlugins = [
  "expo-router",
  "expo-asset",
  "expo-audio",
  "expo-location",
  "expo-notifications",
  "expo-font",
  "expo-video",
  "expo-web-browser",
  "expo-splash-screen",
  "expo-build-properties",
];

function pluginName(plugin: string | unknown[]): string {
  return typeof plugin === "string"
    ? plugin
    : typeof plugin[0] === "string"
      ? plugin[0]
      : "";
}

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function externalCheck(
  id: string,
  label: string,
  env: Record<string, string | undefined>,
  keys: string[],
): DevicePreflightCheck {
  const missing = keys.filter((key) => !configured(env[key]));
  return missing.length === 0
    ? { id, status: "PASS", message: `${label} configurado estruturalmente` }
    : {
        id,
        status: "NOT_CONFIGURED",
        message: `${label} depende de configuração externa (${missing.join(", ")})`,
      };
}

export function buildDevicePreflightReport(
  input: DevicePreflightInput,
): DevicePreflightCheck[] {
  const { appConfig, packageJson, easConfig, env } = input;
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
  const plugins = new Set((appConfig.plugins ?? []).map(pluginName));
  const checks: DevicePreflightCheck[] = [];

  const nativeIdentityValid = Boolean(
    appConfig.name === "Pediu" &&
    appConfig.version &&
    (appConfig.scheme === "pediupediu" ||
      appConfig.scheme?.includes("pediupediu")) &&
    appConfig.ios?.bundleIdentifier &&
    appConfig.android?.package,
  );
  checks.push({
    id: "native-identity",
    status: nativeIdentityValid ? "PASS" : "BLOCKED",
    message: nativeIdentityValid
      ? "Nome, versão, scheme e IDs nativos estão definidos"
      : "Nome, versão, scheme, bundle ID iOS ou package Android ausente",
  });

  const missingPackages = requiredNativePackages.filter(
    (name) => !dependencies[name],
  );
  checks.push({
    id: "native-packages",
    status: missingPackages.length === 0 ? "PASS" : "BLOCKED",
    message:
      missingPackages.length === 0
        ? "Dependências nativas de localização, push, linking e sessão presentes"
        : `Dependências nativas ausentes: ${missingPackages.join(", ")}`,
  });

  const missingPlugins = requiredPlugins.filter((name) => !plugins.has(name));
  checks.push({
    id: "native-plugins",
    status: missingPlugins.length === 0 ? "PASS" : "BLOCKED",
    message:
      missingPlugins.length === 0
        ? "Plugins Expo de router, localização e notificações declarados"
        : `Plugins Expo ausentes: ${missingPlugins.join(", ")}`,
  });

  const apiBaseUrl = env.EXPO_PUBLIC_API_BASE_URL?.trim();
  checks.push({
    id: "device-api-url",
    status: !apiBaseUrl
      ? "NOT_CONFIGURED"
      : isPublicDeviceUrl(apiBaseUrl)
        ? "PASS"
        : "BLOCKED",
    message: !apiBaseUrl
      ? "EXPO_PUBLIC_API_BASE_URL não configurada"
      : isPublicDeviceUrl(apiBaseUrl)
        ? "API do bundle aponta para HTTPS público"
        : "API do bundle não é um endpoint HTTPS público alcançável por dispositivo",
  });

  const appId = env.EXPO_PUBLIC_APP_ID?.trim();
  checks.push({
    id: "app-id-alignment",
    status: !appId
      ? "NOT_CONFIGURED"
      : appId === env.VITE_APP_ID?.trim()
        ? "PASS"
        : "BLOCKED",
    message: !appId
      ? "EXPO_PUBLIC_APP_ID não configurado"
      : appId === env.VITE_APP_ID?.trim()
        ? "App ID público coincide com o ID do backend"
        : "EXPO_PUBLIC_APP_ID difere de VITE_APP_ID",
  });

  checks.push({
    id: "eas-profiles",
    status:
      easConfig?.build?.preview && easConfig?.build?.production
        ? "PASS"
        : "BLOCKED",
    message:
      easConfig?.build?.preview && easConfig?.build?.production
        ? "Perfis EAS preview e production declarados"
        : "Perfis EAS preview e production ausentes",
  });

  checks.push(
    externalCheck("oauth", "OAuth real", env, [
      "EXPO_PUBLIC_OAUTH_PORTAL_URL",
      "EXPO_PUBLIC_OAUTH_SERVER_URL",
      "OAUTH_SERVER_URL",
    ]),
    externalCheck("push", "Push externo", env, [
      "BUILT_IN_FORGE_API_URL",
      "BUILT_IN_FORGE_API_KEY",
    ]),
    externalCheck("storage", "Storage externo", env, [
      "BUILT_IN_FORGE_API_URL",
      "BUILT_IN_FORGE_API_KEY",
    ]),
    externalCheck("pix", "PSP/PIX", env, [
      "PIX_API_URL",
      "PIX_API_KEY",
      "PAYMENT_WEBHOOK_SECRET",
    ]),
  );

  checks.push({
    id: "physical-evidence",
    status: "NOT_CONFIGURED",
    message:
      "Nenhuma evidência de Android/iOS físico está disponível na sandbox; executar matriz manual em aparelhos reais",
  });

  return checks;
}

export function summarizeDevicePreflight(checks: DevicePreflightCheck[]) {
  return checks.reduce(
    (summary, check) => {
      summary[check.status] += 1;
      return summary;
    },
    { PASS: 0, BLOCKED: 0, NOT_CONFIGURED: 0 },
  );
}
