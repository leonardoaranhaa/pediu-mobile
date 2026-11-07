import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminEmail } from "../server/_core/env";
import { isPublicPasswordAuth } from "../server/_core/security";
import {
  LOGIN_ERROR,
  RESET_EMAIL_MESSAGE,
  RESET_SUPPORT_MESSAGE,
  SIGNUP_ERROR,
  deliverPasswordReset,
  hashPassword,
  normalizeEmail,
  normalizePhone,
  requestPasswordReset,
  verifyPassword,
} from "../server/password-auth";
import { ONE_YEAR_MS, SESSION_TTL_MS } from "../shared/const";

describe("password auth", () => {
  const previousAdminEmails = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (previousAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousAdminEmails;
  });

  it("normalizes e-mail before it is stored", () => {
    expect(normalizeEmail("  Ana@Exemplo.COM ")).toBe("ana@exemplo.com");
  });

  it("hashes and checks a password with bcrypt", async () => {
    const hash = await hashPassword("senha-segura-1");
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPassword("senha-segura-1", hash)).toBe(true);
    expect(await verifyPassword("outra-senha", hash)).toBe(false);
  });

  it("keeps the mobile session at 30 days instead of one year", () => {
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(SESSION_TTL_MS).toBeLessThan(ONE_YEAR_MS);
  });

  it("reads admin e-mails from a comma-separated list", () => {
    process.env.ADMIN_EMAILS = " Dono@Pediu.com , outro@pediu.com ";
    expect(isAdminEmail("dono@pediu.com")).toBe(true);
    expect(isAdminEmail("OUTRO@pediu.com")).toBe(true);
    expect(isAdminEmail("cliente@pediu.com")).toBe(false);
  });

  it("uses a generic message when login or signup fails", () => {
    expect(LOGIN_ERROR).toBe("E-mail ou senha não conferem.");
    expect(SIGNUP_ERROR).not.toMatch(/já existe|duplicad/i);
  });

  it("does not claim an email was sent when mail delivery is off", async () => {
    const previous = process.env.EMAIL_WEBHOOK_URL;
    delete process.env.EMAIL_WEBHOOK_URL;
    try {
      const result = await requestPasswordReset("pessoa@exemplo.com");
      expect(result).toEqual({ message: RESET_SUPPORT_MESSAGE });
      expect(result).not.toHaveProperty("code");
      expect(result.message).not.toMatch(/enviamos|enviado/i);
    } finally {
      if (previous === undefined) delete process.env.EMAIL_WEBHOOK_URL;
      else process.env.EMAIL_WEBHOOK_URL = previous;
    }
  });

  it("burns a reset code when the mail channel fails and never returns the code", async () => {
    const issue = vi.fn(async () => ({ code: "12345678" }));
    const send = vi.fn(async () => false);
    const voidCodes = vi.fn(async () => undefined);
    const result = await deliverPasswordReset({
      channelConfigured: true,
      user: { id: 4, email: "pessoa@exemplo.com" },
      issue,
      send,
      voidCodes,
    });
    expect(send).toHaveBeenCalledWith("12345678");
    expect(voidCodes).toHaveBeenCalledOnce();
    expect(result).toEqual({ message: RESET_EMAIL_MESSAGE });
    expect(JSON.stringify(result)).not.toContain("12345678");
  });

  it("allows the password request from the mobile app without an Origin header", () => {
    expect(
      isPublicPasswordAuth({
        originalUrl: "/api/trpc/auth.requestPasswordReset",
        baseUrl: "/api/trpc",
        path: "/auth.requestPasswordReset",
        url: "/auth.requestPasswordReset",
      }),
    ).toBe(true);
  });

  it("allows mobile signup without an Origin header", () => {
    const req = {
      originalUrl: "/api/trpc/auth.login?batch=1",
      baseUrl: "/api/trpc",
      path: "/auth.login",
      url: "/auth.login?batch=1",
    };
    expect(isPublicPasswordAuth(req)).toBe(true);
    expect(
      isPublicPasswordAuth({
        ...req,
        originalUrl: "/api/trpc/auth.logout",
        path: "/auth.logout",
        url: "/auth.logout",
      }),
    ).toBe(false);
  });

  it("accepts a blank phone and rejects one that is too short", () => {
    expect(normalizePhone("  ")).toBeNull();
    expect(normalizePhone("(11) 98888-7777")).toBe("(11) 98888-7777");
    expect(() => normalizePhone("123")).toThrow(/Telefone/);
  });
});
