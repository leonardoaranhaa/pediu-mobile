import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";

const COLORS = {
  coral: "#FF5A4F",
  coralSoft: "#FFF0EC",
  orange: "#FF8A3D",
  ink: "#163B48",
  text: "#18252B",
  muted: "#7C8A8F",
  canvas: "#FFF8F1",
  white: "#FFFFFF",
  line: "#F0E9E3",
  green: "#36B878",
  yellow: "#FFD166",
};

type Product = {
  id: number;
  name: string;
  store: string;
  price: string;
  distance: string;
  category: string;
  emoji: string;
  available: boolean;
};

type OrderStatus = "Pendente" | "Preparando" | "A caminho" | "Entregue";

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Cupcake de Chocolate Belga",
    store: "Doce Encanto Bakery",
    price: "R$ 12,00",
    distance: "500 m",
    category: "Doces",
    emoji: "🧁",
    available: true,
  },
  {
    id: 2,
    name: "Combo X-Bacon",
    store: "Hamburgueria do Zé",
    price: "R$ 35,00",
    distance: "1,2 km",
    category: "Lanches",
    emoji: "🍔",
    available: true,
  },
  {
    id: 3,
    name: "Bolo de Pote",
    store: "Cozinha da Maria",
    price: "R$ 15,00",
    distance: "800 m",
    category: "Doces",
    emoji: "🍰",
    available: true,
  },
];

const CATEGORIES = [
  { label: "Tudo", icon: "✨" },
  { label: "Doces", icon: "🍰" },
  { label: "Lanches", icon: "🍔" },
  { label: "Serviços", icon: "🛠️" },
];

