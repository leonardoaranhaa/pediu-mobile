export async function logoutSession(actions: {
  clearToken: () => Promise<void>;
  clearCache: () => void;
  goToLogin: () => void;
  tellServer: () => Promise<void>;
}) {
  await actions.clearToken();
  actions.clearCache();
  actions.goToLogin();
  void Promise.race([
    actions.tellServer().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 4_000)),
  ]);
}
