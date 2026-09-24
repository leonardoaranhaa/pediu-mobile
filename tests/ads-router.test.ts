import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import { generateAdCreative } from "../server/ad-generation";

vi.mock("../server/ad-generation", () => ({
  generateAdCreative: vi.fn(),
}));

const merchant = {
  id: 42,
  openId: "merchant-42",
  name: "Lojista Teste",
  email: "loja@example.com",
  loginMethod: "test",
  role: "merchant" as const,
  lastSignedIn: new Date(),
};

const store = {
  id: 77,
  ownerId: merchant.id,
  name: "Mercado do Bairro",
  phone: null,
  address: "Rua Teste, 42",
  pixKey: "pix@example.com",
  deliveryFee: "5.00",
  isOpen: 1,
  createdAt: new Date(),
};

const product = {
  id: 88,
  storeId: store.id,
  name: "Bolo de cenoura",
  category: "Doces",
  description: "Bolo caseiro com cobertura de chocolate",
  price: "18.00",
  available: 1,
  createdAt: new Date(),
};

const ad = {
  id: 101,
  storeId: store.id,
  productId: product.id,
  status: "draft" as const,
  headline: "Bolo de cenoura com gostinho de casa",
  description: "Uma fatia macia para deixar seu dia mais gostoso.",
  cta: "Pedir agora",
  offerLabel: "10% off no primeiro pedido",
  visualPrompt: "Fotografia comercial de bolo de cenoura caseiro",
  imageKey: null,
  model: "test",
  generationCost: 1,
  createdAt: new Date(),
  publishedAt: null,
  updatedAt: new Date(),
};

const caller = () => appRouter.createCaller({
  user: merchant,
  req: { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } },
} as any);

describe("Pediu ad studio", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generates a creative only for the authenticated store owner", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store);
    vi.spyOn(db, "getProductForStore").mockResolvedValue(product);
    vi.spyOn(db, "createGeneratedAdWithCredit").mockResolvedValue(ad);
    vi.mocked(generateAdCreative).mockResolvedValue({
      headline: ad.headline,
      description: ad.description,
      cta: ad.cta,
      visualPrompt: ad.visualPrompt,
      imageKey: null,
      model: ad.model ?? "test",
      offerLabel: ad.offerLabel,
    });

    const result = await caller().pediu.ads.generate({
      productId: product.id,
      offerLabel: ad.offerLabel ?? undefined,
      audience: "famílias do bairro",
      tone: "caseiro",
    });

    expect(result.id).toBe(ad.id);
    expect(generateAdCreative).toHaveBeenCalledWith(expect.objectContaining({
      storeName: store.name,
      productName: product.name,
      productDescription: product.description,
      tone: "caseiro",
    }));
    expect(db.createGeneratedAdWithCredit).toHaveBeenCalledWith(expect.objectContaining({
      storeId: store.id,
      productId: product.id,
      status: "draft",
      imageKey: null,
    }));
  });

  it("rejects a product that does not belong to the authenticated store", async () => {
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store);
    vi.spyOn(db, "getProductForStore").mockResolvedValue(undefined);

    await expect(caller().pediu.ads.generate({ productId: 999, tone: "premium" })).rejects.toThrow("Produto não pertence à sua loja");
    expect(generateAdCreative).not.toHaveBeenCalled();
  });

  it("publishes and archives only the authenticated owner's ad", async () => {
    const published = { ...ad, status: "published" as const };
    vi.spyOn(db, "getStoreForOwner").mockResolvedValue(store);
    const publish = vi.spyOn(db, "publishGeneratedAd").mockResolvedValue(published);
    const archive = vi.spyOn(db, "archiveGeneratedAd").mockResolvedValue();

    const publishedResult = await caller().pediu.ads.publish({ adId: ad.id });
    const archivedResult = await caller().pediu.ads.archive({ adId: ad.id });

    expect(publishedResult.status).toBe("published");
    expect(archivedResult).toEqual({ success: true });
    expect(publish).toHaveBeenCalledWith(store.id, ad.id);
    expect(archive).toHaveBeenCalledWith(store.id, ad.id);
  });
});