export default function HomeScreen() {
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [customerTab, setCustomerTab] = useState<"discover" | "orders" | "profile">("discover");
  const [sellerTab, setSellerTab] = useState<"home" | "orders" | "catalog" | "settings">("home");
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [category, setCategory] = useState("Tudo");
  const [cart, setCart] = useState<Product[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [notice, setNotice] = useState("");

  const filteredProducts = useMemo(
    () => products.filter((product) => category === "Tudo" || product.category === category),
    [category, products],
  );

  const notify = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2400);
  };

  const addToCart = (product: Product) => {
    setCart((current) => [...current, product]);
    setSelectedProduct(null);
    notify("Adicionado ao seu pedido");
  };

  const placeOrder = () => {
    if (!cart.length) return;
    setOrderStatus("Pendente");
    setCart([]);
    setShowCart(false);
    setCustomerTab("orders");
    notify("Pedido enviado para a loja");
  };

  const advanceOrder = () => {
    if (orderStatus === "Pendente") setOrderStatus("Preparando");
    if (orderStatus === "Preparando") setOrderStatus("A caminho");
    if (orderStatus === "A caminho") setOrderStatus("Entregue");
    notify(orderStatus === "A caminho" ? "Pedido entregue" : "Status atualizado");
  };

  const addProduct = () => {
    if (!newProductName.trim()) return;
    setProducts((current) => [
      ...current,
      {
        id: Date.now(),
        name: newProductName.trim(),
        store: "Doce Encanto Bakery",
        price: "R$ 18,00",
        distance: "500 m",
        category: "Doces",
        emoji: "🍮",
        available: true,
      },
    ]);
    setNewProductName("");
    setShowAddProduct(false);
    notify("Produto adicionado ao catálogo");
  };

  return (
    <ScreenContainer containerClassName="bg-[#FFF8F1]" edges={["top", "left", "right"]}>
      <View style={styles.appShell}>
        {role === "customer" ? (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {customerTab === "discover" && (
                <CustomerDiscover
                  products={filteredProducts}
                  category={category}
                  setCategory={setCategory}
                  onProductPress={setSelectedProduct}
                  cartCount={cart.length}
                  onCartPress={() => setShowCart(true)}
                  onAssistant={() => notify("Pode falar: o que você quer pedir?")}
                  onOrders={() => setCustomerTab("orders")}
                />
              )}
              {customerTab === "orders" && (
                <CustomerOrders orderStatus={orderStatus} onAdvance={advanceOrder} onDiscover={() => setCustomerTab("discover")} />
              )}
              {customerTab === "profile" && (
                <CustomerProfile onSellerMode={() => { setRole("seller"); setSellerTab("home"); }} />
              )}
            </ScrollView>
            <CustomerNav active={customerTab} onChange={setCustomerTab} />
          </>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {sellerTab === "home" && <SellerHome onCatalog={() => setSellerTab("catalog")} onOrders={() => setSellerTab("orders")} onNotice={notify} />}
              {sellerTab === "orders" && <SellerOrders orderStatus={orderStatus} onAdvance={advanceOrder} onNotice={notify} />}
              {sellerTab === "catalog" && <SellerCatalog products={products} onAdd={() => setShowAddProduct(true)} onToggle={(id) => setProducts((current) => current.map((product) => product.id === id ? { ...product, available: !product.available } : product))} />}
              {sellerTab === "settings" && <SellerSettings onCustomerMode={() => { setRole("customer"); setCustomerTab("discover"); }} />}
            </ScrollView>
            <SellerNav active={sellerTab} onChange={setSellerTab} />
          </>
        )}

        {notice ? <View style={styles.toast}><MaterialIcons name="check-circle" size={18} color={COLORS.white} /><Text style={styles.toastText}>{notice}</Text></View> : null}

        <Modal visible={!!selectedProduct} transparent animationType="slide" onRequestClose={() => setSelectedProduct(null)}>
          {selectedProduct ? <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={() => addToCart(selectedProduct)} /> : null}
        </Modal>

        <Modal visible={showCart} transparent animationType="slide" onRequestClose={() => setShowCart(false)}>
          <View style={styles.modalBackdrop}><View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Seu pedido</Text>
            {cart.length ? cart.map((item, index) => <View style={styles.cartRow} key={`${item.id}-${index}`}><Text style={styles.cartEmoji}>{item.emoji}</Text><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.muted}>{item.store}</Text></View><Text style={styles.price}>{item.price}</Text></View>) : <Text style={styles.emptyText}>Seu pedido está vazio.</Text>}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Total estimado</Text><Text style={styles.totalValue}>{cart.length ? "R$ 12,00" : "R$ 0,00"}</Text></View>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, !cart.length && styles.disabledButton]} disabled={!cart.length} onPress={placeOrder}><Text style={styles.primaryButtonText}>Fazer pedido</Text><MaterialIcons name="arrow-forward" size={18} color={COLORS.white} /></Pressable>
            <Pressable style={styles.textButton} onPress={() => setShowCart(false)}><Text style={styles.textButtonLabel}>Continuar escolhendo</Text></Pressable>
          </View></View>
        </Modal>

        <Modal visible={showAddProduct} transparent animationType="slide" onRequestClose={() => setShowAddProduct(false)}>
          <View style={styles.modalBackdrop}><View style={styles.sheet}>
            <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Novo produto</Text><Text style={styles.fieldLabel}>NOME DO PRODUTO</Text><TextInput value={newProductName} onChangeText={setNewProductName} placeholder="Ex.: Torta de morango" placeholderTextColor={COLORS.muted} style={styles.input} /><Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={addProduct}><Text style={styles.primaryButtonText}>Adicionar ao catálogo</Text></Pressable><Pressable style={styles.textButton} onPress={() => setShowAddProduct(false)}><Text style={styles.textButtonLabel}>Cancelar</Text></Pressable>
          </View></View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <View style={[styles.brandMark, small && styles.brandMarkSmall]}><Text style={[styles.brandMarkText, small && styles.brandMarkTextSmall]}>p</Text></View>;
}

