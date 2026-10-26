import crypto from "node:crypto";
import type {
  AssistantAudience,
  AssistantCard,
  AssistantCartLine,
  AssistantCartProduct,
  AssistantClientAction,
  AssistantNavigation,
} from "../shared/assistant";
import { priceSelectedOptions } from "./domain/order-options";
import * as db from "./db";
import { canCustomerCancelOrder } from "./order-state";
import { findAssistantTool } from "./assistant-tools";

export type AssistantActor = {
  id: number;
  role: string;
  email?: string | null;
  name?: string | null;
};

export type AssistantContext = {
  user: AssistantActor | null;
  audience: AssistantAudience;
  cart: AssistantCartLine[];
  req?: unknown;
  res?: unknown;
};

export type ToolEffect = {
  text: string;
  cards: AssistantCard[];
  clientActions: AssistantClientAction[];
  navigation?: AssistantNavigation;
  pending?: { tool: string; payload: unknown; summary: string };
  refs?: Array<Record<string, unknown>>;
};

const empty = (text: string, extra: Partial<ToolEffect> = {}): ToolEffect => ({
  text,
  cards: extra.cards ?? [],
  clientActions: extra.clientActions ?? [],
  navigation: extra.navigation,
  pending: extra.pending,
  refs: extra.refs,
});

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function positive(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function money(value: string | number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return `R$ ${number.toFixed(2).replace(".", ",")}`;
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message || message.length > 180) return "Não consegui fazer isso agora.";
  if (/sql|stack|postgres|drizzle|typeerror|undefined|database/i.test(message)) {
    return "Não consegui fazer isso agora.";
  }
  return message;
}

async function callerFor(ctx: AssistantContext) {
  if (!ctx.user) throw new Error("Entre na sua conta para continuar.");
  const { appRouter } = await import("./routers");
  return appRouter.createCaller({
    user: ctx.user,
    req: ctx.req,
    res: ctx.res,
  } as never);
}

function sameOptions(left: number[] | undefined, right: number[] | undefined) {
  const a = [...(left ?? [])].sort((x, y) => x - y);
  const b = [...(right ?? [])].sort((x, y) => x - y);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

async function ownStore(userId: number) {
  const store = await db.getStoreForOwner(userId);
  if (!store) return { ok: false as const, message: "Cadastre sua loja antes de continuar." };
  return { ok: true as const, store };
}

async function ownProduct(
  userId: number,
  input: { productId?: number; productName?: string },
) {
  const owned = await ownStore(userId);
  if (!owned.ok) {
    return { ok: false as const, message: owned.message, cards: [] as AssistantCard[], refs: [] as Array<Record<string, unknown>> };
  }
  const products = await db.listProductsForStore(owned.store.id);
  if (input.productId) {
    const product = products.find((item) => item.id === input.productId);
    if (!product) {
      return { ok: false as const, message: "Esse produto não é da sua loja.", cards: [] as AssistantCard[], refs: [] as Array<Record<string, unknown>> };
    }
    return { ok: true as const, store: owned.store, product };
  }
  const needle = input.productName?.trim().toLowerCase() ?? "";
  if (!needle) {
    return { ok: false as const, message: "Qual produto?", cards: [] as AssistantCard[], refs: [] as Array<Record<string, unknown>> };
  }
  const matches = products.filter((item) => item.name.toLowerCase().includes(needle));
  if (matches.length === 1) return { ok: true as const, store: owned.store, product: matches[0] };
  if (!matches.length) {
    return { ok: false as const, message: "Não encontrei esse produto na sua loja.", cards: [] as AssistantCard[], refs: [] as Array<Record<string, unknown>> };
  }
  const listed = matches.slice(0, 6);
  return {
    ok: false as const,
    message: "Encontrei mais de um produto. Qual deles?",
    cards: listed.map((item) => ({
      title: item.name,
      subtitle: item.category,
      amount: money(item.price),
    })),
    refs: listed.map((item) => ({ productId: item.id, name: item.name })),
  };
}

export async function performAssistantTool(
  name: string,
  rawArgs: unknown,
  ctx: AssistantContext,
): Promise<ToolEffect> {
  const spec = findAssistantTool(name);
  if (!spec || !spec.audiences.includes(ctx.audience) || !ctx.user && ctx.audience !== "guest") {
    return empty("Essa conta não pode fazer isso.");
  }
  if (ctx.audience !== "guest" && !ctx.user) return empty("Entre na sua conta para continuar.");
  try {
    const effect = await runTool(name, asRecord(rawArgs), ctx);
    if (spec.confirm && !effect.pending) return effect;
    if (!spec.confirm && effect.pending) return empty("Essa ação não precisa de confirmação.");
    return effect;
  } catch (error) {
    return empty(safeMessage(error));
  }
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AssistantContext,
): Promise<ToolEffect> {
  switch (name) {
    case "search_catalog":
      return searchCatalog(args);
    case "search_stores":
      return searchStores(args);
    case "view_menu":
      return viewMenu(args);
    case "add_to_cart":
      return addToCart(args, ctx);
    case "remove_from_cart":
      return removeFromCart(args, ctx);
    case "view_cart":
      return viewCart(ctx);
    case "place_order":
      return placeOrder(args, ctx);
    case "list_my_orders":
      return listMyOrders(ctx);
    case "repeat_last_order":
      return repeatLastOrder(ctx);
    case "cancel_order":
      return cancelOrder(positive(args.orderId), ctx);
    case "pause_store":
      return pauseStore(args, ctx);
    case "reopen_store":
      return reopenStore(ctx);
    case "set_product_availability":
      return setAvailability(args, ctx);
    case "change_product_price":
      return changePrice(args, ctx);
    case "list_store_orders":
      return listStoreOrders(ctx);
    case "accept_order":
      return moveStoreOrder(positive(args.orderId), "Aceito", ctx);
    case "refuse_order":
      return refuseOrder(positive(args.orderId), ctx);
    case "mark_order_ready":
      return markReady(positive(args.orderId), ctx);
    case "register_sale":
      return registerSale(args, ctx);
    case "list_fiado":
      return listFiado(ctx);
    case "sales_today":
      return salesToday(ctx);
    case "ad_credits":
      return adCredits(ctx);
    case "generate_ad":
      return generateAd(args, ctx);
    case "set_availability":
      return setCourierOnline(args.online === true, ctx);
    case "list_deliveries":
      return listDeliveries(ctx);
    case "accept_delivery":
      return acceptDelivery(positive(args.offerId), ctx);
    case "update_delivery":
      return updateDelivery(args, ctx);
    case "earnings_today":
      return earningsToday(ctx);
    default:
      return empty("Essa conta não pode fazer isso.");
  }
}

async function searchCatalog(args: Record<string, unknown>): Promise<ToolEffect> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  const category = typeof args.category === "string" ? args.category.trim() : "";
  const found = await db.searchAvailableProducts({
    query: query || undefined,
    category: category || undefined,
    limit: 12,
  });
  const openNow = args.openNow === true;
  const cards: AssistantCard[] = [];
  const refs: Array<Record<string, unknown>> = [];
  for (const item of found.items) {
    if (item.available === 0) continue;
    if (openNow && !item.storeOpen) continue;
    cards.push({
      title: item.name,
      subtitle: `${item.storeName} · ${item.category}`,
      amount: money(item.price),
      badge: item.storeOpen ? "Aberta" : "Fechada",
      productId: item.id,
      storeId: item.storeId,
    });
    refs.push({
      name: item.name,
      storeName: item.storeName,
      open: item.storeOpen,
    });
    if (cards.length >= 8) break;
  }
  if (!cards.length) return empty("Não encontrei nada com esse nome agora.");
  return empty(
    cards.length === 1
      ? `Encontrei ${cards[0].title} em ${cards[0].subtitle?.split(" · ")[0]}.`
      : `Encontrei ${cards.length} opções.`,
    { cards, refs },
  );
}

