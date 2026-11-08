export type SignupRole = "customer" | "merchant" | "courier";

export type AccountAction =
  | "cart"
  | "checkout"
  | "orders"
  | "favorite"
  | "seller"
  | "courier"
  | "profile"
  | "account";

const ACCOUNT_ACTIONS = new Set<AccountAction>([
  "cart",
  "checkout",
  "orders",
  "favorite",
  "seller",
  "courier",
  "profile",
  "account",
]);

export function needsAccount(action: string): boolean {
  return ACCOUNT_ACTIONS.has(action as AccountAction);
}

export function signupSteps(role: SignupRole): Array<"role" | "account" | "store" | "vehicle" | "pending"> {
  if (role === "merchant") return ["role", "account", "store"];
  if (role === "courier") return ["role", "account", "vehicle", "pending"];
  return ["role", "account"];
}

export function accountFields(role: SignupRole): Array<"name" | "email" | "phone" | "password"> {
  if (role === "customer") return ["name", "email", "phone", "password"];
  return ["name", "email", "phone", "password"];
}

/** After the welcome slides, a visitor lands in the store catalog. */
export function routeAfterWelcome(): "/(tabs)" {
  return "/(tabs)";
}

export type AuthIntent = {
  action: AccountAction;
  role?: SignupRole;
  returnTo?: string;
};

let intent: AuthIntent | null = null;

export function setAuthIntent(next: AuthIntent) {
  intent = next;
}

export function peekAuthIntent(): AuthIntent | null {
  return intent;
}

export function clearAuthIntent() {
  intent = null;
}

export function takeAuthReturn(): string {
  const href = intent?.returnTo || "/(tabs)";
  intent = null;
  return href;
}