function CustomerDiscover({ products, category, setCategory, onProductPress, cartCount, onCartPress, onAssistant, onOrders }: { products: Product[]; category: string; setCategory: (value: string) => void; onProductPress: (product: Product) => void; cartCount: number; onCartPress: () => void; onAssistant: () => void; onOrders: () => void }) {
  return <>
    <View style={styles.topBar}><View style={styles.brandRow}><BrandMark small /><Text style={styles.brandName}>Pediu</Text></View><View style={styles.topActions}><Pressable style={styles.iconButton} onPress={onCartPress}><MaterialIcons name="shopping-bag" size={21} color={COLORS.ink} />{cartCount ? <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View> : null}</Pressable><Pressable style={styles.iconButton} onPress={onOrders}><MaterialIcons name="receipt-long" size={21} color={COLORS.ink} /></Pressable></View></View>
    <View style={styles.greetingRow}><View><Text style={styles.eyebrow}>PERTO DE VOCÊ</Text><Text style={styles.pageTitle}>Oi, Ana!</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View></View>
    <Pressable style={({ pressed }) => [styles.voiceCard, pressed && styles.pressed]} onPress={onAssistant}><View style={styles.voiceIcon}><MaterialIcons name="mic" size={22} color={COLORS.white} /></View><View style={{ flex: 1 }}><Text style={styles.voiceTitle}>O que você quer pedir hoje?</Text><Text style={styles.voiceSub}>Fale ou digite. A gente encontra perto.</Text></View><MaterialIcons name="arrow-forward" size={20} color={COLORS.ink} /></Pressable>
    <View style={styles.searchBox}><MaterialIcons name="search" size={21} color={COLORS.muted} /><TextInput placeholder="Buscar comida, produtos ou serviços" placeholderTextColor={COLORS.muted} style={styles.searchInput} /></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Categorias</Text><Text style={styles.link}>Ver tudo</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{CATEGORIES.map((item) => <Pressable key={item.label} style={[styles.categoryChip, category === item.label && styles.categoryChipActive]} onPress={() => setCategory(item.label)}><Text style={styles.categoryIcon}>{item.icon}</Text><Text style={[styles.categoryLabel, category === item.label && styles.categoryLabelActive]}>{item.label}</Text></Pressable>)}</ScrollView>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Boas opções para pedir agora</Text><Text style={styles.link}>Ver tudo</Text></View>
    {products.map((product) => <Pressable key={product.id} style={({ pressed }) => [styles.productCard, pressed && styles.cardPressed]} onPress={() => onProductPress(product)}><View style={styles.productImage}><Text style={styles.productEmoji}>{product.emoji}</Text><View style={styles.availablePill}><View style={styles.dot} /><Text style={styles.availableText}>DISPONÍVEL</Text></View></View><View style={styles.productInfo}><View style={{ flex: 1 }}><View style={styles.ratingRow}><Text style={styles.rating}>★ 4,9</Text><Text style={styles.distance}>{product.distance}</Text></View><Text style={styles.productName}>{product.name}</Text><Text style={styles.storeName}>{product.store}</Text></View><Text style={styles.productPrice}>{product.price}</Text></View><View style={styles.productFooter}><Text style={styles.localText}>Recomendado por quem está perto de você</Text><View style={styles.arrowCircle}><MaterialIcons name="arrow-forward" size={17} color={COLORS.white} /></View></View></Pressable>)}
    <View style={styles.promiseCard}><MaterialIcons name="favorite" size={20} color={COLORS.coral} /><View style={{ flex: 1 }}><Text style={styles.promiseTitle}>Compre de quem está perto</Text><Text style={styles.promiseText}>Apoiamos o comércio local e entregamos com cuidado.</Text></View></View>
  </>;
}

function ProductModal({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: () => void }) {
  return <View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.modalProductImage}><Text style={styles.modalEmoji}>{product.emoji}</Text></View><Text style={styles.eyebrow}>{product.store.toUpperCase()}</Text><Text style={styles.sheetTitle}>{product.name}</Text><Text style={styles.muted}>A 500 m · disponível agora</Text><Text style={styles.modalDescription}>Uma opção deliciosa e feita com carinho por quem vende perto de você.</Text><View style={styles.totalRow}><Text style={styles.totalLabel}>Preço</Text><Text style={styles.totalValue}>{product.price}</Text></View><Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onAdd}><Text style={styles.primaryButtonText}>Adicionar ao pedido</Text><MaterialIcons name="add" size={19} color={COLORS.white} /></Pressable><Pressable style={styles.textButton} onPress={onClose}><Text style={styles.textButtonLabel}>Voltar</Text></Pressable></View></View>;
}

