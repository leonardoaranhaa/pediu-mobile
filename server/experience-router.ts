import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import * as data from "./db";
import { sendPushToUser } from "./push";
import { coupons, orders, deliveryEvents, privacyConsents } from "../drizzle/schema";
import { calculateCouponDiscount } from "./domain/coupons";

async function ownedOrder(db: any, orderId: number, userId: number) {
  const rows = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.customerId, userId))).limit(1);
  return rows[0];
}

async function storeOwnedOrder(orderId: number, userId: number) {
  const order = await data.getOrderForUser(orderId, userId);
  const store = await data.getStoreForOwner(userId);
  return order && store?.id === order.storeId ? order : undefined;
}

async function participantOrder(orderId: number, userId: number) {
  const order = await data.getOrderForUser(orderId, userId);
  if (!order) return undefined;
  const store = await data.getStoreForOwner(userId);
  return { order, role: store?.id === order.storeId ? "merchant" as const : "customer" as const };
}

async function supportParticipant(ticketId: number, user: { id: number; role: "user" | "merchant" | "courier" | "admin" }) {
  const ticket = await data.getSupportTicket(ticketId);
  if (!ticket) return undefined;
  if (ticket.userId === user.id) return { ticket, role: "customer" as const };
  if (user.role === "admin") return { ticket, role: "admin" as const };
  return undefined;
}