const STORE_KIND: Record<string, string> = {
  restaurant: "Restaurante",
  market: "Mercado",
  service: "Serviço",
};

async function findStores(query: string | undefined, openNow: boolean) {
  const found = await db.searchAvailableProducts({
    query: query || undefined,
    limit: 40,
  });
  const stores = new Map<number, { storeId: number; storeName: string; open: boolean; kind?: string }>();
  for (const item of found.items) {
    if (item.available === 0) continue;
    if (openNow && !item.storeOpen) continue;
    const current = stores.get(item.storeId);
    if (!current) {
      stores.set(item.storeId, {
        storeId: item.storeId,
        storeName: item.storeName,
        open: item.storeOpen,
        kind: item.storeKind,
      });
    } else if (item.storeOpen) {
      current.open = true;
    }
    if (stores.size >= 8) break;
  }
  return [...stores.values()];
}

function storeCards(stores: Array<{ storeId: number; storeName: string; open: boolean; kind?: string }>) {
  return {
    cards: stores.map((store) => ({
      title: store.storeName,
      subtitle: STORE_KIND[store.kind ?? ""] ?? "Loja",
      badge: store.open ? "Aberta" : "Fechada",
      storeId: store.storeId,
    })),
    refs: stores.map((store) => ({
      name: store.storeName,
      storeName: store.storeName,
      open: store.open,
    })),
  };
}

async function searchStores(args: Record<string, unknown>): Promise<ToolEffect> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  const openNow = args.openNow === true;
  const stores = await findStores(query, openNow);
  if (!stores.length) {
    return empty(openNow ? "Não há lojas abertas agora." : "Não encontrei essa loja.");
  }
  const shown = storeCards(stores);
  return empty(
    stores.length === 1
      ? `${stores[0].storeName} está ${stores[0].open ? "aberta" : "fechada"}.`
      : `Encontrei ${stores.length} lojas.`,
    shown,
  );
}