function CustomerOrders({ orderStatus, onAdvance, onDiscover }: { orderStatus: OrderStatus | null; onAdvance: () => void; onDiscover: () => void }) {
  return <><View style={styles.simpleHeader}><Text style={styles.pageTitle}>Meus pedidos</Text><View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View></View>{orderStatus ? <View style={styles.orderCard}><View style={styles.orderTop}><View><Text style={styles.eyebrow}>PEDIDO #4902 · HOJE</Text><Text style={styles.orderStore}>Doce Encanto Bakery</Text></View><View style={styles.statusPill}><Text style={styles.statusPillText}>{orderStatus.toUpperCase()}</Text></View></View><View style={styles.orderItem}><Text style={styles.cartEmoji}>🧁</Text><Text style={styles.cardTitle}>1x Cupcake de Chocolate</Text><Text style={styles.price}>R$ 12,00</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: orderStatus === "Pendente" ? "25%" : orderStatus === "Preparando" ? "50%" : orderStatus === "A caminho" ? "78%" : "100%" }]} /></View><View style={styles.progressLabels}><Text>Pendente</Text><Text>Preparando</Text><Text>A caminho</Text><Text>Entregue</Text></View><Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onAdvance}><Text style={styles.primaryButtonText}>{orderStatus === "Entregue" ? "Pedir de novo" : "Acompanhar pedido"}</Text><MaterialIcons name="arrow-forward" size={18} color={COLORS.white} /></Pressable></View> : <View style={styles.emptyState}><Text style={styles.emptyIllustration}>🛍️</Text><Text style={styles.emptyTitle}>Você ainda não fez um pedido</Text><Text style={styles.emptyText}>Encontre algo gostoso perto de você e peça em poucos toques.</Text><Pressable style={styles.primaryButton} onPress={onDiscover}><Text style={styles.primaryButtonText}>Explorar agora</Text></Pressable></View>}<Text style={styles.sectionTitle}>Histórico recente</Text><View style={styles.historyRow}><View style={styles.historyIcon}><Text>🍔</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Hamburgueria do Zé</Text><Text style={styles.muted}>15 mai · entregue</Text></View><Text style={styles.price}>R$ 45,90</Text></View></>;
}

function CustomerProfile({ onSellerMode }: { onSellerMode: () => void }) {
  return <><View style={styles.simpleHeader}><View><Text style={styles.eyebrow}>SUA CONTA</Text><Text style={styles.pageTitle}>Perfil</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View></View><View style={styles.profileCard}><View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>A</Text></View><Text style={styles.profileName}>Ana Beatriz</Text><Text style={styles.muted}>ana.beatriz@email.com</Text></View>{["Dados pessoais", "Meus endereços", "Pagamentos", "Notificações", "Segurança"].map((item) => <View style={styles.settingsRow} key={item}><View style={styles.settingsIcon}><MaterialIcons name={item === "Pagamentos" ? "credit-card" : item === "Meus endereços" ? "location-on" : item === "Notificações" ? "notifications" : "person"} size={20} color={COLORS.ink} /></View><Text style={styles.cardTitle}>{item}</Text><MaterialIcons name="chevron-right" size={20} color={COLORS.muted} /></View>)}<View style={styles.sellerInvite}><Text style={styles.sellerInviteTitle}>Você também vende?</Text><Text style={styles.sellerInviteText}>Crie sua vitrine e comece a vender para sua comunidade.</Text><Pressable style={styles.outlineButton} onPress={onSellerMode}><Text style={styles.outlineButtonText}>Abrir modo vendedor</Text></Pressable></View></>;
}

function SellerHome({ onCatalog, onOrders, onNotice }: { onCatalog: () => void; onOrders: () => void; onNotice: (message: string) => void }) {
  return <><View style={styles.sellerHeader}><View><Text style={styles.eyebrowLight}>PAINEL DA LOJA</Text><Text style={styles.sellerTitle}>Doce Encanto Bakery</Text><Text style={styles.sellerSubtitle}>Bom dia, Helena. Tudo pronto?</Text></View><BrandMark /></View><View style={styles.statGrid}><View style={styles.statCard}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>pedidos novos</Text><MaterialIcons name="receipt-long" size={22} color={COLORS.coral} /></View><View style={styles.statCard}><Text style={styles.statNumber}>R$ 420</Text><Text style={styles.statLabel}>a receber</Text><MaterialIcons name="trending-up" size={22} color={COLORS.green} /></View></View><View style={styles.aiSellerCard}><View style={styles.aiIcon}><MaterialIcons name="mic" size={21} color={COLORS.white} /></View><View style={{ flex: 1 }}><Text style={styles.aiTitle}>Fale com o Pediu</Text><Text style={styles.aiText}>“Vendi um café para o João” ou “Quem me deve?”</Text></View><Pressable style={styles.smallLightButton} onPress={() => onNotice("Assistente ouvindo...")}><Text style={styles.smallLightButtonText}>Falar</Text></Pressable></View><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Atalhos</Text></View><View style={styles.shortcutGrid}><Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]} onPress={onCatalog}><MaterialIcons name="inventory-2" size={24} color={COLORS.coral} /><Text style={styles.shortcutTitle}>Catálogo</Text><Text style={styles.shortcutSub}>3 produtos ativos</Text></Pressable><Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]} onPress={onOrders}><MaterialIcons name="local-shipping" size={24} color={COLORS.orange} /><Text style={styles.shortcutTitle}>Pedidos</Text><Text style={styles.shortcutSub}>1 aguardando ação</Text></Pressable><Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]} onPress={() => onNotice("Divulgação pronta para compartilhar") }><MaterialIcons name="campaign" size={24} color={COLORS.ink} /><Text style={styles.shortcutTitle}>Divulgar</Text><Text style={styles.shortcutSub}>Criar com IA</Text></Pressable><Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]} onPress={() => onNotice("Você tem R$ 420,00 em vendas fiadas") }><MaterialIcons name="people" size={24} color={COLORS.green} /><Text style={styles.shortcutTitle}>Clientes</Text><Text style={styles.shortcutSub}>48 cadastrados</Text></Pressable></View><View style={styles.tipCard}><MaterialIcons name="lightbulb" size={22} color={COLORS.orange} /><View style={{ flex: 1 }}><Text style={styles.tipTitle}>Dica do Pediu</Text><Text style={styles.tipText}>Uma boa foto e uma descrição curta ajudam seu produto a vender mais.</Text></View></View></>;
}

