import "dotenv/config";
import * as db from "../server/db";
import { DEV_PERSONAS } from "../server/_core/dev-auth";

const STORE = {
  name: "Lanchonete da Vila",
  phone: "(11) 99999-0000",
  address: "Rua das Flores, 120 - Centro, São Paulo/SP",
  pixKey: "lojista@pediu.local",
  deliveryFee: "5.00",
};

const PRODUCTS = [
  { name: "X-Burger", category: "Lanches", description: "Pão brioche, hambúrguer 150g, queijo e molho da casa.", price: "28.90" },
  { name: "X-Bacon", category: "Lanches", description: "Hambúrguer 150g, bacon crocante, queijo e cebola caramelizada.", price: "32.50" },
  { name: "Batata frita", category: "Lanches", description: "Porção individual com sal e páprica.", price: "14.00" },
  { name: "Brigadeiro gourmet (6 un.)", category: "Doces", description: "Caixa com seis brigadeiros de chocolate belga.", price: "18.00" },
  { name: "Bolo de pote", category: "Doces", description: "Massa de chocolate com recheio de ninho.", price: "12.00" },
];

const ADDRESS = {
  label: "Casa",
  recipientName: DEV_PERSONAS.customer.name,
  street: "Rua dos Pinheiros",
  number: "450",
  complement: "Apto 12",
  neighborhood: "Pinheiros",
  city: "São Paulo",
  state: "SP",
  postalCode: "05422001",
  isDefault: true,
};

async function requireUser(openId: string) {
  const user = await db.getUserByOpenId(openId);
  if (!user) throw new Error(`Usuário ${openId} não foi persistido`);
  return user;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("O seed de desenvolvimento não pode rodar em produção");
  if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL antes de rodar o seed");

  const { customer, merchant } = DEV_PERSONAS;
  await db.upsertUser({ openId: customer.openId, name: customer.name, email: customer.email, loginMethod: "dev", role: "user" });
  await db.upsertUser({ openId: merchant.openId, name: merchant.name, email: merchant.email, loginMethod: "dev", role: "merchant" });
  const customerUser = await requireUser(customer.openId);
  const merchantUser = await requireUser(merchant.openId);

  const storeId = (await db.getStoreForOwner(merchantUser.id))?.id ?? (await db.createStore({ ...STORE, ownerId: merchantUser.id }));

  const existingProducts = new Set((await db.listProductsForStore(storeId)).map((product) => product.name));
  const missingProducts = PRODUCTS.filter((product) => !existingProducts.has(product.name));
  for (const product of missingProducts) await db.createProduct({ ...product, storeId });

  const hasAddress = (await db.listCustomerAddresses(customerUser.id)).length > 0;
  if (!hasAddress) await db.createCustomerAddress(customerUser.id, ADDRESS);

  console.log(`[seed] cliente #${customerUser.id}, lojista #${merchantUser.id}, loja #${storeId}`);
  console.log(`[seed] ${missingProducts.length} produto(s) criado(s), endereço ${hasAddress ? "já existente" : "criado"}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed] falhou:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