async function viewMenu(args: Record<string, unknown>): Promise<ToolEffect> {
  const named = typeof args.storeName === "string" ? args.storeName.trim() : "";
  let storeId = positive(args.storeId);
  if (!storeId && /^\d+$/.test(named)) storeId = Number(named);
  if (!storeId && named) {
    const matches = (await findStores(named, false)).filter((store) =>
      store.storeName.toLowerCase().includes(named.toLowerCase()),
    );
    if (matches.length > 1) {
      return empty("Encontrei mais de uma loja. Qual delas?", storeCards(matches));
    }
    storeId = matches[0]?.storeId;
  }
  if (!storeId) return empty("Qual loja você quer ver?");
  const store = await db.getStoreById(storeId);
  if (!store || !(await db.storeListedForCustomers(store))) {
    return empty("Não encontrei essa loja.");
  }
  const ops = await db.getStoreOps(store.id);
  if (ops.approvalStatus !== "approved") return empty("Essa loja ainda não aparece para pedidos.");
  const products = (await db.listProductsForStore(store.id)).slice(0, 12);
  const optionSets = await Promise.all(products.map((product) => db.listProductOptions(product.id)));
  const cards = products.map((product) => ({
    title: product.name,
    subtitle: product.category,
    amount: money(product.price),
    badge: product.available === 0 ? "Esgotado" : undefined,
    productId: product.id,
    storeId: store.id,
  }));
  if (!cards.length) return empty(`${store.name} ainda não tem produtos.`);
  return empty(`Cardápio de ${store.name}. Qual item você quer? Diga o nome.`, {
    cards,
    refs: products.map((product, index) => ({
      name: product.name,
      storeName: store.name,
      available: product.available !== 0,
      options: optionSets[index].flatMap((group) => group.choices.map((choice) => choice.name)),
    })),
  });
}

function genericItem(name: string) {
  return /^(item|itens|produto|produtos|coisa|alguma coisa|um item|uma coisa)$/i.test(name);
}

async function addToCart(args: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para montar a sacola.");
  const quantity = positive(args.quantity);
  const productName = typeof args.productName === "string" ? args.productName.trim() : "";
  let productId = positive(args.productId);
  if (!productId && (!productName || genericItem(productName))) {
    return viewMenu(args);
  }
  if (!quantity || quantity > 50) return empty("Quantos você quer?");
  if (!productId && productName) {
    const found = await db.searchAvailableProducts({ query: productName, limit: 20 });
    const needle = productName.toLowerCase();
    let matches = found.items.filter(
      (item) => item.available !== 0 && item.name.toLowerCase().includes(needle),
    );
    const storeName = typeof args.storeName === "string" ? args.storeName.trim() : "";
    if (storeName && !/^\d+$/.test(storeName)) {
      matches = matches.filter((item) => item.storeName.toLowerCase().includes(storeName.toLowerCase()));
    }
    const storeId = positive(args.storeId) ?? (/^\d+$/.test(storeName) ? Number(storeName) : undefined);
    if (storeId) matches = matches.filter((item) => item.storeId === storeId);
    if (matches.length > 1) {
      return empty("Encontrei mais de um. Qual deles?", {
        cards: matches.slice(0, 8).map((item) => ({
          title: item.name,
          subtitle: item.storeName,
          amount: money(item.price),
          productId: item.id,
          storeId: item.storeId,
        })),
        refs: matches.slice(0, 8).map((item) => ({ name: item.name, storeName: item.storeName })),
      });
    }
    productId = matches[0]?.id;
  }
  if (!productId) return empty("Não encontrei esse produto. Quer ver o cardápio?");
  const product = await db.getProductById(productId);
  if (!product || product.available === 0) return empty("Esse produto não está disponível.");
  const store = await db.getStoreById(product.storeId);
  if (!store || !(await db.storeListedForCustomers(store))) return empty("Essa loja não está disponível.");
  const groups = await db.listProductOptions(product.id);
  const wanted = Array.isArray(args.optionNames)
    ? args.optionNames.filter((item): item is string => typeof item === "string")
    : [];
  const optionIds: number[] = [];
  const chosen = [];
  for (const name of wanted) {
    const needle = name.trim().toLowerCase();
    const matches = groups.flatMap((group) =>
      group.choices
        .filter((choice) => choice.name.toLowerCase().includes(needle))
        .map((choice) => ({ ...choice, groupName: group.name, groupId: group.id })),
    );
    if (matches.length !== 1) {
      return empty(`Não encontrei a opção "${name}" nesse produto. Pode escolher de novo?`);
    }
    optionIds.push(matches[0].id);
    chosen.push(matches[0]);
  }
  const priced = priceSelectedOptions(product.price, groups, optionIds);
  if (!priced.ok) return empty(priced.message);
  const cartProduct: AssistantCartProduct = {
    id: product.id,
    storeId: store.id,
    name: product.name,
    storeName: store.name,
    category: product.category,
    description: product.description,
    price: priced.unitPrice,
    deliveryFee: String(store.deliveryFee),
    storeKind: store.kind,
    flashEnabled: Boolean(store.flashEnabled),
    saleUnit: product.saleUnit,
    packSize: product.packSize,
    options: chosen.map((choice) => ({
      id: choice.id,
      groupId: choice.groupId,
      groupName: choice.groupName,
      name: choice.name,
      priceDelta: String(choice.priceDelta),
    })),
  };
  const label = chosen.length ? ` (${chosen.map((choice) => choice.name).join(", ")})` : "";
  return empty(`Vou colocar ${quantity} ${product.name}${label} na sacola.`, {
    clientActions: [{ type: "add", product: cartProduct, quantity }],
    navigation: { screen: "cart", label: "Ver sacola" },
  });
}