function SellerOrders({ orderStatus, onAdvance, onNotice }: { orderStatus: OrderStatus | null; onAdvance: () => void; onNotice: (message: string) => void }) {
  return <><View style={styles.simpleHeader}><View><Text style={styles.eyebrow}>GESTÃO DA LOJA</Text><Text style={styles.pageTitle}>Pedidos</Text></View><View style={styles.statusPill}><Text style={styles.statusPillText}>12 HOJE</Text></View></View><View style={styles.filterRow}>{["Todos (12)", "Pendentes (4)", "Preparando (3)"].map((item, index) => <View style={[styles.filterChip, index === 0 && styles.filterChipActive]} key={item}><Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>{item}</Text></View>)}</View><View style={styles.sellerOrderCard}><View style={styles.orderTop}><View><Text style={styles.eyebrow}>PENDENTE · #4902</Text><Text style={styles.orderStore}>Maria Oliveira</Text></View><Text style={styles.price}>R$ 68,50</Text></View><Text style={styles.muted}>2x Hambúrguer Artesanal · 1x Coca-Cola</Text><View style={styles.orderActions}><Pressable style={styles.outlineButtonSmall} onPress={() => onAdvance()}><Text style={styles.outlineButtonText}>Aceitar pedido</Text></Pressable><Pressable style={styles.rejectButton} onPress={() => onNotice("Pedido recusado") }><Text style={styles.rejectText}>Recusar</Text></Pressable></View></View><View style={styles.sellerOrderCard}><View style={styles.orderTop}><View><Text style={styles.eyebrow}>PREPARANDO · #4899</Text><Text style={styles.orderStore}>João Silva</Text></View><Text style={styles.price}>R$ 54,00</Text></View><Text style={styles.muted}>1x Pizza Família · Pago via PIX</Text><View style={styles.orderActions}><Pressable style={({ pressed }) => [styles.primaryButtonSmall, pressed && styles.pressed]} onPress={() => onAdvance()}><Text style={styles.primaryButtonText}>{orderStatus === "A caminho" ? "Finalizar" : "Chamar entrega"}</Text></Pressable></View></View></>;
}

function SellerCatalog({ products, onAdd, onToggle }: { products: Product[]; onAdd: () => void; onToggle: (id: number) => void }) {
  return <><View style={styles.simpleHeader}><View><Text style={styles.eyebrow}>SUA VITRINE</Text><Text style={styles.pageTitle}>Catálogo</Text></View><Pressable style={styles.addCircle} onPress={onAdd}><MaterialIcons name="add" size={24} color={COLORS.white} /></Pressable></View><Text style={styles.muted}>Deixe seus produtos prontos para o próximo pedido.</Text>{products.map((product) => <View style={styles.catalogRow} key={product.id}><View style={styles.catalogEmoji}><Text>{product.emoji}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.muted}>{product.category} · {product.price}</Text></View><Pressable style={[styles.stockSwitch, product.available && styles.stockSwitchOn]} onPress={() => onToggle(product.id)}><View style={[styles.stockKnob, product.available && styles.stockKnobOn]} /></Pressable></View>)}<View style={styles.publishCard}><MaterialIcons name="campaign" size={22} color={COLORS.coral} /><View style={{ flex: 1 }}><Text style={styles.tipTitle}>Divulgue seu catálogo</Text><Text style={styles.tipText}>Crie uma oferta com IA para compartilhar no WhatsApp.</Text></View><MaterialIcons name="chevron-right" size={22} color={COLORS.coral} /></View></>;
}

