export const ONBOARDING_STORAGE_KEY = "pediu:onboarding-complete";
export const ONBOARDING_COMPLETE_VALUE = "1";

const EXEMPT_PATHS = new Set([
  "/onboarding",
  "/oauth/callback",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/mfa",
]);

export function hasCompletedOnboarding(value: string | null | undefined): boolean {
  return value === ONBOARDING_COMPLETE_VALUE;
}

export function isOnboardingExemptPath(pathname: string): boolean {
  return EXEMPT_PATHS.has(pathname);
}

export function shouldRedirectToOnboarding({
  hydrated,
  completed,
  pathname,
}: {
  hydrated: boolean;
  completed: boolean;
  pathname: string;
}): boolean {
  return hydrated && !completed && !isOnboardingExemptPath(pathname);
}