function removeFromCart(args: Record<string, unknown>, ctx: AssistantContext): ToolEffect {
  const named = typeof args.productName === "string" ? args.productName.trim().toLowerCase() : "";
  const productId =
    positive(args.productId) ??
    ctx.cart.find((item) => named && item.name?.toLowerCase().includes(named))?.productId;
  if (!productId) return empty("Qual item você quer tirar?");
  const optionIds = Array.isArray(args.optionIds)
    ? args.optionIds.map(positive).filter((item): item is number => Boolean(item))
    : undefined;
  const line = ctx.cart.find(
    (item) => item.productId === productId && sameOptions(item.optionIds, optionIds),
  );
  if (!line) return empty("Esse item não está na sacola.");
  return empty("Tirei o item da sacola.", {
    clientActions: [{ type: "remove", productId, optionIds: line.optionIds }],
  });
}

async function viewCart(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.cart.length) return empty("Sua sacola está vazia.");
  const cards: AssistantCard[] = [];
  let total = 0;
  for (const line of ctx.cart) {
    const loaded = await db.getProductById(line.productId);
    if (!loaded) continue;
    const available = await db.getAvailableProductForStore(line.productId, loaded.storeId);
    const groups = await db.listProductOptions(loaded.id);
    const priced = priceSelectedOptions(loaded.price, groups, line.optionIds);
    const unit = priced.ok ? Number(priced.unitPrice) : Number(loaded.price);
    total += unit * line.quantity;
    cards.push({
      title: `${line.quantity}× ${loaded.name}`,
      subtitle: priced.ok && priced.label ? priced.label : loaded.category,
      amount: money(unit * line.quantity),
      badge: available ? undefined : "Indisponível",
    });
  }
  const store = ctx.cart[0] ? await db.getProductById(ctx.cart[0].productId) : undefined;
  const storeRow = store ? await db.getStoreById(store.storeId) : undefined;
  if (storeRow) total += Number(storeRow.deliveryFee);
  return empty(`Sua sacola está em ${money(total)}, com a taxa de entrega.`, { cards });
}

async function placeOrder(args: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para pedir.");
  if (!ctx.cart.length) return empty("Sua sacola está vazia.");
  const paymentMethod = args.paymentMethod;
  if (
    paymentMethod !== "pix" &&
    paymentMethod !== "cash" &&
    paymentMethod !== "fiado" &&
    paymentMethod !== "card_credit" &&
    paymentMethod !== "card_debit"
  ) {
    return empty("Como você quer pagar: PIX, dinheiro, fiado ou cartão na entrega?");
  }
  const fulfillmentMode = args.fulfillmentMode === "pickup" ? "pickup" : "delivery";
  const first = await db.getProductById(ctx.cart[0].productId);
  if (!first) return empty("Não encontrei os produtos da sacola.");
  for (const line of ctx.cart) {
    const product = await db.getProductById(line.productId);
    if (!product || product.storeId !== first.storeId) {
      return empty("A sacola só pode ter produtos de uma loja.");
    }
    const priced = priceSelectedOptions(
      product.price,
      await db.listProductOptions(product.id),
      line.optionIds,
    );
    if (!priced.ok) return empty(priced.message);
  }
  const store = await db.getStoreById(first.storeId);
  if (!store) return empty("Não encontrei a loja.");
  let addressId = positive(args.addressId);
  if (fulfillmentMode === "delivery") {
    const addresses = await db.listCustomerAddresses(ctx.user.id);
    if (!addressId) {
      const fallback = addresses.find((item) => item.isDefault === 1) ?? (addresses.length === 1 ? addresses[0] : undefined);
      addressId = fallback?.id;
    }
    if (!addressId) {
      return empty("Para entregar, escolha um endereço.", {
        cards: addresses.slice(0, 6).map((item) => ({
          title: item.label || "Endereço",
          subtitle: `${item.street}, ${item.number}`,
        })),
      });
    }
    const address = await db.getCustomerAddress(ctx.user.id, addressId);
    if (!address) return empty("Não encontrei esse endereço na sua conta.");
  }
  const methodLabel =
    paymentMethod === "cash"
      ? "dinheiro"
      : paymentMethod === "fiado"
        ? "fiado"
        : paymentMethod === "card_credit"
          ? "crédito na entrega"
          : paymentMethod === "card_debit"
            ? "débito na entrega"
            : "PIX";
  return empty("Confira e toque em Confirmar para enviar o pedido.", {
    pending: {
      tool: "place_order",
      summary: `Enviar o pedido para ${store.name}, pagamento no ${methodLabel}. O valor final é calculado agora.`,
      payload: {
        storeId: store.id,
        paymentMethod,
        fulfillmentMode,
        addressId,
        items: ctx.cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          optionIds: line.optionIds ?? [],
          note: line.note,
        })),
      },
    },
  });
}

async function listMyOrders(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para ver os pedidos.");
  const orders = await db.listOrdersForCustomer(ctx.user.id, 8, 0);
  if (!orders.length) return empty("Você ainda não tem pedidos.");
  return empty("Estes são os seus pedidos.", {
    cards: orders.map((order) => ({
      title: order.storeName || `Pedido ${order.id}`,
      subtitle: `Pedido ${order.id}`,
      amount: money(order.total),
      badge: order.status,
    })),
    navigation: { screen: "orders", label: "Abrir pedidos" },
  });
}

