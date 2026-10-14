import { describe, expect, it } from "vitest";
import {
  hasCompletedOnboarding,
  isOnboardingExemptPath,
  shouldRedirectToOnboarding,
} from "../lib/onboarding-gate";

describe("onboarding first-access gate", () => {
  it("recognizes only the persisted completion marker", () => {
    expect(hasCompletedOnboarding("1")).toBe(true);
    expect(hasCompletedOnboarding(null)).toBe(false);
    expect(hasCompletedOnboarding("0")).toBe(false);
    expect(hasCompletedOnboarding("true")).toBe(false);
  });

  it("keeps onboarding, OAuth and authentication routes accessible", () => {
    expect(isOnboardingExemptPath("/onboarding")).toBe(true);
    expect(isOnboardingExemptPath("/oauth/callback")).toBe(true);
    expect(isOnboardingExemptPath("/login")).toBe(true);
    expect(isOnboardingExemptPath("/register")).toBe(true);
    expect(isOnboardingExemptPath("/forgot-password")).toBe(true);
    expect(isOnboardingExemptPath("/auth/mfa")).toBe(true);
    expect(isOnboardingExemptPath("/(tabs)")).toBe(false);
  });

  it("redirects only after hydration for an incomplete user", () => {
    expect(
      shouldRedirectToOnboarding({ hydrated: false, completed: false, pathname: "/login" }),
    ).toBe(false);
    expect(
      shouldRedirectToOnboarding({ hydrated: true, completed: true, pathname: "/login" }),
    ).toBe(false);
    expect(
      shouldRedirectToOnboarding({ hydrated: true, completed: false, pathname: "/onboarding" }),
    ).toBe(false);
    expect(
      shouldRedirectToOnboarding({ hydrated: true, completed: false, pathname: "/login" }),
    ).toBe(false);
    expect(
      shouldRedirectToOnboarding({ hydrated: true, completed: false, pathname: "/market" }),
    ).toBe(true);
  });
});
