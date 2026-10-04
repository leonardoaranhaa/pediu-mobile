import "dotenv/config";
import * as db from "../server/db";

const STORE = {
  name: "Lanchonete da Vila",
  phone: "(11) 99999-0000",
  address: "Rua das Flores, 120 - Centro, São Paulo/SP",
  pixKey: "revisao@pediu.local",
  deliveryFee: "5.00",
  deliveryEnabled: 1,
  pickupEnabled: 1,
  deliveryRadiusKm: "12.00",
  latitude: "-23.5505200",
  longitude: "-46.6333080",
};

const PRODUCTS = [
  { name: "X-Burger", category: "Lanches", description: "Pão brioche, hambúrguer 150g, queijo e molho da casa.", price: "28.90" },
  { name: "X-Bacon", category: "Lanches", description: "Hambúrguer 150g, bacon crocante, queijo e cebola caramelizada.", price: "32.50" },
  { name: "Batata frita", category: "Lanches", description: "Porção individual com sal e páprica.", price: "14.00" },
  { name: "Brigadeiro gourmet (6 un.)", category: "Doces", description: "Caixa com seis brigadeiros de chocolate belga.", price: "18.00" },
  { name: "Bolo de pote", category: "Doces", description: "Massa de chocolate com recheio de ninho.", price: "12.00" },
];

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório para semear as contas de revisão`);
  if (value.startsWith("dev-")) throw new Error(`${name} não pode usar o prefixo do login de desenvolvimento`);
  return value;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL antes de rodar o seed de revisão");
  const customerOpenId = required("REVIEW_CUSTOMER_OPEN_ID");
  const merchantOpenId = required("REVIEW_MERCHANT_OPEN_ID");
  if (customerOpenId === merchantOpenId) throw new Error("As contas de revisão precisam de identificadores diferentes");

  await db.upsertUser({
    openId: customerOpenId,
    name: process.env.REVIEW_CUSTOMER_NAME?.trim() || "Cliente de revisão",
    email: process.env.REVIEW_CUSTOMER_EMAIL?.trim() || null,
    loginMethod: "review",
    role: "user",
  });
  await db.upsertUser({
    openId: merchantOpenId,
    name: process.env.REVIEW_MERCHANT_NAME?.trim() || "Lojista de revisão",
    email: process.env.REVIEW_MERCHANT_EMAIL?.trim() || null,
    loginMethod: "review",
    role: "merchant",
  });
  const customer = await db.getUserByOpenId(customerOpenId);
  const merchant = await db.getUserByOpenId(merchantOpenId);
  if (!customer || !merchant) throw new Error("Não foi possível gravar as contas de revisão");
  if (customer.deletedAt || merchant.deletedAt) throw new Error("Uma conta de revisão está encerrada. Use outro identificador.");

  const storeId = (await db.getStoreForOwner(merchant.id))?.id ?? (await db.createStore({ ...STORE, ownerId: merchant.id }));
  await db.updateStoreForOwner(merchant.id, STORE);
  const existingProducts = new Set((await db.listProductsForStore(storeId)).map((product) => product.name));
  const missingProducts = PRODUCTS.filter((product) => !existingProducts.has(product.name));
  for (const product of missingProducts) await db.createProduct({ ...product, storeId });

  const hasAddress = (await db.listCustomerAddresses(customer.id)).length > 0;
  if (!hasAddress) {
    await db.createCustomerAddress(customer.id, {
      label: "Casa",
      recipientName: customer.name ?? "Cliente de revisão",
      street: "Rua das Acácias",
      number: "45",
      neighborhood: "Jardim",
      city: "São Paulo",
      state: "SP",
      postalCode: "01001000",
      latitude: "-23.5489000",
      longitude: "-46.6388000",
      isDefault: true,
    });
  }

  console.log(`Contas de revisão prontas. Cliente ${customer.id}, lojista ${merchant.id}, loja ${storeId}.`);
  console.log("As credenciais de acesso ficam nas notas da App Store e no acesso de teste da Play. Elas não entram no aplicativo.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