async function repeatLastOrder(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para repetir um pedido.");
  const [latest] = await db.listOrdersForCustomer(ctx.user.id, 1, 0);
  if (!latest || latest.customerId !== ctx.user.id) return empty("Não encontrei um pedido anterior.");
  return empty("Toque em Confirmar para repetir o último pedido.", {
    pending: {
      tool: "repeat_last_order",
      summary: `Repetir o pedido ${latest.id} de ${latest.storeName}. Se o preço mudou, vale o valor de agora.`,
      payload: { orderId: latest.id },
    },
    cards: [{ title: latest.storeName || "Pedido", amount: money(latest.total), badge: latest.status }],
  });
}

async function cancelOrder(orderId: number | undefined, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user || !orderId) return empty("Qual pedido você quer cancelar?");
  const order = await db.getOrderForUser(orderId, ctx.user.id);
  if (!order || order.customerId !== ctx.user.id) return empty("Não encontrei esse pedido na sua conta.");
  if (!canCustomerCancelOrder(order.status)) {
    return empty("Esse pedido já está em preparo e não pode ser cancelado por aqui.");
  }
  return empty("Toque em Confirmar para cancelar o pedido.", {
    pending: {
      tool: "cancel_order",
      summary: `Cancelar o pedido ${order.id}.`,
      payload: { orderId: order.id },
    },
  });
}

async function pauseStore(args: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const minutes = Number(args.minutes);
  if (minutes === 15 || minutes === 30 || minutes === 60) {
    await db.saveStoreOps(owned.store.id, {
      pauseManual: false,
      pausedUntil: new Date(Date.now() + minutes * 60_000),
    });
    return empty(`A loja fica fechada por ${minutes} minutos.`);
  }
  await db.saveStoreOps(owned.store.id, { pauseManual: true, pausedUntil: null });
  return empty("A loja está fechada até você reabrir.");
}

async function reopenStore(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  await db.saveStoreOps(owned.store.id, { pauseManual: false, pausedUntil: null });
  if (owned.store.isOpen === 0) await db.updateStoreOpen(owned.store.id, true);
  return empty("A loja está aberta de novo.");
}

async function setAvailability(args: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const found = await ownProduct(ctx.user.id, {
    productId: positive(args.productId),
    productName: typeof args.productName === "string" ? args.productName : undefined,
  });
  if (!found.ok) return empty(found.message, { cards: found.cards, refs: found.refs });
  const available = args.available === true;
  await db.updateProductAvailability(found.product.id, available);
  return empty(available ? `${found.product.name} voltou a ser vendido.` : `${found.product.name} está esgotado.`);
}

async function changePrice(args: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const price = typeof args.price === "string" ? args.price.replace(",", ".").trim() : "";
  if (!/^\d+(\.\d{1,2})?$/.test(price)) return empty("Diga o preço novo, por exemplo 25,00.");
  const found = await ownProduct(ctx.user.id, {
    productId: positive(args.productId),
    productName: typeof args.productName === "string" ? args.productName : undefined,
  });
  if (!found.ok) return empty(found.message, { cards: found.cards, refs: found.refs });
  return empty("Toque em Confirmar para mudar o preço.", {
    pending: {
      tool: "change_product_price",
      summary: `Mudar ${found.product.name} de ${money(found.product.price)} para ${money(price)}.`,
      payload: { productId: found.product.id, price },
    },
  });
}

async function listStoreOrders(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const orders = await db.listOrdersForStore(owned.store.id, 12, 0);
  const active = orders.filter((order) =>
    ["Pendente", "Aceito", "Preparando", "Pronto", "A caminho"].includes(order.status),
  );
  if (!active.length) return empty("Não há pedidos em andamento.");
  return empty("Pedidos da loja.", {
    cards: active.slice(0, 8).map((order) => ({
      title: `Pedido ${order.id}`,
      amount: money(order.total),
      badge: order.status,
    })),
    navigation: { screen: "store_orders", label: "Abrir pedidos" },
  });
}

async function moveStoreOrder(
  orderId: number | undefined,
  status: "Aceito" | "Cancelado" | "Preparando" | "Pronto",
  ctx: AssistantContext,
): Promise<ToolEffect> {
  if (!ctx.user || !orderId) return empty("Qual pedido?");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const order = await db.getOrderForUser(orderId, ctx.user.id);
  if (!order || order.storeId !== owned.store.id) return empty("Não encontrei esse pedido na sua loja.");
  const caller = await callerFor(ctx);
  await caller.pediu.orders.status({ orderId: order.id, status });
  return empty(`O pedido ${order.id} agora está ${status}.`);
}

async function refuseOrder(orderId: number | undefined, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user || !orderId) return empty("Qual pedido você quer recusar?");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const order = await db.getOrderForUser(orderId, ctx.user.id);
  if (!order || order.storeId !== owned.store.id || order.customerId === ctx.user.id && order.storeId !== owned.store.id) {
    return empty("Não encontrei esse pedido na sua loja.");
  }
  if (order.storeId !== owned.store.id) return empty("Não encontrei esse pedido na sua loja.");
  return empty("Toque em Confirmar para recusar o pedido.", {
    pending: {
      tool: "refuse_order",
      summary: `Recusar o pedido ${order.id}.`,
      payload: { orderId: order.id },
    },
  });
}

