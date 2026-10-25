export const ACCOUNT_ROLES = ["customer", "merchant", "courier", "admin"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

/** A store or courier profile created in this window belongs to the signup itself. */
export const SIGNUP_ROLE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function rolesFromLegacy(legacyRole?: string | null): AccountRole[] {
  if (legacyRole === "merchant") return ["merchant"];
  if (legacyRole === "courier") return ["courier"];
  if (legacyRole === "admin") return ["admin"];
  return ["customer"];
}

export function legacyRoleFromAccount(role: AccountRole): "user" | "merchant" | "courier" | "admin" {
  if (role === "merchant") return "merchant";
  if (role === "courier") return "courier";
  if (role === "admin") return "admin";
  return "user";
}

function inSignupWindow(userCreatedAt: Date, profileCreatedAt: Date) {
  const delta = profileCreatedAt.getTime() - userCreatedAt.getTime();
  return delta >= -60_000 && delta <= SIGNUP_ROLE_WINDOW_MS;
}

/**
 * One account keeps the role chosen at signup.
 * Customer was added automatically beside loja and motoboy, so it does not
 * win when the store or the courier profile was part of that signup.
 * Admin accounts are left untouched by the caller.
 */
export function resolveOriginalRole(input: {
  legacyRole?: string | null;
  usesCustomerApp?: number | null;
  userCreatedAt?: Date | null;
  storeCreatedAt?: Date | null;
  courierCreatedAt?: Date | null;
}): AccountRole {
  const userCreatedAt = input.userCreatedAt ?? null;
  const storeAt = input.storeCreatedAt ?? null;
  const courierAt = input.courierCreatedAt ?? null;
  const storeInSignup = Boolean(
    userCreatedAt && storeAt && inSignupWindow(userCreatedAt, storeAt),
  );
  const courierInSignup = Boolean(
    userCreatedAt && courierAt && inSignupWindow(userCreatedAt, courierAt),
  );

  if (storeInSignup && courierInSignup && storeAt && courierAt) {
    return storeAt.getTime() <= courierAt.getTime() ? "merchant" : "courier";
  }
  if (storeInSignup) return "merchant";
  if (courierInSignup) return "courier";

  if (input.usesCustomerApp !== 1 && storeAt && (!courierAt || storeAt.getTime() <= courierAt.getTime())) {
    return "merchant";
  }
  if (input.usesCustomerApp !== 1 && courierAt) return "courier";
  if (input.legacyRole === "merchant" && storeAt) return "merchant";
  if (input.legacyRole === "courier" && courierAt) return "courier";
  return "customer";
}

export function roleProfileRefusal(
  roles: readonly string[],
  next: "merchant" | "courier",
  isAdmin = false,
): string | null {
  if (isAdmin || roles.includes("admin")) return null;
  if (roles.includes(next)) return null;
  if (next === "merchant") {
    return "Esta conta não é de loja. Para vender, crie uma conta de lojista.";
  }
  return "Esta conta não é de motoboy. Para entregar, crie uma conta de motoboy.";
}