export const experienceRouter = router({
  coupons: router({
    validate: protectedProcedure.input(z.object({ code: z.string().trim().min(1).max(40), subtotal: z.number().nonnegative() })).query(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const rows = await db.select().from(coupons).where(eq(coupons.code, input.code.toUpperCase())).limit(1);
      return calculateCouponDiscount(rows[0], input.subtotal);
    }),
  }),
  reviews: router({
    create: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), target: z.enum(["store", "product", "courier"]), productId: z.number().int().positive().optional(), rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional(), idempotencyKey: z.string().trim().min(8).max(160) })).mutation(async ({ ctx, input }) => { const order = await data.getOrderForUser(input.orderId, ctx.user.id); if (!order || order.status !== "Entregue") throw new Error("Pedido não elegível para avaliação"); const existing = await data.getOrderReviewByIdempotencyKey(input.idempotencyKey); if (existing) return { success: true as const, reviewId: existing.id, duplicate: true as const }; const created = await data.createOrderReview({ ...input, userId: ctx.user.id }); return { success: true as const, reviewId: created.id, duplicate: created.duplicate }; }),
    list: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => { if (!await data.getOrderForUser(input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); return data.listOrderReviews(input.orderId); }),
  }),
  tracking: router({
    events: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(100), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!await ownedOrder(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); return db.select().from(deliveryEvents).where(eq(deliveryEvents.orderId, input.orderId)).orderBy(desc(deliveryEvents.createdAt), desc(deliveryEvents.id)).limit(input.limit).offset(input.offset); }),
  }),
  delivery: router({
    current: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const order = await data.getOrderForUser(input.orderId, ctx.user.id);
      if (!order) throw new Error("Pedido não encontrado ou não autorizado");
      const assignment = await data.getDeliveryAssignmentByOrder(input.orderId);
      const latestLocation = await data.getLatestDeliveryLocation(input.orderId);
      return { orderId: input.orderId, status: order.status, assignment: assignment ?? null, latestLocation: latestLocation ?? null };
    }),
    assign: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), courierName: z.string().trim().min(2).max(160).optional(), courierPhone: z.string().trim().max(32).optional(), etaMinutes: z.number().int().min(1).max(240).optional() })).mutation(async ({ ctx, input }) => {
      const order = await storeOwnedOrder(input.orderId, ctx.user.id);
      if (!order) throw new Error("Pedido não encontrado ou loja não autorizada");
      if (!["Pronto", "A caminho"].includes(order.status)) throw new Error("A entrega só pode ser atribuída quando o pedido estiver pronto");
      return data.upsertDeliveryAssignment({ orderId: input.orderId, courierId: ctx.user.id, courierName: input.courierName ?? ctx.user.name?.trim() ?? "Entregador da loja", courierPhone: input.courierPhone, etaMinutes: input.etaMinutes, status: order.status === "A caminho" ? "in_transit" : "assigned" });
    }),
    offer: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), courierUserId: z.number().int().positive(), etaMinutes: z.number().int().min(1).max(240).optional(), message: z.string().trim().max(255).optional(), idempotencyKey: z.string().trim().min(8).max(160), expiresInMinutes: z.number().int().min(1).max(120).default(10) })).mutation(async ({ ctx, input }) => {
      const order = await storeOwnedOrder(input.orderId, ctx.user.id);
      if (!order || order.status !== "Pronto") throw new Error("O pedido precisa estar pronto e pertencer à sua loja");
      return data.createDeliveryOffer({ ...input, ownerId: ctx.user.id, expiresAt: new Date(Date.now() + input.expiresInMinutes * 60_000) });
    }),
    location: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), etaMinutes: z.number().int().min(0).max(240).optional(), idempotencyKey: z.string().trim().min(8).max(160) })).mutation(async ({ ctx, input }) => {
      const order = await data.getOrderForUser(input.orderId, ctx.user.id);
      if (!order) throw new Error("Pedido não encontrado ou não autorizado");
      if (!["Pronto", "A caminho"].includes(order.status)) throw new Error("A posição só pode ser atualizada durante a entrega");
      const assignment = await data.getDeliveryAssignmentByOrder(input.orderId);
      const store = await data.getStoreForOwner(ctx.user.id);
      const isStoreOwner = store?.id === order.storeId;
      const isAssignedCourier = assignment?.courierId === ctx.user.id;
      if (!assignment || (!isStoreOwner && !isAssignedCourier)) throw new Error("A entrega ainda não foi atribuída a este operador");
      if (isAssignedCourier && !isStoreOwner) {
        const profile = await data.getCourierProfileByUser(ctx.user.id);
        if (!profile || profile.status !== "approved" || !profile.locationConsentAt) throw new Error("O perfil de entregador precisa estar aprovado e com localização autorizada");
      }
      const result = await data.recordDeliveryLocation({ assignmentId: assignment.id, orderId: input.orderId, courierId: ctx.user.id, latitude: input.latitude.toFixed(7), longitude: input.longitude.toFixed(7), etaMinutes: input.etaMinutes, idempotencyKey: input.idempotencyKey });
      if (result.dispatched) { try { await sendPushToUser(order.customerId, "Entrega a caminho", `O pedido #${order.id} saiu para entrega.`, { type: "delivery", orderId: order.id, status: "A caminho" }); } catch (error) { console.warn("[Delivery] Failed to notify customer about dispatch:", error); } }
      return { locationId: result.location.id, assignment: result.assignment, status: "A caminho" as const };
    }),
    complete: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const order = await data.getOrderForUser(input.orderId, ctx.user.id);
      if (!order) throw new Error("Pedido não encontrado ou não autorizado");
      if (order.status === "Entregue") return { success: true as const, status: "Entregue" as const, duplicate: true as const };
      if (order.status !== "A caminho") throw new Error("A entrega só pode ser encerrada quando estiver a caminho");
      const assignment = await data.getDeliveryAssignmentByOrder(input.orderId);
      const store = await data.getStoreForOwner(ctx.user.id);
      if (!assignment || (assignment.courierId !== ctx.user.id && store?.id !== order.storeId)) throw new Error("A entrega ainda não foi atribuída a este operador");
      const completed = await data.completeDelivery(input.orderId);
      if (completed.changed) {
        const profile = await data.getCourierProfileByUser(ctx.user.id);
        if (profile) await data.setCourierAvailability(ctx.user.id, "available");
        try { await sendPushToUser(order.customerId, "Pedido entregue", `O pedido #${order.id} foi marcado como entregue.`, { type: "delivery", orderId: order.id, status: "Entregue" }); } catch (error) { console.warn("[Delivery] Failed to notify customer about completion:", error); }
      }
      return { success: true as const, status: "Entregue" as const };
    }),
  }),
  chat: router({
    list: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), limit: z.number().int().min(1).max(200).default(100), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => { if (!await participantOrder(input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); return data.listChatMessages(input.orderId, input.limit, input.offset); }),
    send: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), body: z.string().trim().min(1).max(2000), idempotencyKey: z.string().trim().min(8).max(160) })).mutation(async ({ ctx, input }) => { const participant = await participantOrder(input.orderId, ctx.user.id); if (!participant) throw new Error("Pedido não encontrado"); const existing = await data.getChatMessageByIdempotencyKey(input.idempotencyKey); if (existing) return { messageId: existing.id, duplicate: true as const }; const created = await data.createChatMessage({ orderId: input.orderId, userId: ctx.user.id, role: participant.role, body: input.body, idempotencyKey: input.idempotencyKey }); const recipientId = participant.role === "customer" ? (await data.getStoreById(participant.order.storeId))?.ownerId : participant.order.customerId; if (!created.duplicate && recipientId) { try { await sendPushToUser(recipientId, "Nova mensagem no pedido", `Há uma nova mensagem no pedido #${participant.order.id}.`, { type: "order", orderId: participant.order.id }); } catch (error) { console.warn("[Chat] Failed to notify participant:", error); } } return { messageId: created.id, duplicate: created.duplicate }; }),
    markRead: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (!await participantOrder(input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); await data.markChatMessagesRead(input.orderId, ctx.user.id); return { success: true as const }; }),
  }),
  support: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0) }).optional()).query(({ ctx, input }) => data.listSupportTicketsForUser(ctx.user.id, input?.limit ?? 50, input?.offset ?? 0)),
    create: protectedProcedure.input(z.object({ subject: z.string().trim().min(3).max(160), body: z.string().trim().min(10).max(4000), orderId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (input.orderId && !await ownedOrder(db, input.orderId, ctx.user.id)) throw new Error("Pedido não encontrado"); const ticketId = await data.createSupportTicket({ userId: ctx.user.id, subject: input.subject, body: input.body, orderId: input.orderId }); return { ticketId }; }),
    messages: router({
      list: protectedProcedure.input(z.object({ ticketId: z.number().int().positive(), limit: z.number().int().min(1).max(200).default(100), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => { if (!await supportParticipant(input.ticketId, ctx.user)) throw new Error("Chamado não encontrado ou não autorizado"); return data.listSupportTicketMessages(input.ticketId, input.limit, input.offset); }),
      send: protectedProcedure.input(z.object({ ticketId: z.number().int().positive(), body: z.string().trim().min(1).max(4000), idempotencyKey: z.string().trim().min(8).max(160) })).mutation(async ({ ctx, input }) => { const participant = await supportParticipant(input.ticketId, ctx.user); if (!participant) throw new Error("Chamado não encontrado ou não autorizado"); const existing = await data.getSupportTicketMessageByIdempotencyKey(input.idempotencyKey); if (existing) return { messageId: existing.id, duplicate: true as const }; const created = await data.createSupportTicketMessage({ ticketId: input.ticketId, userId: ctx.user.id, role: participant.role, body: input.body, idempotencyKey: input.idempotencyKey }); if (!created.duplicate && participant.role === "admin") { try { await sendPushToUser(participant.ticket.userId, "Nova mensagem do suporte", `Há uma atualização no chamado #${participant.ticket.id}.`, { type: "support", ticketId: participant.ticket.id }); } catch (error) { console.warn("[Support] Failed to notify ticket owner:", error); } } return { messageId: created.id, duplicate: created.duplicate }; }),
      markRead: protectedProcedure.input(z.object({ ticketId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (!await supportParticipant(input.ticketId, ctx.user)) throw new Error("Chamado não encontrado ou não autorizado"); await data.markSupportTicketMessagesRead(input.ticketId); return { success: true as const }; }),
    }),
  }),
  privacy: router({
    mine: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0) }).optional()).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); return db.select().from(privacyConsents).where(eq(privacyConsents.userId, ctx.user.id)).orderBy(desc(privacyConsents.acceptedAt)).limit(input?.limit ?? 50).offset(input?.offset ?? 0); }),
    accept: protectedProcedure.input(z.object({ kind: z.enum(["terms", "privacy"]), version: z.string().trim().min(1).max(20) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(privacyConsents).values({ userId: ctx.user.id, kind: input.kind, version: input.version }).onDuplicateKeyUpdate({ set: { acceptedAt: new Date() } }); return { success: true as const }; }),
    export: protectedProcedure.query(({ ctx }) => data.exportUserData(ctx.user.id)),
    requestDeletion: protectedProcedure.mutation(async ({ ctx }) => { const ticketId = await data.createSupportTicket({ userId: ctx.user.id, subject: "Solicitação de exclusão de conta", body: "Solicito a análise e a exclusão assistida dos dados da minha conta, respeitando as retenções legais e financeiras aplicáveis." }); return { ticketId, success: true as const }; }),
  }),
});
