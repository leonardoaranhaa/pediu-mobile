export const ACCOUNT_ROLES = ["customer", "merchant", "courier", "admin"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export function rolesFromLegacy(legacyRole?: string | null): AccountRole[] {
  const roles = new Set<AccountRole>(["customer"]);
  if (legacyRole === "merchant") roles.add("merchant");
  if (legacyRole === "courier") roles.add("courier");
  if (legacyRole === "admin") roles.add("admin");
  return [...roles];
}

export function mergeAccountRoles(
  stored: readonly string[],
  legacyRole?: string | null,
): AccountRole[] {
  const roles = new Set<AccountRole>(rolesFromLegacy(legacyRole));
  for (const role of stored) {
    if ((ACCOUNT_ROLES as readonly string[]).includes(role)) {
      roles.add(role as AccountRole);
    }
  }
  roles.add("customer");
  return ACCOUNT_ROLES.filter((role) => roles.has(role));
}