function SellerSettings({ onCustomerMode }: { onCustomerMode: () => void }) {
  return <><View style={styles.simpleHeader}><View><Text style={styles.eyebrow}>CONFIGURAÇÕES</Text><Text style={styles.pageTitle}>Sua loja</Text></View><Text style={styles.link}>Salvar</Text></View><View style={styles.fieldCard}><Text style={styles.fieldLabel}>NOME DO NEGÓCIO</Text><Text style={styles.fieldValue}>Doce Encanto Bakery</Text><Text style={styles.fieldLabel}>WHATSAPP / TELEFONE</Text><Text style={styles.fieldValue}>+55 11 98765-4321</Text></View>{["Chave PIX", "Lembretes de fiado", "Taxa de entrega", "Local de retirada", "Modo mãos livres"].map((item) => <View style={styles.settingsRow} key={item}><View style={styles.settingsIcon}><MaterialIcons name={item === "Chave PIX" ? "pix" : item === "Taxa de entrega" ? "two-wheeler" : item === "Local de retirada" ? "location-on" : item === "Modo mãos livres" ? "mic" : "notifications"} size={20} color={COLORS.ink} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item}</Text><Text style={styles.muted}>{item === "Taxa de entrega" ? "R$ 5,00" : "Configurar"}</Text></View><MaterialIcons name="chevron-right" size={20} color={COLORS.muted} /></View>)}<Pressable style={styles.outlineButton} onPress={onCustomerMode}><Text style={styles.outlineButtonText}>Voltar para modo cliente</Text></Pressable></>;
}

function CustomerNav({ active, onChange }: { active: string; onChange: (value: "discover" | "orders" | "profile") => void }) {
  return <View style={styles.bottomNav}>{[["discover", "explore", "Descobrir"], ["orders", "receipt-long", "Pedidos"], ["profile", "person", "Perfil"]].map(([key, icon, label]) => <Pressable key={key} style={styles.navItem} onPress={() => onChange(key as "discover" | "orders" | "profile")}><MaterialIcons name={icon as any} size={22} color={active === key ? COLORS.coral : COLORS.muted} /><Text style={[styles.navLabel, active === key && styles.navLabelActive]}>{label}</Text></Pressable>)}</View>;
}

