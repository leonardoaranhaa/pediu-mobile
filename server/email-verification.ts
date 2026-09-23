import crypto from "node:crypto";
import type { Express } from "express";
import * as db from "./db";

export function hashEmailToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function sendEmailVerification(input: { email: string; token: string }) {
  const endpoint = process.env.EMAIL_WEBHOOK_URL?.trim();
  if (!endpoint) return false;
  const baseUrl = process.env.EMAIL_VERIFICATION_BASE_URL?.trim();
  if (!baseUrl) return false;
  const verificationUrl = new URL("/api/auth/verify-email", baseUrl);
  verificationUrl.searchParams.set("token", input.token);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EMAIL_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_SECRET}` } : {}),
    },
    body: JSON.stringify({ to: input.email, subject: "Confirme seu e-mail no Pediu", verificationUrl: verificationUrl.toString() }),
  });
  return response.ok;
}

export function registerEmailVerificationRoutes(app: Express) {
  app.get("/api/auth/verify-email", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!/^[a-f0-9]{32,128}$/i.test(token)) {
      res.status(400).send("Token de verificação inválido.");
      return;
    }
    try {
      const confirmed = await db.confirmEmailVerification(hashEmailToken(token));
      res.status(confirmed ? 200 : 410).send(confirmed ? "E-mail confirmado. Você já pode voltar ao aplicativo." : "Token expirado ou já utilizado.");
    } catch {
      res.status(503).send("Não foi possível confirmar o e-mail agora.");
    }
  });
}