async function markReady(orderId: number | undefined, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user || !orderId) return empty("Qual pedido ficou pronto?");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const order = await db.getOrderForUser(orderId, ctx.user.id);
  if (!order || order.storeId !== owned.store.id) return empty("Não encontrei esse pedido na sua loja.");
  if (order.status === "Pendente") return empty("Aceite o pedido antes de marcar como pronto.");
  if (order.status === "Pronto") return empty(`O pedido ${order.id} já está pronto.`);
  const caller = await callerFor(ctx);
  if (order.status === "Aceito") {
    await caller.pediu.orders.status({ orderId: order.id, status: "Preparando" });
  }
  await caller.pediu.orders.status({ orderId: order.id, status: "Pronto" });
  return empty(`O pedido ${order.id} está pronto.`);
}

async function registerSale(args: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const total = typeof args.total === "string" ? args.total.replace(",", ".").trim() : "";
  if (!/^\d+(\.\d{1,2})?$/.test(total) || Number(total) <= 0) return empty("Diga o valor da venda.");
  const paymentMethod = args.paymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "pix" && paymentMethod !== "fiado") {
    return empty("A venda pode ser em dinheiro, PIX ou fiado.");
  }
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  let customerId: number | undefined;
  if (paymentMethod === "fiado") {
    const name = typeof args.customerName === "string" ? args.customerName.trim().toLowerCase() : "";
    if (!name) return empty("Para fiado, diga o nome do cliente.");
    const customers = await db.listCustomersForStore(owned.store.id);
    const matches = customers.filter((item) => item.name.toLowerCase().includes(name));
    if (matches.length !== 1) {
      return empty(matches.length ? "Encontrei mais de um cliente. Qual deles?" : "Não encontrei esse cliente no fiado.", {
        cards: matches.slice(0, 6).map((item) => ({ title: item.name, amount: money(item.balance) })),
      });
    }
    customerId = matches[0].id;
  }
  const methodLabel = paymentMethod === "cash" ? "dinheiro" : paymentMethod === "pix" ? "PIX" : "fiado";
  return empty("Toque em Confirmar para registrar a venda.", {
    pending: {
      tool: "register_sale",
      summary: `Registrar venda de ${money(total)} no ${methodLabel}.`,
      payload: { total, paymentMethod, customerId },
    },
  });
}

async function listFiado(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const customers = (await db.listCustomersForStore(owned.store.id)).filter((item) => Number(item.balance) > 0);
  if (!customers.length) return empty("Ninguém está devendo fiado.");
  const total = customers.reduce((sum, item) => sum + Number(item.balance), 0);
  return empty(`O fiado em aberto soma ${money(total)}.`, {
    cards: customers.slice(0, 8).map((item) => ({ title: item.name, amount: money(item.balance) })),
  });
}

async function salesToday(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const today = dayKey(new Date());
  const orders = (await db.listOrdersForStore(owned.store.id, 100, 0)).filter(
    (order) => order.status !== "Cancelado" && dayKey(new Date(order.createdAt)) === today,
  );
  const sales = (await db.listSalesForStore(owned.store.id)).filter(
    (sale) => dayKey(new Date(sale.createdAt)) === today,
  );
  const total = orders.reduce((sum, order) => sum + Number(order.total), 0) + sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  return empty(`Hoje a loja somou ${money(total)}.`, {
    cards: [
      { title: "Pedidos", subtitle: `${orders.length} pedido(s)`, amount: money(orders.reduce((sum, order) => sum + Number(order.total), 0)) },
      { title: "Vendas registradas", subtitle: `${sales.length} venda(s)`, amount: money(sales.reduce((sum, sale) => sum + Number(sale.total), 0)) },
    ],
  });
}

async function adCredits(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const credits = await db.getAdCreditsForStore(owned.store.id);
  return empty(`Você tem ${credits.balance} crédito(s) para anúncio.`);
}

async function generateAd(args: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const found = await ownProduct(ctx.user.id, {
    productId: positive(args.productId),
    productName: typeof args.productName === "string" ? args.productName : undefined,
  });
  if (!found.ok) return empty(found.message, { cards: found.cards, refs: found.refs });
  const tone = args.tone === "caseiro" || args.tone === "premium" || args.tone === "divertido" ? args.tone : "irresistivel";
  return empty("Toque em Confirmar para criar o anúncio. Isso usa 1 crédito.", {
    pending: {
      tool: "generate_ad",
      summary: `Criar um anúncio de ${found.product.name}. Isso usa 1 crédito.`,
      payload: {
        productId: found.product.id,
        offerLabel: typeof args.offerLabel === "string" ? args.offerLabel.slice(0, 120) : undefined,
        audience: typeof args.audience === "string" ? args.audience.slice(0, 120) : undefined,
        tone,
      },
    },
  });
}

async function setCourierOnline(online: boolean, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const profile = await db.getCourierProfileByUser(ctx.user.id);
  if (!profile) return empty("Termine o cadastro de motoboy antes de ficar disponível.");
  await db.setCourierAvailability(ctx.user.id, online ? "available" : "offline");
  return empty(online ? "Você está disponível para corridas." : "Você ficou indisponível.");
}

async function listDeliveries(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const offers = await db.listPendingDeliveryOffers(ctx.user.id);
  if (!offers.length) return empty("Não há entregas para você agora.");
  const listed = offers.slice(0, 8);
  return empty("Entregas disponíveis.", {
    cards: listed.map((offer) => ({
      title: offer.storeName,
      subtitle: offer.deliveryAddress || `Pedido ${offer.orderId}`,
      amount: offer.payoutAmount != null ? money(offer.payoutAmount) : undefined,
    })),
    refs: listed.map((offer) => ({
      offerId: offer.id,
      orderId: offer.orderId,
      storeName: offer.storeName,
    })),
    navigation: { screen: "courier", label: "Abrir entregas" },
  });
}

