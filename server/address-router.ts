import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { customerAddresses } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

const addressInput = z.object({
  label: z.string().trim().min(1).max(40), recipientName: z.string().trim().min(1).max(160),
  street: z.string().trim().min(1).max(180), number: z.string().trim().min(1).max(30),
  complement: z.string().trim().max(120).optional(), neighborhood: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100), state: z.string().trim().regex(/^[A-Za-z]{2}$/), postalCode: z.string().regex(/^\d{5}-?\d{3}$/),
  latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), isDefault: z.boolean().optional(),
});

export const addressRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); return db.select().from(customerAddresses).where(eq(customerAddresses.userId, ctx.user.id)); }),
  create: protectedProcedure.input(addressInput).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("Database unavailable");
    if (input.isDefault) await db.update(customerAddresses).set({ isDefault: 0 }).where(eq(customerAddresses.userId, ctx.user.id));
    const result = await db.insert(customerAddresses).values({ ...input, userId: ctx.user.id, state: input.state.toUpperCase(), postalCode: input.postalCode.replace(/\D/g, ""), isDefault: input.isDefault ? 1 : 0, latitude: input.latitude?.toString(), longitude: input.longitude?.toString() });
    return Number((result as unknown as { insertId: number | string }).insertId);
  }),
  setDefault: protectedProcedure.input(z.object({ addressId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("Database unavailable");
    const owned = await db.select({ id: customerAddresses.id }).from(customerAddresses).where(and(eq(customerAddresses.id, input.addressId), eq(customerAddresses.userId, ctx.user.id))).limit(1);
    if (!owned[0]) throw new Error("Endereço não encontrado");
    await db.update(customerAddresses).set({ isDefault: 0 }).where(eq(customerAddresses.userId, ctx.user.id));
    await db.update(customerAddresses).set({ isDefault: 1 }).where(eq(customerAddresses.id, input.addressId));
    return { success: true };
  }),
  remove: protectedProcedure.input(z.object({ addressId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("Database unavailable");
    const result = await db.delete(customerAddresses).where(and(eq(customerAddresses.id, input.addressId), eq(customerAddresses.userId, ctx.user.id)));
    return { success: Number((result as unknown as { affectedRows?: number }).affectedRows ?? 0) > 0 };
  }),
});
