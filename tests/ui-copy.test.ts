import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(`${root}/${relativePath}`, "utf8");
}

describe("Pediu user-facing UI copy", () => {
  it("does not ship the developer theme laboratory route", () => {
    expect(existsSync(`${root}/app/dev/theme-lab.tsx`)).toBe(false);
  });

  it("keeps operational screens free of template and implementation guidance", () => {
    const files = [
      "app/admin/index.tsx",
      "app/admin/payments.tsx",
      "app/auth/mfa.tsx",
      "app/login.tsx",
      "app/seller/ads.tsx",
    ];
    const content = files.map(source).join("\n").toLowerCase();
    for (const phrase of [
      "master management",
      "global theme",
      "nativewind",
      "mesmo backend trpc",
      "política futura",
      "em breve você poderá contratar",
      "o servidor não valida códigos",
      "o provedor de autenticação ainda não foi configurado",
    ]) {
      expect(content).not.toContain(phrase);
    }
  });

  it("lets a waiting courier refresh approval without English labels", () => {
    const couriers = source("app/courier/index.tsx");
    const forgot = source("app/forgot-password.tsx");
    expect(couriers).toContain("Atualizar situação");
    expect(couriers).toContain("A aprovação não é automática");
    expect(couriers).not.toContain("approved ? 15_000 : false");
    expect(forgot).toContain("Pedir código");
    expect(forgot).not.toMatch(/enviamos um e-mail/i);
  });

  it("opens courier approval from the admin home in Portuguese", () => {
    const home = source("app/admin/index.tsx");
    const couriers = source("app/admin/couriers.tsx");
    expect(home).toContain('title="Entregadores"');
    expect(home).toContain('"/admin/couriers"');
    expect(home).toContain("em análise");
    expect(couriers).toContain("Aprovar");
    expect(couriers).toContain("Rejeitar");
    expect(couriers).toContain("couriers.refetch()");
    expect(couriers).not.toContain("Approve");
    expect(couriers).not.toContain("Reject");
  });

  it("keeps the account flow free of developer wording", () => {
    const files = [
      "app/login.tsx",
      "app/register.tsx",
      "app/onboarding.tsx",
      "app/club.tsx",
      "app/flash.tsx",
      "app/taste.tsx",
      "app/account/settings.tsx",
      "app/account/profile.tsx",
      "components/profile-home.tsx",
      "components/auth-prompt.tsx",
    ];
    const content = files.map(source).join("\n").toLowerCase();
    for (const phrase of [
      "a senha fica",
      "mascote ativo",
      "pediu 2.0",
      "servidor",
      "query canônica",
      "ledger",
      "sincroniz",
      "modal de entrega",
    ]) {
      expect(content, phrase).not.toContain(phrase);
    }
  });
});
