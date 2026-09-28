function isPublicDeviceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return (
      !["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname) &&
      !hostname.startsWith("169.254.")
    );
  } catch {
    return false;
  }
}

function assertProductionApiBaseUrl(env) {
  if (env.EAS_BUILD_PROFILE !== "production") return;
  const apiBaseUrl = env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!apiBaseUrl || !isPublicDeviceUrl(apiBaseUrl)) {
    throw new Error(
      "Production build blocked: EXPO_PUBLIC_API_BASE_URL must be configured as a public HTTPS endpoint.",
    );
  }
}

module.exports = { assertProductionApiBaseUrl, isPublicDeviceUrl };