async function acceptDelivery(offerId: number | undefined, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user || !offerId) return empty("Qual entrega você quer aceitar?");
  const result = await db.respondToDeliveryOffer({
    offerId,
    courierUserId: ctx.user.id,
    accept: true,
  });
  return empty(`Entrega aceita. Pedido ${result.offer.orderId}.`, {
    navigation: { screen: "courier", label: "Abrir a corrida" },
  });
}

async function updateDelivery(args: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const orderId = positive(args.orderId);
  if (!orderId) return empty("Qual entrega?");
  if (args.step === "picked_up") {
    await db.markCourierPickup(orderId, ctx.user.id);
    return empty(`Pedido ${orderId} retirado. Você está a caminho.`);
  }
  if (args.step === "delivered") {
    const caller = await callerFor(ctx);
    await caller.pediu.experience.delivery.complete({
      orderId,
      code: typeof args.code === "string" ? args.code : undefined,
      cashReceived: args.cashReceived === true ? true : undefined,
    });
    return empty(`Pedido ${orderId} entregue.`);
  }
  return empty("Diga se você retirou ou se já entregou.");
}

async function earningsToday(ctx: AssistantContext): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const today = dayKey(new Date());
  const rows = (await db.listCourierEarnings(ctx.user.id)).filter(
    (row) => dayKey(new Date(row.createdAt)) === today,
  );
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  return empty(rows.length ? `Hoje você ganhou ${money(total)}.` : "Ainda não há ganho registrado hoje.", {
    cards: rows.slice(0, 6).map((row) => ({
      title: `Pedido ${row.orderId}`,
      amount: money(row.amount),
    })),
  });
}

export async function commitAssistantAction(
  tool: string,
  payload: unknown,
  ctx: AssistantContext,
): Promise<ToolEffect> {
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const spec = findAssistantTool(tool);
  if (!spec?.confirm || !spec.audiences.includes(ctx.audience)) {
    return empty("Essa confirmação não vale mais.");
  }
  const body = asRecord(payload);
  try {
    if (tool === "change_product_price") return commitPrice(body, ctx);
    if (tool === "cancel_order") return commitCancel(body, ctx);
    if (tool === "refuse_order") return commitRefuse(body, ctx);
    if (tool === "register_sale") return commitSale(body, ctx);
    if (tool === "generate_ad") return commitAd(body, ctx);
    if (tool === "place_order") return commitPlace(body, ctx);
    if (tool === "repeat_last_order") return commitRepeat(body, ctx);
    return empty("Essa confirmação não vale mais.");
  } catch (error) {
    return empty(safeMessage(error));
  }
}

async function commitPrice(body: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  const price = typeof body.price === "string" ? body.price : "";
  const productId = positive(body.productId);
  if (!ctx.user || !productId || !/^\d+(\.\d{1,2})?$/.test(price)) {
    return empty("Não consegui mudar o preço.");
  }
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const product = await db.getProductForStore(productId, owned.store.id);
  if (!product) return empty("Esse produto não é da sua loja.");
  await db.updateStoreProduct(owned.store.id, product.id, {
    name: product.name,
    category: product.category,
    description: product.description,
    price,
    saleUnit: product.saleUnit,
    packSize: product.packSize,
    inventoryTracked: product.inventoryTracked,
    stockQuantity: product.stockQuantity,
    imageData: product.imageData,
  });
  return empty(`${product.name} agora custa ${money(price)}.`);
}

async function commitCancel(body: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  const orderId = positive(body.orderId);
  if (!ctx.user || !orderId) return empty("Não encontrei o pedido.");
  const order = await db.getOrderForUser(orderId, ctx.user.id);
  if (!order || order.customerId !== ctx.user.id) return empty("Não encontrei esse pedido na sua conta.");
  if (!canCustomerCancelOrder(order.status)) return empty("Esse pedido já não pode ser cancelado.");
  const caller = await callerFor(ctx);
  await caller.pediu.orders.status({ orderId, status: "Cancelado" });
  return empty(`O pedido ${orderId} foi cancelado.`);
}