function SellerNav({ active, onChange }: { active: string; onChange: (value: "home" | "orders" | "catalog" | "settings") => void }) {
  return <View style={styles.bottomNav}>{[["home", "home", "Início"], ["orders", "receipt-long", "Pedidos"], ["catalog", "inventory-2", "Catálogo"], ["settings", "tune", "Ajustes"]].map(([key, icon, label]) => <Pressable key={key} style={styles.navItem} onPress={() => onChange(key as "home" | "orders" | "catalog" | "settings")}><MaterialIcons name={icon as any} size={22} color={active === key ? COLORS.coral : COLORS.muted} /><Text style={[styles.navLabel, active === key && styles.navLabelActive]}>{label}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: COLORS.canvas }, scrollContent: { padding: 20, paddingBottom: 108, gap: 16 }, topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, brandRow: { flexDirection: "row", alignItems: "center", gap: 9 }, brandName: { color: COLORS.ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.7 }, brandMark: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }, brandMarkSmall: { width: 30, height: 30, borderRadius: 10 }, brandMarkText: { color: COLORS.white, fontSize: 37, fontWeight: "900", fontStyle: "italic", lineHeight: 42 }, brandMarkTextSmall: { fontSize: 24, lineHeight: 28 }, topActions: { flexDirection: "row", gap: 8 }, iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.line }, badge: { position: "absolute", right: 1, top: 0, backgroundColor: COLORS.orange, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" }, badgeText: { color: COLORS.white, fontSize: 10, fontWeight: "800" }, greetingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eyebrow: { color: COLORS.coral, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 }, pageTitle: { color: COLORS.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.8, marginTop: 2 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.yellow, alignItems: "center", justifyContent: "center" }, avatarText: { color: COLORS.ink, fontSize: 16, fontWeight: "800" }, voiceCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.coralSoft, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: "#FFD8CE" }, voiceIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" }, voiceTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "800" }, voiceSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 }, searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 16, paddingHorizontal: 14, height: 52, borderWidth: 1, borderColor: COLORS.line }, searchInput: { flex: 1, color: COLORS.text, fontSize: 13, marginLeft: 8 }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }, sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "800" }, link: { color: COLORS.coral, fontSize: 12, fontWeight: "800" }, categoryRow: { gap: 10, paddingVertical: 2 }, categoryChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line }, categoryChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink }, categoryIcon: { fontSize: 16 }, categoryLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700" }, categoryLabelActive: { color: COLORS.white }, productCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 12, borderWidth: 1, borderColor: COLORS.line, shadowColor: "#1A2730", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, productImage: { height: 142, borderRadius: 18, backgroundColor: "#FFF0D7", alignItems: "center", justifyContent: "center", position: "relative" }, productEmoji: { fontSize: 64 }, availablePill: { position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.white }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green }, availableText: { color: COLORS.green, fontSize: 9, fontWeight: "800" }, productInfo: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 12 }, ratingRow: { flexDirection: "row", gap: 8, alignItems: "center" }, rating: { color: COLORS.orange, fontSize: 11, fontWeight: "800" }, distance: { color: COLORS.muted, fontSize: 11 }, productName: { color: COLORS.ink, fontSize: 16, fontWeight: "800", marginTop: 5 }, storeName: { color: COLORS.muted, fontSize: 12, marginTop: 2 }, productPrice: { color: COLORS.ink, fontSize: 17, fontWeight: "900" }, productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line }, localText: { color: COLORS.muted, fontSize: 10, flex: 1 }, arrowCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" }, promiseCard: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#FFF0EC", padding: 15, borderRadius: 18 }, promiseTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, promiseText: { color: COLORS.muted, fontSize: 11, marginTop: 3 }, bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 76, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.line, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 8 }, navItem: { alignItems: "center", justifyContent: "center", gap: 4, minWidth: 72 }, navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700" }, navLabelActive: { color: COLORS.coral }, modalBackdrop: { flex: 1, backgroundColor: "rgba(18, 38, 44, 0.36)", justifyContent: "flex-end" }, sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 30, gap: 13 }, sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 3 }, sheetTitle: { color: COLORS.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }, cartRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }, cartEmoji: { fontSize: 28 }, cardTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" }, muted: { color: COLORS.muted, fontSize: 12, marginTop: 3 }, price: { color: COLORS.ink, fontSize: 14, fontWeight: "900" }, totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14, marginTop: 5 }, totalLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "700" }, totalValue: { color: COLORS.ink, fontSize: 20, fontWeight: "900" }, primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: COLORS.coral, borderRadius: 16, height: 52, paddingHorizontal: 16 }, primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "800" }, textButton: { alignItems: "center", padding: 6 }, textButtonLabel: { color: COLORS.coral, fontWeight: "800", fontSize: 13 }, disabledButton: { opacity: 0.45 }, pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 }, cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] }, emptyText: { color: COLORS.muted, fontSize: 13, textAlign: "center", lineHeight: 20 }, modalProductImage: { height: 150, borderRadius: 20, backgroundColor: "#FFF0D7", alignItems: "center", justifyContent: "center" }, modalEmoji: { fontSize: 78 }, modalDescription: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginVertical: 2 }, simpleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }, orderCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: COLORS.line, gap: 13 }, orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, orderStore: { color: COLORS.ink, fontSize: 17, fontWeight: "800", marginTop: 4 }, statusPill: { backgroundColor: "#FFF0D7", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }, statusPillText: { color: COLORS.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 }, orderItem: { flexDirection: "row", alignItems: "center", gap: 9 }, progressTrack: { height: 8, backgroundColor: COLORS.line, borderRadius: 4, overflow: "hidden" }, progressFill: { height: 8, backgroundColor: COLORS.green, borderRadius: 4 }, progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -5 }, progressLabelsText: { color: COLORS.muted, fontSize: 9 }, emptyState: { backgroundColor: COLORS.white, borderRadius: 24, padding: 25, alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.line }, emptyIllustration: { fontSize: 58 }, emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "800", textAlign: "center" }, historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line }, historyIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFF0D7", alignItems: "center", justifyContent: "center" }, profileCard: { backgroundColor: COLORS.ink, borderRadius: 24, padding: 20, alignItems: "center", gap: 6 }, avatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.yellow, alignItems: "center", justifyContent: "center", marginBottom: 4 }, avatarLargeText: { fontSize: 25, fontWeight: "900", color: COLORS.ink }, profileName: { color: COLORS.white, fontSize: 18, fontWeight: "800" }, settingsRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.white, padding: 14, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line }, settingsIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.coralSoft, alignItems: "center", justifyContent: "center" }, sellerInvite: { backgroundColor: "#FFF0D7", borderRadius: 20, padding: 16, gap: 7 }, sellerInviteTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800" }, sellerInviteText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 }, outlineButton: { borderWidth: 1.5, borderColor: COLORS.coral, borderRadius: 14, height: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 15, alignSelf: "flex-start", marginTop: 6 }, outlineButtonText: { color: COLORS.coral, fontSize: 12, fontWeight: "800" }, sellerHeader: { backgroundColor: COLORS.ink, borderRadius: 24, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eyebrowLight: { color: COLORS.yellow, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }, sellerTitle: { color: COLORS.white, fontSize: 23, fontWeight: "800", marginTop: 4 }, sellerSubtitle: { color: "#BCD0D1", fontSize: 12, marginTop: 3 }, statGrid: { flexDirection: "row", gap: 12 }, statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line, gap: 7 }, statNumber: { color: COLORS.ink, fontSize: 22, fontWeight: "900" }, statLabel: { color: COLORS.muted, fontSize: 11, flex: 1 }, aiSellerCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.coral, borderRadius: 20, padding: 14 }, aiIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }, aiTitle: { color: COLORS.white, fontSize: 14, fontWeight: "800" }, aiText: { color: "#FFE1DA", fontSize: 11, lineHeight: 16, marginTop: 3 }, smallLightButton: { backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, smallLightButtonText: { color: COLORS.coral, fontSize: 12, fontWeight: "800" }, shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, shortcut: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18, padding: 14, width: "48%", minHeight: 108, gap: 7 }, shortcutTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" }, shortcutSub: { color: COLORS.muted, fontSize: 11 }, tipCard: { flexDirection: "row", gap: 11, alignItems: "center", backgroundColor: "#FFF0D7", padding: 15, borderRadius: 18 }, tipTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, tipText: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, filterRow: { flexDirection: "row", gap: 8, marginBottom: 2 }, filterChip: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12 }, filterChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink }, filterText: { color: COLORS.muted, fontSize: 10, fontWeight: "700" }, filterTextActive: { color: COLORS.white }, sellerOrderCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: COLORS.line, gap: 10 }, orderActions: { flexDirection: "row", gap: 8, marginTop: 3 }, outlineButtonSmall: { borderWidth: 1.5, borderColor: COLORS.coral, borderRadius: 12, paddingHorizontal: 12, height: 40, alignItems: "center", justifyContent: "center" }, rejectButton: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 12, height: 40, alignItems: "center", justifyContent: "center" }, rejectText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" }, primaryButtonSmall: { backgroundColor: COLORS.coral, borderRadius: 12, paddingHorizontal: 14, height: 40, alignItems: "center", justifyContent: "center" }, addCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" }, catalogRow: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.white, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line }, catalogEmoji: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFF0D7", alignItems: "center", justifyContent: "center" }, stockSwitch: { width: 42, height: 25, borderRadius: 13, backgroundColor: COLORS.line, justifyContent: "center", padding: 3 }, stockSwitchOn: { backgroundColor: COLORS.green }, stockKnob: { width: 19, height: 19, borderRadius: 10, backgroundColor: COLORS.white }, stockKnobOn: { alignSelf: "flex-end" }, publishCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.coralSoft, padding: 15, borderRadius: 18 }, fieldCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 17, borderWidth: 1, borderColor: COLORS.line, gap: 7 }, fieldLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 2 }, fieldValue: { color: COLORS.ink, fontSize: 15, fontWeight: "700", marginBottom: 9 }, input: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, height: 50, paddingHorizontal: 14, color: COLORS.ink, fontSize: 14, backgroundColor: COLORS.canvas }, toast: { position: "absolute", left: 18, right: 18, bottom: 88, backgroundColor: COLORS.ink, borderRadius: 15, padding: 13, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 }, toastText: { color: COLORS.white, fontSize: 13, fontWeight: "700" },
});