async function commitRefuse(body: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  const orderId = positive(body.orderId);
  if (!ctx.user || !orderId) return empty("Não encontrei o pedido.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const order = await db.getOrderForUser(orderId, ctx.user.id);
  if (!order || order.storeId !== owned.store.id) return empty("Não encontrei esse pedido na sua loja.");
  const caller = await callerFor(ctx);
  await caller.pediu.orders.status({ orderId, status: "Cancelado" });
  return empty(`O pedido ${orderId} foi recusado.`);
}

async function commitSale(body: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  const total = typeof body.total === "string" ? body.total : "";
  const paymentMethod = body.paymentMethod;
  if (
    !/^\d+(\.\d{1,2})?$/.test(total) ||
    (paymentMethod !== "cash" && paymentMethod !== "pix" && paymentMethod !== "fiado")
  ) {
    return empty("Não consegui registrar a venda.");
  }
  if (!ctx.user) return empty("Entre na sua conta para continuar.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const customerId = positive(body.customerId);
  if (paymentMethod === "fiado") {
    if (!customerId) return empty("Não encontrei o cliente do fiado.");
    const customer = await db.getCustomerCredit(owned.store.id, customerId);
    if (!customer) return empty("Esse cliente não é da sua loja.");
  }
  const caller = await callerFor(ctx);
  await caller.pediu.sales.create({
    total,
    paymentMethod,
    customerId: paymentMethod === "fiado" ? customerId : undefined,
  });
  if (paymentMethod === "fiado" && customerId) {
    await caller.pediu.ledger.add({
      customerId,
      type: "credit",
      amount: total,
      note: "Venda registrada pelo assistente",
    });
  }
  return empty(`Venda de ${money(total)} registrada.`);
}

async function commitAd(body: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  const productId = positive(body.productId);
  if (!ctx.user || !productId) return empty("Não encontrei o produto.");
  const owned = await ownStore(ctx.user.id);
  if (!owned.ok) return empty(owned.message);
  const product = await db.getProductForStore(productId, owned.store.id);
  if (!product) return empty("Esse produto não é da sua loja.");
  const tone =
    body.tone === "caseiro" || body.tone === "premium" || body.tone === "divertido"
      ? body.tone
      : "irresistivel";
  const caller = await callerFor(ctx);
  await caller.pediu.ads.generate({
    productId,
    offerLabel: typeof body.offerLabel === "string" ? body.offerLabel : undefined,
    audience: typeof body.audience === "string" ? body.audience : undefined,
    tone,
  });
  return empty(`O anúncio de ${product.name} foi criado. Usei 1 crédito.`, {
    navigation: { screen: "catalog", label: "Ver anúncios" },
  });
}

async function commitPlace(body: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  const storeId = positive(body.storeId);
  const items = Array.isArray(body.items) ? body.items : [];
  const paymentMethod = body.paymentMethod;
  const fulfillmentMode = body.fulfillmentMode === "pickup" ? "pickup" : "delivery";
  if (!storeId || !items.length) return empty("A sacola mudou. Monte o pedido de novo.");
  if (
    paymentMethod !== "pix" &&
    paymentMethod !== "cash" &&
    paymentMethod !== "fiado" &&
    paymentMethod !== "card_credit" &&
    paymentMethod !== "card_debit"
  ) {
    return empty("Escolha a forma de pagamento de novo.");
  }
  const quotedItems = [];
  for (const item of items) {
    const line = asRecord(item);
    const productId = positive(line.productId);
    const quantity = positive(line.quantity);
    if (!productId || !quantity) return empty("A sacola mudou. Monte o pedido de novo.");
    const product = await db.getAvailableProductForStore(productId, storeId);
    if (!product) return empty("Um item da sacola não está mais disponível.");
    const optionIds = Array.isArray(line.optionIds)
      ? line.optionIds.map(positive).filter((value): value is number => Boolean(value))
      : [];
    const priced = priceSelectedOptions(product.price, await db.listProductOptions(product.id), optionIds);
    if (!priced.ok) return empty(priced.message);
    quotedItems.push({
      productId,
      quantity,
      unitPrice: priced.unitPrice,
      optionIds: priced.optionIds,
      note: typeof line.note === "string" ? line.note : undefined,
    });
  }
  const caller = await callerFor(ctx);
  const addressId = positive(body.addressId);
  const quote = await caller.pediu.checkout.quote({
    storeId,
    addressId,
    fulfillmentMode,
    items: quotedItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      optionIds: item.optionIds,
      note: item.note,
    })),
  });
  const created = await caller.pediu.orders.create({
    idempotencyKey: `assistant-${ctx.user?.id}-${crypto.randomBytes(8).toString("hex")}`,
    storeId,
    total: quote.total,
    paymentMethod,
    fulfillmentMode,
    addressId,
    items: quote.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      note: item.note,
      optionIds: item.optionIds,
    })),
  });
  return empty(`Pedido ${created.orderId} enviado. Total ${money(quote.total)}.`, {
    navigation: { screen: "track", orderId: created.orderId, label: "Acompanhar pedido" },
    clientActions: ctx.cart.map((line) => ({
      type: "remove" as const,
      productId: line.productId,
      optionIds: line.optionIds,
    })),
  });
}

async function commitRepeat(body: Record<string, unknown>, ctx: AssistantContext): Promise<ToolEffect> {
  const orderId = positive(body.orderId);
  if (!ctx.user || !orderId) return empty("Não encontrei o pedido.");
  const order = await db.getOrderForUser(orderId, ctx.user.id);
  if (!order || order.customerId !== ctx.user.id) return empty("Não encontrei esse pedido na sua conta.");
  const items = await db.getOrderItems(order.id);
  if (!items.length) return empty("Esse pedido não tem itens para repetir.");
  let addressId: number | undefined;
  if (order.fulfillmentMode !== "pickup") {
    const addresses = await db.listCustomerAddresses(ctx.user.id);
    addressId = (addresses.find((item) => item.isDefault === 1) ?? addresses[0])?.id;
    if (!addressId) return empty("Cadastre um endereço para repetir a entrega.");
  }
  return commitPlace(
    {
      storeId: order.storeId,
      paymentMethod: "pix",
      fulfillmentMode: order.fulfillmentMode,
      addressId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        optionIds: [],
        note: item.note ?? undefined,
      })),
    },
    ctx,
  );
}
