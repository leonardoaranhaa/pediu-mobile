import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { isOAuthConfigured, startOAuthLogin } from "@/constants/oauth";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { canRegisterSale, cartTotal, formatLocationLabel, pixPaymentLabel } from "@/lib/pediu-mvp";
import { useCart } from "@/providers/cart-provider";

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
  storeId?: number;
  name: string;
  store: string;
  price: string;
  distance: string;
  category: string;
  emoji: string;
  available: boolean;
  deliveryFee?: string;
};

type SavedAddress = {
  id: number;
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: number;
};

function formatSavedAddress(address: SavedAddress) {
  return [`${address.street}, ${address.number}`, address.complement, `${address.neighborhood} · ${address.city}/${address.state}`, address.postalCode].filter(Boolean).join(", ");
}

type OrderStatus = "Pendente" | "Aceito" | "Preparando" | "Pronto" | "A caminho" | "Entregue" | "Cancelado";
type VoiceMode = "customer" | "seller";

const CATEGORIES = [
  { label: "Tudo", icon: "✨" },
  { label: "Doces", icon: "🍰" },
  { label: "Lanches", icon: "🍔" },
  { label: "Serviços", icon: "🛠️" },
];

export default function HomeScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const { items: globalCartItems, itemCount: globalCartCount, addItem: addGlobalItem, clear: clearGlobalCart } = useCart();
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [customerTab, setCustomerTab] = useState<"discover" | "orders" | "profile">("discover");
  const [sellerTab, setSellerTab] = useState<"home" | "orders" | "catalog" | "clients" | "settings">("home");
  useEffect(() => {
    setRole(user?.role === "merchant" ? "seller" : "customer");
  }, [user?.role]);

  const [category, setCategory] = useState("Tudo");
  const marketplaceQuery = trpc.pediu.marketplace.products.useQuery({ category }, { staleTime: 30_000 });
  const storeQuery = trpc.pediu.stores.mine.useQuery(undefined, { enabled: isAuthenticated && role === "seller" });
  const storeProductsQuery = trpc.pediu.products.mine.useQuery(
    { storeId: storeQuery.data?.id ?? 0 },
    { enabled: isAuthenticated && role === "seller" && Boolean(storeQuery.data?.id), refetchInterval: 15_000 },
  );
  const storeOrdersQuery = trpc.pediu.orders.storeMine.useQuery(undefined, { enabled: isAuthenticated && role === "seller", refetchInterval: 10_000 });
  const customerOrdersQuery = trpc.pediu.orders.mine.useQuery(undefined, { enabled: isAuthenticated && role === "customer", refetchInterval: 5_000 });
  const customerAddressesQuery = trpc.pediu.addresses.list.useQuery(undefined, { enabled: isAuthenticated && role === "customer" });
  const updateOrderStatusMutation = trpc.pediu.orders.status.useMutation({
    onSuccess: () => { void storeOrdersQuery.refetch(); void customerOrdersQuery.refetch(); },
    onError: (error) => notify(error.message),
  });
  const clientsQuery = trpc.pediu.clients.mine.useQuery(undefined, { enabled: isAuthenticated && role === "seller" });
  const salesQuery = trpc.pediu.sales.mine.useQuery(undefined, { enabled: isAuthenticated && role === "seller" });
  const notificationsQuery = trpc.pediu.notifications.mine.useQuery(undefined, { enabled: isAuthenticated });
  const createPixMutation = trpc.pediu.payments.createPix.useMutation({
    onError: (error) => notifyWithHaptic(error.message, false),
  });
  const createOrderMutation = trpc.pediu.orders.create.useMutation({
    onSuccess: (result) => {
      if (checkoutPayment === "pix") {
        createPixMutation.mutate({ orderId: result.orderId }, {
          onSuccess: (charge) => {
            clearGlobalCart();
            setShowCheckout(false);
            setShowCart(false);
            setPixPaymentPending(true);
            setCustomerTab("orders");
            void customerOrdersQuery.refetch();
            void notifyWithHaptic("Pedido enviado. PIX aguardando confirmação");
            void scheduleOrderNotification("Seu pedido foi enviado e o PIX está aguardando confirmação.");
            router.push({
              pathname: "/order/track",
              params: {
                orderId: String(result.orderId),
                paymentId: String(charge.paymentId),
                pixUrl: charge.checkoutUrl ?? "",
              },
            });
          },
        });
        return;
      }

      clearGlobalCart();
      setShowCheckout(false);
      setShowCart(false);
      setPixPaymentPending(false);
      setCustomerTab("orders");
      void customerOrdersQuery.refetch();
      void notifyWithHaptic("Pedido enviado para a loja");
      void scheduleOrderNotification("Seu pedido foi enviado e aguarda confirmação da loja.");
      router.push({ pathname: "/order/track", params: { orderId: String(result.orderId) } });
    },
    onError: (error) => notifyWithHaptic(error.message, false),
  });
  const voiceMutation = trpc.pediu.voice.interpret.useMutation();
  const transcribeMutation = trpc.pediu.voice.transcribe.useMutation();
  const createSaleMutation = trpc.pediu.sales.create.useMutation({ onSuccess: () => { setShowSaleModal(false); setSaleTotal(""); setSaleCustomerId(""); void salesQuery.refetch(); notify("Venda registrada com sucesso"); } });
  const addLedgerMutation = trpc.pediu.ledger.add.useMutation();
  const registerPushMutation = trpc.pediu.notifications.register.useMutation();
  const markNotificationMutation = trpc.pediu.notifications.markRead.useMutation({ onSuccess: () => { void notificationsQuery.refetch(); } });
  const createStoreMutation = trpc.pediu.stores.create.useMutation({ onSuccess: () => { setShowSellerOnboarding(false); void storeQuery.refetch(); notify("Sua loja foi criada"); } });
  const createProductMutation = trpc.pediu.products.create.useMutation({
    onSuccess: () => {
      setNewProductName("");
      setNewProductPrice("");
      setNewProductCategory("Doces");
      setShowAddProduct(false);
      void storeProductsQuery.refetch();
      notify("Produto salvo no catálogo");
    },
    onError: (error) => notify(error.message),
  });
  const updateProductAvailabilityMutation = trpc.pediu.products.availability.useMutation({
    onSuccess: () => { void storeProductsQuery.refetch(); },
    onError: (error) => notify(error.message),
  });
  const cart = useMemo<Product[]>(() => globalCartItems.flatMap((item) => Array.from({ length: item.quantity }, () => ({
    id: item.id,
    storeId: item.storeId,
    name: item.name,
    store: item.storeName,
    price: `R$ ${Number(item.price).toFixed(2).replace(".", ",")}`,
    distance: "perto de você",
    category: item.category,
    emoji: item.emoji ?? "🍽️",
    available: true,
    deliveryFee: item.deliveryFee,
  }))), [globalCartItems]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddressId, setDeliveryAddressId] = useState<number | undefined>();
  const [checkoutIdempotencyKey] = useState(() => `legacy-checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const [checkoutPayment, setCheckoutPayment] = useState<"pix" | "card" | "cash">("pix");
  const [showVoice, setShowVoice] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("customer");
  const [voiceReply, setVoiceReply] = useState("");
  const [showSellerOnboarding, setShowSellerOnboarding] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePixKey, setStorePixKey] = useState("");
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleTotal, setSaleTotal] = useState("");
  const [saleCustomerId, setSaleCustomerId] = useState("");
  const [salePaymentMethod, setSalePaymentMethod] = useState<"pix" | "card" | "cash" | "fiado">("cash");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Doces");
  const [notice, setNotice] = useState("");
  const [pixPaymentPending, setPixPaymentPending] = useState(false);
  const [locationLabel, setLocationLabel] = useState("Usar minha localização");
  const [cartPulse, setCartPulse] = useState(false);
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const cartScale = useRef(new Animated.Value(1)).current;
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const enterSellerMode = () => {
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    if (user?.role !== "merchant") {
      notify("Sua conta ainda não possui perfil de vendedor");
      return;
    }
    setRole("seller");
    setSellerTab("home");
    if (!storeQuery.data) setShowSellerOnboarding(true);
  };

  useEffect(() => {
    Animated.sequence([
      Animated.timing(screenOpacity, { toValue: 0.72, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [customerTab, role, sellerTab, screenOpacity]);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;
    void (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        const finalPermission = permission.granted ? permission : await Notifications.requestPermissionsAsync();
        if (!finalPermission.granted) return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await registerPushMutation.mutateAsync({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
      } catch {
        // Push registration depends on a physical device and native credentials.
      }
    })();
  }, [isAuthenticated, registerPushMutation]);

  const notifyWithHaptic = async (message: string, success = true) => {
    notify(message);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(success ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    }
  };

  const scheduleOrderNotification = async (body: string) => {
    if (Platform.OS === "web") return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) return;
    }
    await Notifications.scheduleNotificationAsync({ content: { title: "Pediu", body, sound: "default" }, trigger: null });
  };

  const requestLocation = async () => {
    if (Platform.OS === "web") {
      setLocationLabel("Localização disponível no app");
      notify("Abra o Pediu no celular para usar o GPS");
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      notifyWithHaptic("Permissão de localização não concedida", false);
      return;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocationLabel(formatLocationLabel(current.coords.latitude, current.coords.longitude));
    notify("Localização atualizada");
  };

  const liveProducts = useMemo(() => (marketplaceQuery.data ?? []).map((product) => ({
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    store: product.storeName,
    price: `R$ ${Number(product.price).toFixed(2).replace(".", ",")}`,
    distance: "perto de você",
    category: product.category,
    emoji: product.category === "Lanches" ? "🍔" : product.category === "Serviços" ? "🛠️" : "🍰",
    available: Boolean(product.available),
    deliveryFee: product.deliveryFee,
  })), [marketplaceQuery.data]);

  const filteredProducts = useMemo(
    () => liveProducts.filter((product) => category === "Tudo" || product.category === category),
    [category, liveProducts],
  );

  const notify = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2400);
  };

  const requestLogin = () => {
    if (!isOAuthConfigured) {
      notify("Login seguro ainda não está configurado neste ambiente.");
      return;
    }
    void startOAuthLogin();
  };

  const addToCart = (product: Product) => {
    const result = addGlobalItem({
      id: product.id,
      storeId: product.storeId ?? 0,
      name: product.name,
      storeName: product.store,
      category: product.category,
      price: String(cartTotal([product.price]).toFixed(2)),
      deliveryFee: String(product.deliveryFee ?? "0.00"),
      emoji: product.emoji,
    });
    if (!result.ok) {
      notify(result.error ?? "Não foi possível adicionar o produto");
      return;
    }
    setSelectedProduct(null);
    setCartPulse(true);
    Animated.sequence([
      Animated.timing(cartScale, { toValue: 1.18, duration: 110, useNativeDriver: true }),
      Animated.timing(cartScale, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setCartPulse(false));
    void notifyWithHaptic("Adicionado ao seu pedido");
  };

  const openCheckout = () => {
    if (!cart.length) return;
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    setShowCart(false);
    router.push("/checkout");
  };

  const submitOrder = () => {
    if (!cart.length || !deliveryAddress.trim()) {
      void notifyWithHaptic("Informe o endereço de entrega", false);
      return;
    }
    const itemsTotal = cartTotal(cart.map((item) => item.price));
    const deliveryFee = Number(cart[0]?.deliveryFee ?? 0);
    const total = (itemsTotal + deliveryFee).toFixed(2);
    createOrderMutation.mutate({
      idempotencyKey: checkoutIdempotencyKey,
      storeId: cart[0]?.storeId ?? 1,
      total,
      paymentMethod: checkoutPayment,
      addressId: deliveryAddressId,
      deliveryAddress: deliveryAddress.trim(),
      items: cart.map((item) => ({ productId: item.id, quantity: 1, unitPrice: cartTotal([item.price]).toFixed(2) })),
    });
  };

  const sellerProducts = useMemo(() => (storeProductsQuery.data ?? []).map((product) => ({
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    store: storeQuery.data?.name ?? "Minha loja",
    price: `R$ ${Number(product.price).toFixed(2).replace(".", ",")}`,
    distance: "sua loja",
    category: product.category,
    emoji: product.category === "Lanches" ? "🍔" : product.category === "Serviços" ? "🛠️" : "🍰",
    available: Boolean(product.available),
    deliveryFee: "0.00",
  })), [storeProductsQuery.data, storeQuery.data?.name]);

  const addProduct = () => {
    const price = newProductPrice.replace(",", ".").trim();
    const storeId = storeQuery.data?.id;
    if (!storeId || !newProductName.trim() || !/^\\d+(\\.\\d{1,2})?$/.test(price)) {
      notify("Informe nome, categoria e um preço válido");
      return;
    }
    createProductMutation.mutate({
      storeId,
      name: newProductName.trim(),
      category: newProductCategory.trim() || "Geral",
      price,
    });
  };

  const openVoiceAssistant = (mode: VoiceMode) => {
    setVoiceMode(mode);
    setShowVoice(true);
  };

  const handleVoiceAction = (action: string) => {
    setShowVoice(false);
    if (action === "doces") {
      setRole("customer");
      setCustomerTab("discover");
      setCategory("Doces");
      void notifyWithHaptic("Encontrei doces perto de você");
      return;
    }
    if (action === "pedidos") {
      setRole("customer");
      setCustomerTab("orders");
      return;
    }
    if (action === "venda") {
      setRole("seller");
      setSellerTab("home");
      setShowSaleModal(true);
      return;
    }
    if (action === "fiado") {
      setRole("seller");
      setSellerTab("clients");
      void notifyWithHaptic("Abrindo clientes e vendas fiadas");
      return;
    }
    if (action === "catalogo") {
      setRole("seller");
      setSellerTab("catalog");
      return;
    }
    void notifyWithHaptic("Rascunho de divulgação criado");
  };

  const handleVoiceCommand = async (command: string) => {
    if (!command.trim()) return;
    setVoiceReply("Entendendo seu pedido...");
    try {
      const result = await voiceMutation.mutateAsync({ mode: voiceMode, command });
      setVoiceReply(result.reply);
      if (result.action !== "fallback") handleVoiceAction(result.action);
    } catch {
      setVoiceReply("Não consegui conectar ao assistente. Use uma das ações rápidas.");
    }
  };

  const toggleNativeRecording = async () => {
    if (Platform.OS === "web") return;
    if (recorderState.isRecording) {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return;
      setVoiceReply("Transcrevendo seu áudio...");
      const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      try {
        const result = await transcribeMutation.mutateAsync({ audioBase64, mimeType: "audio/m4a" });
        await handleVoiceCommand(result.text);
      } catch {
        setVoiceReply("Não consegui transcrever o áudio. Tente novamente ou digite o comando.");
      }
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setVoiceReply("Permita o uso do microfone para falar com o Pediu.");
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setVoiceReply("Estou ouvindo… toque novamente para enviar.");
  };

  const submitSale = () => {
    const normalizedTotal = saleTotal.replace(",", ".");
    const customerId = saleCustomerId ? Number(saleCustomerId) : undefined;
    if (!canRegisterSale(normalizedTotal, salePaymentMethod, customerId)) {
      void notifyWithHaptic(salePaymentMethod === "fiado" ? "Informe o ID do cliente para lançar no fiado" : "Informe um valor válido");
      return;
    }
    createSaleMutation.mutate({ total: normalizedTotal, customerId, paymentMethod: salePaymentMethod });
    if (salePaymentMethod === "fiado" && customerId) addLedgerMutation.mutate({ customerId, type: "credit", amount: normalizedTotal, note: "Venda registrada pelo assistente" });
  };

  const createStore = () => {
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    if (!storeName.trim()) return;
    createStoreMutation.mutate({ name: storeName.trim(), phone: storePhone.trim() || undefined, address: storeAddress.trim() || undefined, pixKey: storePixKey.trim() || undefined, deliveryFee: "0.00" });
  };

  return (
    <ScreenContainer containerClassName="bg-[#FFF8F1]" edges={["top", "left", "right"]}>
      <Animated.View style={[styles.appShell, { opacity: screenOpacity }]}>
        <FloatingDecorations />
        {role === "customer" ? (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {customerTab === "discover" && (
                <CustomerDiscover
                  products={filteredProducts}
                  loading={marketplaceQuery.isLoading}
                  error={marketplaceQuery.isError}
                  userName={user?.name}
                  category={category}
                  setCategory={setCategory}
                  onProductPress={setSelectedProduct}
                  cartCount={globalCartCount}
                  cartScale={cartScale}
                  cartPulse={cartPulse}
                  onCartPress={() => router.push("/cart")}
                  locationLabel={locationLabel}
                  onLocationPress={requestLocation}
                  onAssistant={() => openVoiceAssistant("customer")}
                  onOrders={() => setCustomerTab("orders")}
                />
              )}
              {customerTab === "orders" && (
                <CustomerOrders orders={customerOrdersQuery.data ?? []} loading={customerOrdersQuery.isLoading} isAuthenticated={isAuthenticated} onLogin={requestLogin} onCancel={(orderId) => updateOrderStatusMutation.mutate({ orderId, status: "Cancelado" })} onDiscover={() => setCustomerTab("discover")} />
              )}
              {customerTab === "profile" && (
                <><CustomerProfile user={user} isAuthenticated={isAuthenticated} notifications={notificationsQuery.data ?? []} onReadNotification={(id) => markNotificationMutation.mutate({ notificationId: id })} onLogin={requestLogin} onLogout={() => void logout()} onSellerMode={enterSellerMode} /><AuthPanel user={user} isAuthenticated={isAuthenticated} onLogin={requestLogin} onLogout={() => void logout()} /></>
              )}
            </ScrollView>
            <CustomerNav active={customerTab} onChange={setCustomerTab} onAssistant={() => openVoiceAssistant("customer")} />
          </>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {sellerTab === "home" && <><SellerHome store={storeQuery.data} ownerName={user?.name} orders={storeOrdersQuery.data ?? []} productCount={sellerProducts.length} salesTotal={(salesQuery.data ?? []).reduce((sum, sale) => sum + Number(sale.total), 0)} onCatalog={() => setSellerTab("catalog")} onOrders={() => setSellerTab("orders")} onVoice={() => openVoiceAssistant("seller")} onNotice={notify} /><SellerVoiceLauncher onPress={() => openVoiceAssistant("seller")} /></>}
              {sellerTab === "orders" && <SellerOrders orders={storeOrdersQuery.data ?? []} onUpdateStatus={(orderId, status) => updateOrderStatusMutation.mutate({ orderId, status })} />}
              {sellerTab === "catalog" && <SellerCatalog products={sellerProducts} loading={storeProductsQuery.isLoading} onAdd={() => setShowAddProduct(true)} onToggle={(id, available) => updateProductAvailabilityMutation.mutate({ productId: id, available })} />}
              {sellerTab === "clients" && <SellerClients customers={clientsQuery.data ?? []} onNotice={notify} />}
              {sellerTab === "settings" && <SellerSettings store={storeQuery.data} salesCount={salesQuery.data?.length ?? 0} onCustomerMode={() => { setRole("customer"); setCustomerTab("discover"); }} />}
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
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{`R$ ${cartTotal(cart.map((item) => item.price)).toFixed(2).replace(".", ",")}`}</Text></View>{cart.length ? <View style={styles.totalRow}><Text style={styles.totalLabel}>Entrega</Text><Text style={styles.totalValue}>{`R$ ${Number(cart[0]?.deliveryFee ?? 0).toFixed(2).replace(".", ",")}`}</Text></View> : null}<View style={styles.totalRow}><Text style={styles.totalLabel}>Total do pedido</Text><Text style={styles.totalValue}>{`R$ ${(cartTotal(cart.map((item) => item.price)) + Number(cart[0]?.deliveryFee ?? 0)).toFixed(2).replace(".", ",")}`}</Text></View>
            {cart.length && !pixPaymentPending ? <Pressable style={paymentStyles.pixButton} onPress={() => { setPixPaymentPending(true); void notifyWithHaptic("Cobrança PIX criada e aguardando confirmação"); }}><MaterialIcons name="pix" size={18} color={COLORS.ink} /><Text style={paymentStyles.pixButtonText}>{pixPaymentLabel("idle")}</Text></Pressable> : null}
            {pixPaymentPending ? <View style={paymentStyles.pending}><MaterialIcons name="schedule" size={18} color={COLORS.orange} /><Text style={paymentStyles.pendingText}>{pixPaymentLabel("pending")}</Text></View> : null}
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, !cart.length && styles.disabledButton]} disabled={!cart.length} onPress={openCheckout}><Text style={styles.primaryButtonText}>Continuar para entrega</Text><MaterialIcons name="arrow-forward" size={18} color={COLORS.white} /></Pressable>
            <Pressable style={styles.textButton} onPress={() => setShowCart(false)}><Text style={styles.textButtonLabel}>Continuar escolhendo</Text></Pressable>
          </View></View>
        </Modal>

        <Modal visible={showCheckout} transparent animationType="slide" onRequestClose={() => setShowCheckout(false)}>
          <CheckoutModal addresses={customerAddressesQuery.data ?? []} address={deliveryAddress} paymentMethod={checkoutPayment} total={cartTotal(cart.map((item) => item.price)) + Number(cart[0]?.deliveryFee ?? 0)} busy={createOrderMutation.isPending || createPixMutation.isPending} onChangeAddress={(value) => { setDeliveryAddressId(undefined); setDeliveryAddress(value); }} onSelectAddress={(savedAddress) => { setDeliveryAddressId(savedAddress.id); setDeliveryAddress(formatSavedAddress(savedAddress)); }} onChangePaymentMethod={setCheckoutPayment} onSubmit={submitOrder} onClose={() => setShowCheckout(false)} />
        </Modal>

        <Modal visible={showAddProduct} transparent animationType="slide" onRequestClose={() => setShowAddProduct(false)}>
          <View style={styles.modalBackdrop}><View style={styles.sheet}>
            <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Novo produto</Text><Text style={styles.fieldLabel}>NOME DO PRODUTO</Text><TextInput value={newProductName} onChangeText={setNewProductName} placeholder="Ex.: Torta de morango" placeholderTextColor={COLORS.muted} style={styles.input} /><Text style={styles.fieldLabel}>CATEGORIA</Text><TextInput value={newProductCategory} onChangeText={setNewProductCategory} placeholder="Ex.: Doces" placeholderTextColor={COLORS.muted} style={styles.input} /><Text style={styles.fieldLabel}>PREÇO</Text><TextInput value={newProductPrice} onChangeText={setNewProductPrice} placeholder="Ex.: 18,00" placeholderTextColor={COLORS.muted} style={styles.input} keyboardType="decimal-pad" /><Pressable style={[styles.primaryButton, createProductMutation.isPending && styles.disabledButton]} disabled={createProductMutation.isPending} onPress={addProduct}><Text style={styles.primaryButtonText}>{createProductMutation.isPending ? "Salvando..." : "Adicionar ao catálogo"}</Text></Pressable><Pressable style={styles.textButton} onPress={() => setShowAddProduct(false)}><Text style={styles.textButtonLabel}>Cancelar</Text></Pressable>
          </View></View>
        </Modal>

        <Modal visible={showVoice} transparent animationType="fade" onRequestClose={() => setShowVoice(false)}>
          <VoiceAssistantModal mode={voiceMode} busy={voiceMutation.isPending || transcribeMutation.isPending} isRecording={recorderState.isRecording} onRecord={toggleNativeRecording} reply={voiceReply} onClose={() => { setShowVoice(false); setVoiceReply(""); }} onAction={handleVoiceAction} onCommand={handleVoiceCommand} />
        </Modal>

        <Modal visible={showSaleModal} transparent animationType="slide" onRequestClose={() => setShowSaleModal(false)}>
          <SaleModal total={saleTotal} customerId={saleCustomerId} paymentMethod={salePaymentMethod} busy={createSaleMutation.isPending || addLedgerMutation.isPending} onChangeTotal={setSaleTotal} onChangeCustomerId={setSaleCustomerId} onChangePaymentMethod={setSalePaymentMethod} onSubmit={submitSale} onClose={() => setShowSaleModal(false)} />
        </Modal>

        <Modal visible={showSellerOnboarding} transparent animationType="slide" onRequestClose={() => setShowSellerOnboarding(false)}>
          <SellerOnboardingModal isAuthenticated={isAuthenticated} name={storeName} phone={storePhone} address={storeAddress} pixKey={storePixKey} onChangeName={setStoreName} onChangePhone={setStorePhone} onChangeAddress={setStoreAddress} onChangePixKey={setStorePixKey} onLogin={requestLogin} onCreate={createStore} onClose={() => setShowSellerOnboarding(false)} busy={createStoreMutation.isPending} />
        </Modal>
      </Animated.View>
    </ScreenContainer>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <View style={[styles.brandMark, small && styles.brandMarkSmall]}><Text style={[styles.brandMarkText, small && styles.brandMarkTextSmall]}>p</Text></View>;
}

function FloatingDecorations() {
  const first = useRef(new Animated.Value(0)).current;
  const second = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const firstLoop = Animated.loop(Animated.sequence([
      Animated.timing(first, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(first, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const secondLoop = Animated.loop(Animated.sequence([
      Animated.timing(second, { toValue: 1, duration: 4100, delay: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(second, { toValue: 0, duration: 4100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    firstLoop.start();
    secondLoop.start();
    return () => { firstLoop.stop(); secondLoop.stop(); };
  }, [first, second]);

  return <View pointerEvents="none" style={styles.decorLayer}>
    <Animated.View style={[styles.floatingBlob, styles.floatingBlobOne, { transform: [{ translateY: first.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }, { rotate: "18deg" }] }]} />
    <Animated.View style={[styles.floatingBlob, styles.floatingBlobTwo, { transform: [{ translateY: second.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }, { rotate: "-12deg" }] }]} />
  </View>;
}

function CustomerDiscover({ products, loading, error, userName, category, setCategory, onProductPress, cartCount, cartScale, cartPulse, onCartPress, locationLabel, onLocationPress, onAssistant, onOrders }: { products: Product[]; loading: boolean; error: boolean; userName?: string | null; category: string; setCategory: (value: string) => void; onProductPress: (product: Product) => void; cartCount: number; cartScale: Animated.Value; cartPulse: boolean; onCartPress: () => void; locationLabel: string; onLocationPress: () => void; onAssistant: () => void; onOrders: () => void }) {
  const firstName = userName?.trim().split(/\s+/)[0];
  const avatarLetter = firstName?.[0]?.toUpperCase() ?? "?";
  return <>
    <View style={styles.topBar}><View style={styles.brandRow}><BrandMark small /><Text style={styles.brandName}>Pediu</Text></View><View style={styles.topActions}><Animated.View style={{ transform: [{ scale: cartScale }] }}><Pressable style={styles.iconButton} onPress={onCartPress}><MaterialIcons name="shopping-bag" size={21} color={COLORS.ink} />{cartCount ? <View style={[styles.badge, cartPulse && { backgroundColor: COLORS.green }]}><Text style={styles.badgeText}>{cartCount}</Text></View> : null}</Pressable></Animated.View><Pressable style={styles.iconButton} onPress={onOrders}><MaterialIcons name="receipt-long" size={21} color={COLORS.ink} /></Pressable></View></View>
    <View style={styles.greetingRow}><View><Text style={styles.eyebrow}>PERTO DE VOCÊ</Text><Text style={styles.pageTitle}>{firstName ? `Oi, ${firstName}!` : "Olá!"}</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{avatarLetter}</Text></View></View>
    <View style={styles.heroBanner}><View style={styles.heroCopy}><Text style={styles.heroKicker}>DESCOBERTA LOCAL</Text><Text style={styles.heroTitle}>Seu bairro, do seu jeito.</Text><Text style={styles.heroText}>Encontre sabores, serviços e pessoas que fazem parte da sua rotina.</Text><View style={styles.heroPills}><View style={styles.heroPill}><MaterialIcons name="bolt" size={13} color={COLORS.ink} /><Text style={styles.heroPillText}>perto</Text></View><View style={styles.heroPill}><MaterialIcons name="favorite" size={13} color={COLORS.coral} /><Text style={styles.heroPillText}>feito com cuidado</Text></View></View></View><View style={styles.heroOrb}><Text style={styles.heroOrbEmoji}>✦</Text></View></View>
    <Pressable style={locationStyles.locationCard} onPress={onLocationPress}><MaterialIcons name="location-on" size={18} color={COLORS.coral} /><View style={{ flex: 1 }}><Text style={locationStyles.locationLabel}>ENTREGAR EM</Text><Text style={locationStyles.locationValue}>{locationLabel}</Text></View><MaterialIcons name="my-location" size={18} color={COLORS.ink} /></Pressable>
    <Pressable style={({ pressed }) => [styles.voiceCard, pressed && styles.pressed]} onPress={onAssistant}><View style={styles.voiceIcon}><MaterialIcons name="mic" size={22} color={COLORS.white} /></View><View style={{ flex: 1 }}><Text style={styles.voiceTitle}>O que você quer pedir hoje?</Text><Text style={styles.voiceSub}>Fale ou digite. A gente encontra perto.</Text></View><MaterialIcons name="arrow-forward" size={20} color={COLORS.ink} /></Pressable>
    <View style={styles.searchBox}><MaterialIcons name="search" size={21} color={COLORS.muted} /><TextInput placeholder="Buscar comida, produtos ou serviços" placeholderTextColor={COLORS.muted} style={styles.searchInput} /></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Categorias</Text><Text style={styles.link}>Ver tudo</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{CATEGORIES.map((item) => <Pressable key={item.label} style={[styles.categoryChip, category === item.label && styles.categoryChipActive]} onPress={() => setCategory(item.label)}><Text style={styles.categoryIcon}>{item.icon}</Text><Text style={[styles.categoryLabel, category === item.label && styles.categoryLabelActive]}>{item.label}</Text></Pressable>)}</ScrollView>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Boas opções para pedir agora</Text><Text style={styles.link}>Ver tudo</Text></View>
    {loading ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>Carregando opções...</Text><Text style={styles.emptyText}>Buscando produtos disponíveis perto de você.</Text></View> : error ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>Não foi possível carregar o catálogo</Text><Text style={styles.emptyText}>Tente novamente em alguns instantes.</Text></View> : products.length ? products.map((product) => <Pressable key={product.id} style={({ pressed }) => [styles.productCard, pressed && styles.cardPressed]} onPress={() => onProductPress(product)}><View style={styles.productImage}><Text style={styles.productEmoji}>{product.emoji}</Text><View style={styles.availablePill}><View style={styles.dot} /><Text style={styles.availableText}>DISPONÍVEL</Text></View></View><View style={styles.productInfo}><View style={{ flex: 1 }}><View style={styles.ratingRow}><Text style={styles.rating}>★ 4,9</Text><Text style={styles.distance}>{product.distance}</Text></View><Text style={styles.productName}>{product.name}</Text><Text style={styles.storeName}>{product.store}</Text></View><Text style={styles.productPrice}>{product.price}</Text></View><View style={styles.productFooter}><Text style={styles.localText}>Recomendado por quem está perto de você</Text><View style={styles.arrowCircle}><MaterialIcons name="arrow-forward" size={17} color={COLORS.white} /></View></View></Pressable>) : <View style={styles.emptyState}><Text style={styles.emptyTitle}>Nenhuma opção disponível agora</Text><Text style={styles.emptyText}>Quando uma loja abrir e publicar produtos, eles aparecerão aqui.</Text></View>}
    <View style={styles.promiseCard}><MaterialIcons name="favorite" size={20} color={COLORS.coral} /><View style={{ flex: 1 }}><Text style={styles.promiseTitle}>Compre de quem está perto</Text><Text style={styles.promiseText}>Apoiamos o comércio local e entregamos com cuidado.</Text></View></View>
  </>;
}

function ProductModal({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: () => void }) {
  return <View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.modalProductImage}><Text style={styles.modalEmoji}>{product.emoji}</Text></View><Text style={styles.eyebrow}>{product.store.toUpperCase()}</Text><Text style={styles.sheetTitle}>{product.name}</Text><Text style={styles.muted}>A 500 m · disponível agora</Text><Text style={styles.modalDescription}>Uma opção deliciosa e feita com carinho por quem vende perto de você.</Text><View style={styles.totalRow}><Text style={styles.totalLabel}>Preço</Text><Text style={styles.totalValue}>{product.price}</Text></View><Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onAdd}><Text style={styles.primaryButtonText}>Adicionar ao pedido</Text><MaterialIcons name="add" size={19} color={COLORS.white} /></Pressable><Pressable style={styles.textButton} onPress={onClose}><Text style={styles.textButtonLabel}>Voltar</Text></Pressable></View></View>;
}

function CustomerOrders({ orders, loading, isAuthenticated, onLogin, onCancel, onDiscover }: { orders: { id: number; storeId: number; status: OrderStatus; total: string; deliveryAddress: string | null; createdAt: Date | string | null }[]; loading: boolean; isAuthenticated: boolean; onLogin: () => void; onCancel: (orderId: number) => void; onDiscover: () => void }) {
  const progress: OrderStatus[] = ["Pendente", "Aceito", "Preparando", "Pronto", "A caminho", "Entregue"];
  const progressWidth = (status: OrderStatus): `${number}%` => {
    if (status === "Cancelado") return "0%";
    const index = Math.max(0, progress.indexOf(status));
    return `${Math.round(((index + 1) / progress.length) * 100)}%`;
  };
  if (!isAuthenticated) {
    return <><View style={styles.simpleHeader}><Text style={styles.pageTitle}>Meus pedidos</Text><View style={styles.avatar}><Text style={styles.avatarText}>?</Text></View></View><View style={styles.emptyState}><Text style={styles.emptyTitle}>Entre para consultar seus pedidos</Text><Text style={styles.emptyText}>Sua conta precisa estar sincronizada para carregar o histórico real.</Text><Pressable style={styles.primaryButton} onPress={onLogin}><Text style={styles.primaryButtonText}>Entrar com login seguro</Text></Pressable></View></>;
  }
  return <><View style={styles.simpleHeader}><Text style={styles.pageTitle}>Meus pedidos</Text><View style={styles.avatar}><Text style={styles.avatarText}>?</Text></View></View>{loading ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>Carregando pedidos...</Text><Text style={styles.emptyText}>Buscando seus pedidos mais recentes.</Text></View> : orders.length ? orders.map((order) => <View style={styles.orderCard} key={order.id}><View style={styles.orderTop}><View><Text style={styles.eyebrow}>`PEDIDO #${order.id}`</Text><Text style={styles.orderStore}>`Estabelecimento #${order.storeId}`</Text></View><View style={styles.statusPill}><Text style={styles.statusPillText}>{order.status.toUpperCase()}</Text></View></View><View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>`R$ ${Number(order.total).toFixed(2).replace(".", ",")}`</Text></View>{order.deliveryAddress ? <Text style={styles.muted}>Entrega: {order.deliveryAddress}</Text> : null}{order.status !== "Cancelado" ? <><View style={styles.progressTrack}><View style={[styles.progressFill, { width: progressWidth(order.status) }]} /></View><View style={styles.progressLabels}>{progress.map((status) => <Text key={status} style={styles.progressLabelsText}>{status}</Text>)}</View></> : <Text style={styles.muted}>Este pedido foi cancelado.</Text>}<Pressable style={styles.outlineButtonSmall} onPress={() => router.push({ pathname: "/order/track", params: { orderId: String(order.id) } })}><Text style={styles.outlineButtonText}>Acompanhar pedido</Text></Pressable>{order.status === "Pendente" || order.status === "Aceito" ? <Pressable style={styles.outlineButtonSmall} onPress={() => onCancel(order.id)}><Text style={styles.outlineButtonText}>Cancelar pedido</Text></Pressable> : null}</View>) : <View style={styles.emptyState}><Text style={styles.emptyIllustration}>🛍️</Text><Text style={styles.emptyTitle}>Você ainda não fez um pedido</Text><Text style={styles.emptyText}>Encontre algo gostoso perto de você e peça em poucos toques.</Text><Pressable style={styles.primaryButton} onPress={onDiscover}><Text style={styles.primaryButtonText}>Explorar agora</Text></Pressable></View>}</>;
}
function CustomerProfile({ user, isAuthenticated, notifications, onReadNotification, onLogin, onLogout, onSellerMode }: { user: { name: string | null; email: string | null } | null; isAuthenticated: boolean; notifications: { id: number; title: string; body: string; readAt: Date | null }[]; onReadNotification: (id: number) => void; onLogin: () => void; onLogout: () => void; onSellerMode: () => void }) {
  const profileName = user?.name ?? "Visitante";
  const profileEmail = user?.email ?? "Entre para sincronizar seus pedidos";
  const avatarLetter = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";
  return <><View style={styles.simpleHeader}><View><Text style={styles.eyebrow}>SUA CONTA</Text><Text style={styles.pageTitle}>Perfil</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{avatarLetter}</Text></View></View><View style={styles.profileCard}><View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{avatarLetter}</Text></View><Text style={styles.profileName}>{profileName}</Text><Text style={styles.muted}>{profileEmail}</Text>{!isAuthenticated ? <Text style={styles.muted}>Você está navegando como visitante.</Text> : null}</View>{["Dados pessoais", "Meus endereços", "Pagamentos", "Notificações", "Segurança"].map((item) => <Pressable style={styles.settingsRow} key={item} onPress={() => item === "Meus endereços" ? router.push("/account/addresses") : item === "Pagamentos" ? router.push("/account/payment-methods") : item === "Notificações" ? router.push("/account/notifications") : item === "Segurança" ? router.push("/account/settings/advanced") : router.push("/account/profile")}><View style={styles.settingsIcon}><MaterialIcons name={item === "Pagamentos" ? "credit-card" : item === "Meus endereços" ? "location-on" : item === "Notificações" ? "notifications" : "person"} size={20} color={COLORS.ink} /></View><Text style={styles.cardTitle}>{item}</Text><MaterialIcons name="chevron-right" size={20} color={COLORS.muted} /></Pressable>)}<View style={notificationStyles.card}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Histórico de notificações</Text><Text style={styles.link}>{notifications.filter((item) => !item.readAt).length} novas</Text></View>{notifications.length ? notifications.slice(0, 4).map((item) => <Pressable key={item.id} style={[notificationStyles.item, !item.readAt && notificationStyles.unread]} onPress={() => onReadNotification(item.id)}><MaterialIcons name="notifications" size={18} color={COLORS.coral} /><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.muted}>{item.body}</Text></View></Pressable>) : <Text style={styles.muted}>Suas confirmações de pedido e pagamento aparecerão aqui.</Text>}</View><View style={styles.sellerInvite}><Text style={styles.sellerInviteTitle}>Você também vende?</Text><Text style={styles.sellerInviteText}>Crie sua vitrine e comece a vender para sua comunidade.</Text><Pressable style={styles.outlineButton} onPress={onSellerMode}><Text style={styles.outlineButtonText}>Abrir modo vendedor</Text></Pressable></View></>;
}

function SellerHome({ store, ownerName, orders, productCount, salesTotal, onCatalog, onOrders, onVoice, onNotice }: { store?: { name?: string | null }; ownerName?: string | null; orders: { status: string }[]; productCount: number; salesTotal: number; onCatalog: () => void; onOrders: () => void; onVoice: () => void; onNotice: (message: string) => void }) {
  const pendingOrders = orders.filter((order) => order.status === "Pendente").length;
  const firstName = ownerName?.trim().split(/\s+/)[0];
  return <><View style={styles.sellerHeader}><View><Text style={styles.eyebrowLight}>PAINEL DA LOJA</Text><Text style={styles.sellerTitle}>{store?.name ?? "Sua loja"}</Text><Text style={styles.sellerSubtitle}>{firstName ? `Bom dia, ${firstName}. Tudo pronto?` : "Configure sua loja para começar."}</Text></View><BrandMark /></View><View style={styles.statGrid}><View style={styles.statCard}><Text style={styles.statNumber}>{pendingOrders}</Text><Text style={styles.statLabel}>pedidos pendentes</Text><MaterialIcons name="receipt-long" size={22} color={COLORS.coral} /></View><View style={styles.statCard}><Text style={styles.statNumber}>{`R$ ${salesTotal.toFixed(2).replace(".", ",")}`}</Text><Text style={styles.statLabel}>vendas registradas</Text><MaterialIcons name="trending-up" size={22} color={COLORS.green} /></View></View><View style={styles.aiSellerCard}><View style={styles.aiIcon}><MaterialIcons name="mic" size={21} color={COLORS.white} /></View><View style={{ flex: 1 }}><Text style={styles.aiTitle}>Fale com o Pediu</Text><Text style={styles.aiText}>Registre vendas e consulte sua operação por voz.</Text></View><Pressable style={styles.smallLightButton} onPress={onVoice}><Text style={styles.smallLightButtonText}>Falar</Text></Pressable></View><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Atalhos</Text></View><View style={styles.shortcutGrid}><Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]} onPress={onCatalog}><MaterialIcons name="inventory-2" size={24} color={COLORS.coral} /><Text style={styles.shortcutTitle}>Catálogo</Text><Text style={styles.shortcutSub}>{productCount} produto(s) ativo(s)</Text></Pressable><Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]} onPress={onOrders}><MaterialIcons name="local-shipping" size={24} color={COLORS.orange} /><Text style={styles.shortcutTitle}>Pedidos</Text><Text style={styles.shortcutSub}>{pendingOrders} aguardando ação</Text></Pressable><Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]} onPress={() => onNotice("A divulgação será conectada ao catálogo da loja") }><MaterialIcons name="campaign" size={24} color={COLORS.ink} /><Text style={styles.shortcutTitle}>Divulgar</Text><Text style={styles.shortcutSub}>Compartilhe seu catálogo</Text></Pressable><Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.cardPressed]} onPress={() => onNotice("Cadastre clientes para acompanhar o fiado") }><MaterialIcons name="people" size={24} color={COLORS.green} /><Text style={styles.shortcutTitle}>Clientes</Text><Text style={styles.shortcutSub}>Dados do backend</Text></Pressable></View><View style={styles.tipCard}><MaterialIcons name="lightbulb" size={22} color={COLORS.orange} /><View style={{ flex: 1 }}><Text style={styles.tipTitle}>Dica do Pediu</Text><Text style={styles.tipText}>Uma boa foto e uma descrição curta ajudam seu produto a vender mais.</Text></View></View></>;
}

function SellerOrders({
  orders,
  onUpdateStatus,
}: {
  orders: {
    id: number;
    customerId: number;
    total: string;
    status: string;
    deliveryAddress: string | null;
    createdAt: Date | null;
  }[];
  onUpdateStatus: (orderId: number, status: "Aceito" | "Preparando" | "Pronto" | "A caminho" | "Entregue" | "Cancelado") => void;
}) {
  const nextStatus: Record<string, "Aceito" | "Preparando" | "Pronto" | "A caminho" | "Entregue" | "Cancelado" | undefined> = {
    Pendente: "Aceito",
    Aceito: "Preparando",
    Preparando: "Pronto",
    Pronto: "A caminho",
    "A caminho": "Entregue",
  };

  return (
    <>
      <View style={styles.simpleHeader}>
        <View>
          <Text style={styles.eyebrow}>GESTÃO DA LOJA</Text>
          <Text style={styles.pageTitle}>Pedidos</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{orders.length} HOJE</Text>
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.sellerOrderCard}>
          <Text style={styles.orderStore}>Nenhum pedido recebido</Text>
          <Text style={styles.muted}>Quando um cliente fizer um pedido, ele aparecerá aqui.</Text>
        </View>
      ) : (
        orders.map((order) => {
          const next = nextStatus[order.status];
          const actionLabel =
            order.status === "Pendente" ? "Aceitar pedido" :
            order.status === "Aceito" ? "Começar preparo" :
            order.status === "Preparando" ? "Marcar como pronto" :
            order.status === "Pronto" ? "Enviar para entrega" :
            order.status === "A caminho" ? "Finalizar pedido" :
            order.status;

          return (
            <View style={styles.sellerOrderCard} key={order.id}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.eyebrow}>{order.status.toUpperCase()} · #{order.id}</Text>
                  <Text style={styles.orderStore}>Cliente #{order.customerId}</Text>
                </View>
                <Text style={styles.price}>R$ {Number(order.total).toFixed(2).replace(".", ",")}</Text>
              </View>
              <Text style={styles.muted}>{order.deliveryAddress || "Endereço de entrega não informado"}</Text>

              {next ? (
                <View style={styles.orderActions}>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButtonSmall, pressed && styles.pressed]}
                    onPress={() => onUpdateStatus(order.id, next)}
                  >
                    <Text style={styles.primaryButtonText}>{actionLabel}</Text>
                  </Pressable>
                  {order.status === "Pendente" && (
                    <Pressable
                      style={styles.rejectButton}
                      onPress={() => onUpdateStatus(order.id, "Cancelado")}
                    >
                      <Text style={styles.rejectText}>Recusar</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text style={styles.muted}>Pedido encerrado.</Text>
              )}
            </View>
          );
        })
      )}
    </>
  );
}

function SellerCatalog({ products, loading, onAdd, onToggle }: { products: Product[]; loading: boolean; onAdd: () => void; onToggle: (id: number, available: boolean) => void }) {
  return <><View style={styles.simpleHeader}><View><Text style={styles.eyebrow}>SUA VITRINE</Text><Text style={styles.pageTitle}>Catálogo</Text></View><Pressable style={styles.addCircle} onPress={onAdd}><MaterialIcons name="add" size={24} color={COLORS.white} /></Pressable></View><Text style={styles.muted}>Produtos persistidos da sua loja. Alterações ficam disponíveis para os clientes.</Text>{loading ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>Carregando catálogo...</Text></View> : products.length ? products.map((product) => <View style={styles.catalogRow} key={product.id}><View style={styles.catalogEmoji}><Text>{product.emoji}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.muted}>{product.category} · {product.price}</Text></View><Pressable style={[styles.stockSwitch, product.available && styles.stockSwitchOn]} onPress={() => onToggle(product.id, !product.available)}><View style={[styles.stockKnob, product.available && styles.stockKnobOn]} /></Pressable></View>) : <View style={styles.emptyState}><Text style={styles.emptyTitle}>Seu catálogo está vazio</Text><Text style={styles.emptyText}>Adicione o primeiro produto para começar a vender.</Text></View>}<View style={styles.publishCard}><MaterialIcons name="campaign" size={22} color={COLORS.coral} /><View style={{ flex: 1 }}><Text style={styles.tipTitle}>Divulgue seu catálogo</Text><Text style={styles.tipText}>Crie uma oferta com IA para compartilhar no WhatsApp.</Text></View><MaterialIcons name="chevron-right" size={22} color={COLORS.coral} /></View></>;
}

function SellerSettings({ store, salesCount, onCustomerMode }: { store?: { name: string; phone: string | null; pixKey: string | null }; salesCount: number; onCustomerMode: () => void }) {
  return <><View style={styles.simpleHeader}><View><Text style={styles.eyebrow}>CONFIGURAÇÕES</Text><Text style={styles.pageTitle}>Sua loja</Text></View><Text style={styles.link}>{salesCount} vendas</Text></View><View style={styles.fieldCard}><Text style={styles.fieldLabel}>NOME DO NEGÓCIO</Text><Text style={styles.fieldValue}>{store?.name ?? "Cadastre sua loja"}</Text><Text style={styles.fieldLabel}>WHATSAPP / TELEFONE</Text><Text style={styles.fieldValue}>{store?.phone ?? "Ainda não informado"}</Text></View>{["Chave PIX", "Lembretes de fiado", "Taxa de entrega", "Local de retirada", "Modo mãos livres"].map((item) => <View style={styles.settingsRow} key={item}><View style={styles.settingsIcon}><MaterialIcons name={item === "Chave PIX" ? "pix" : item === "Taxa de entrega" ? "two-wheeler" : item === "Local de retirada" ? "location-on" : item === "Modo mãos livres" ? "mic" : "notifications"} size={20} color={COLORS.ink} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item}</Text><Text style={styles.muted}>{item === "Chave PIX" ? (store?.pixKey ?? "Configurar") : item === "Taxa de entrega" ? "R$ 0,00" : "Configurar"}</Text></View><MaterialIcons name="chevron-right" size={20} color={COLORS.muted} /></View>)}<Pressable style={styles.outlineButton} onPress={onCustomerMode}><Text style={styles.outlineButtonText}>Voltar para modo cliente</Text></Pressable></>;
}

function CustomerNav({ active, onChange, onAssistant }: { active: string; onChange: (value: "discover" | "orders" | "profile") => void; onAssistant: () => void }) {
  return <View style={styles.bottomNav}><Pressable style={[styles.navItem, active === "discover" && styles.navItemActive]} onPress={() => onChange("discover")}><MaterialIcons name="explore" size={21} color={active === "discover" ? COLORS.white : COLORS.muted} /><Text style={[styles.navLabel, active === "discover" && styles.navLabelActive]}>Descobrir</Text></Pressable><Pressable style={[styles.navItem, active === "orders" && styles.navItemActive]} onPress={() => onChange("orders")}><MaterialIcons name="receipt-long" size={21} color={active === "orders" ? COLORS.white : COLORS.muted} /><Text style={[styles.navLabel, active === "orders" && styles.navLabelActive]}>Pedidos</Text></Pressable><Pressable style={styles.fabNav} onPress={onAssistant}><MaterialIcons name="auto-awesome" size={22} color={COLORS.white} /></Pressable><Pressable style={[styles.navItem, active === "profile" && styles.navItemActive]} onPress={() => onChange("profile")}><MaterialIcons name="person" size={21} color={active === "profile" ? COLORS.white : COLORS.muted} /><Text style={[styles.navLabel, active === "profile" && styles.navLabelActive]}>Perfil</Text></Pressable></View>;
}

function SellerNav({ active, onChange }: { active: string; onChange: (value: "home" | "orders" | "catalog" | "clients" | "settings") => void }) {
  return <View style={styles.bottomNav}>{[["home", "home", "Início"], ["orders", "receipt-long", "Pedidos"], ["catalog", "inventory-2", "Catálogo"], ["clients", "people", "Clientes"], ["settings", "tune", "Ajustes"]].map(([key, icon, label]) => <Pressable key={key} style={styles.navItem} onPress={() => onChange(key as "home" | "orders" | "catalog" | "clients" | "settings")}><MaterialIcons name={icon as any} size={22} color={active === key ? COLORS.coral : COLORS.muted} /><Text style={[styles.navLabel, active === key && styles.navLabelActive]}>{label}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: COLORS.canvas }, decorLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0, overflow: "hidden" }, floatingBlob: { position: "absolute", borderRadius: 999, opacity: 0.7 }, floatingBlobOne: { width: 170, height: 170, backgroundColor: "#FFE2D5", top: 28, right: -92 }, floatingBlobTwo: { width: 150, height: 150, backgroundColor: "#DFF3E7", top: 420, left: -90 }, scrollContent: { padding: 20, paddingBottom: 132, gap: 17, zIndex: 1 }, topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, brandRow: { flexDirection: "row", alignItems: "center", gap: 9 }, brandName: { color: COLORS.ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.7 }, brandMark: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }, brandMarkSmall: { width: 30, height: 30, borderRadius: 10 }, brandMarkText: { color: COLORS.white, fontSize: 37, fontWeight: "900", fontStyle: "italic", lineHeight: 42 }, brandMarkTextSmall: { fontSize: 24, lineHeight: 28 }, topActions: { flexDirection: "row", gap: 8 }, iconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.ink, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, badge: { position: "absolute", right: 1, top: 0, backgroundColor: COLORS.orange, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" }, badgeText: { color: COLORS.white, fontSize: 10, fontWeight: "800" }, greetingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, heroBanner: { minHeight: 184, borderRadius: 28, backgroundColor: COLORS.ink, padding: 19, overflow: "hidden", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", shadowColor: COLORS.ink, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 4 }, heroCopy: { flex: 1, gap: 7, paddingRight: 8 }, heroKicker: { color: COLORS.yellow, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, heroTitle: { color: COLORS.white, fontSize: 25, lineHeight: 29, fontWeight: "900", letterSpacing: -0.8 }, heroText: { color: "#BED0D0", fontSize: 12, lineHeight: 18, maxWidth: 240 }, heroPills: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 3 }, heroPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 }, heroPillText: { color: COLORS.white, fontSize: 10, fontWeight: "800" }, heroOrb: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center", marginBottom: 4, shadowColor: COLORS.coral, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, heroOrbEmoji: { color: COLORS.white, fontSize: 46, fontWeight: "900" }, eyebrow: { color: COLORS.coral, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 }, pageTitle: { color: COLORS.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.8, marginTop: 2 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.yellow, alignItems: "center", justifyContent: "center" }, avatarText: { color: COLORS.ink, fontSize: 16, fontWeight: "800" }, voiceCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.coralSoft, borderRadius: 24, padding: 15, borderWidth: 1, borderColor: "#FFD8CE", shadowColor: COLORS.coral, shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 2 }, voiceIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" }, voiceTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "800" }, voiceSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 }, searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 16, paddingHorizontal: 14, height: 52, borderWidth: 1, borderColor: COLORS.line }, searchInput: { flex: 1, color: COLORS.text, fontSize: 13, marginLeft: 8 }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }, sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "800" }, link: { color: COLORS.coral, fontSize: 12, fontWeight: "800" }, categoryRow: { gap: 10, paddingVertical: 2 }, categoryChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line }, categoryChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink }, categoryIcon: { fontSize: 16 }, categoryLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700" }, categoryLabelActive: { color: COLORS.white }, productCard: { backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 28, padding: 11, borderWidth: 1, borderColor: COLORS.line, shadowColor: "#1A2730", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, productImage: { height: 156, borderRadius: 22, backgroundColor: "#FFF0D7", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }, productEmoji: { fontSize: 64 }, availablePill: { position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.white }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green }, availableText: { color: COLORS.green, fontSize: 9, fontWeight: "800" }, productInfo: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 12 }, ratingRow: { flexDirection: "row", gap: 8, alignItems: "center" }, rating: { color: COLORS.orange, fontSize: 11, fontWeight: "800" }, distance: { color: COLORS.muted, fontSize: 11 }, productName: { color: COLORS.ink, fontSize: 17, fontWeight: "900", marginTop: 5, letterSpacing: -0.2 }, storeName: { color: COLORS.muted, fontSize: 12, marginTop: 2 }, productPrice: { color: COLORS.ink, fontSize: 17, fontWeight: "900" }, productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line }, localText: { color: COLORS.muted, fontSize: 10, flex: 1 }, arrowCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" }, promiseCard: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#FFF0EC", padding: 15, borderRadius: 18 }, promiseTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, promiseText: { color: COLORS.muted, fontSize: 11, marginTop: 3 }, bottomNav: { position: "absolute", bottom: 14, left: 16, right: 16, height: 68, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: "rgba(240,233,227,0.95)", borderRadius: 25, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 10, shadowColor: COLORS.ink, shadowOpacity: 0.13, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 }, navItem: { alignItems: "center", justifyContent: "center", gap: 3, minWidth: 72, height: 50, borderRadius: 17 }, navItemActive: { backgroundColor: COLORS.ink }, navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800" }, navLabelActive: { color: COLORS.white }, fabNav: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center", marginTop: -27, borderWidth: 5, borderColor: COLORS.canvas, shadowColor: COLORS.coral, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 7 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(18, 38, 44, 0.36)", justifyContent: "flex-end" }, sheet: { backgroundColor: "rgba(255,255,255,0.98)", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, paddingBottom: 32, gap: 13, shadowColor: COLORS.ink, shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 }, sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 3 }, sheetTitle: { color: COLORS.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }, cartRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }, cartEmoji: { fontSize: 28 }, cardTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" }, muted: { color: COLORS.muted, fontSize: 12, marginTop: 3 }, price: { color: COLORS.ink, fontSize: 14, fontWeight: "900" }, totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14, marginTop: 5 }, totalLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "700" }, totalValue: { color: COLORS.ink, fontSize: 20, fontWeight: "900" }, primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: COLORS.coral, borderRadius: 16, height: 52, paddingHorizontal: 16 }, primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "800" }, textButton: { alignItems: "center", padding: 6 }, textButtonLabel: { color: COLORS.coral, fontWeight: "800", fontSize: 13 }, disabledButton: { opacity: 0.45 }, pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 }, cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] }, emptyText: { color: COLORS.muted, fontSize: 13, textAlign: "center", lineHeight: 20 }, modalProductImage: { height: 150, borderRadius: 20, backgroundColor: "#FFF0D7", alignItems: "center", justifyContent: "center" }, modalEmoji: { fontSize: 78 }, modalDescription: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginVertical: 2 }, simpleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }, orderCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: COLORS.line, gap: 13 }, orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, orderStore: { color: COLORS.ink, fontSize: 17, fontWeight: "800", marginTop: 4 }, statusPill: { backgroundColor: "#FFF0D7", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }, statusPillText: { color: COLORS.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 }, orderItem: { flexDirection: "row", alignItems: "center", gap: 9 }, progressTrack: { height: 8, backgroundColor: COLORS.line, borderRadius: 4, overflow: "hidden" }, progressFill: { height: 8, backgroundColor: COLORS.green, borderRadius: 4 }, progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -5 }, progressLabelsText: { color: COLORS.muted, fontSize: 9 }, emptyState: { backgroundColor: COLORS.white, borderRadius: 24, padding: 25, alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.line }, emptyIllustration: { fontSize: 58 }, emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "800", textAlign: "center" }, historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line }, historyIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFF0D7", alignItems: "center", justifyContent: "center" }, profileCard: { backgroundColor: COLORS.ink, borderRadius: 24, padding: 20, alignItems: "center", gap: 6 }, avatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.yellow, alignItems: "center", justifyContent: "center", marginBottom: 4 }, avatarLargeText: { fontSize: 25, fontWeight: "900", color: COLORS.ink }, profileName: { color: COLORS.white, fontSize: 18, fontWeight: "800" }, settingsRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.white, padding: 14, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line }, settingsIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.coralSoft, alignItems: "center", justifyContent: "center" }, sellerInvite: { backgroundColor: "#FFF0D7", borderRadius: 20, padding: 16, gap: 7 }, sellerInviteTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800" }, sellerInviteText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 }, outlineButton: { borderWidth: 1.5, borderColor: COLORS.coral, borderRadius: 14, height: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 15, alignSelf: "flex-start", marginTop: 6 }, outlineButtonText: { color: COLORS.coral, fontSize: 12, fontWeight: "800" }, sellerHeader: { backgroundColor: COLORS.ink, borderRadius: 24, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eyebrowLight: { color: COLORS.yellow, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }, sellerTitle: { color: COLORS.white, fontSize: 23, fontWeight: "800", marginTop: 4 }, sellerSubtitle: { color: "#BCD0D1", fontSize: 12, marginTop: 3 }, statGrid: { flexDirection: "row", gap: 12 }, statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line, gap: 7 }, statNumber: { color: COLORS.ink, fontSize: 22, fontWeight: "900" }, statLabel: { color: COLORS.muted, fontSize: 11, flex: 1 }, aiSellerCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.coral, borderRadius: 20, padding: 14 }, aiIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }, aiTitle: { color: COLORS.white, fontSize: 14, fontWeight: "800" }, aiText: { color: "#FFE1DA", fontSize: 11, lineHeight: 16, marginTop: 3 }, smallLightButton: { backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, smallLightButtonText: { color: COLORS.coral, fontSize: 12, fontWeight: "800" }, shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, shortcut: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 18, padding: 14, width: "48%", minHeight: 108, gap: 7 }, shortcutTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" }, shortcutSub: { color: COLORS.muted, fontSize: 11 }, tipCard: { flexDirection: "row", gap: 11, alignItems: "center", backgroundColor: "#FFF0D7", padding: 15, borderRadius: 18 }, tipTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, tipText: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, filterRow: { flexDirection: "row", gap: 8, marginBottom: 2 }, filterChip: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12 }, filterChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink }, filterText: { color: COLORS.muted, fontSize: 10, fontWeight: "700" }, filterTextActive: { color: COLORS.white }, sellerOrderCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: COLORS.line, gap: 10 }, orderActions: { flexDirection: "row", gap: 8, marginTop: 3 }, outlineButtonSmall: { borderWidth: 1.5, borderColor: COLORS.coral, borderRadius: 12, paddingHorizontal: 12, height: 40, alignItems: "center", justifyContent: "center" }, rejectButton: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 12, height: 40, alignItems: "center", justifyContent: "center" }, rejectText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" }, primaryButtonSmall: { backgroundColor: COLORS.coral, borderRadius: 12, paddingHorizontal: 14, height: 40, alignItems: "center", justifyContent: "center" }, addCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" }, catalogRow: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.white, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line }, catalogEmoji: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFF0D7", alignItems: "center", justifyContent: "center" }, stockSwitch: { width: 42, height: 25, borderRadius: 13, backgroundColor: COLORS.line, justifyContent: "center", padding: 3 }, stockSwitchOn: { backgroundColor: COLORS.green }, stockKnob: { width: 19, height: 19, borderRadius: 10, backgroundColor: COLORS.white }, stockKnobOn: { alignSelf: "flex-end" }, publishCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.coralSoft, padding: 15, borderRadius: 18 }, fieldCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 17, borderWidth: 1, borderColor: COLORS.line, gap: 7 }, fieldLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 2 }, fieldValue: { color: COLORS.ink, fontSize: 15, fontWeight: "700", marginBottom: 9 }, input: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, height: 50, paddingHorizontal: 14, color: COLORS.ink, fontSize: 14, backgroundColor: COLORS.canvas }, toast: { position: "absolute", left: 18, right: 18, bottom: 88, backgroundColor: COLORS.ink, borderRadius: 15, padding: 13, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 }, toastText: { color: COLORS.white, fontSize: 13, fontWeight: "700" },
});


const locationStyles = StyleSheet.create({
  locationCard: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: COLORS.white, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: COLORS.line },
  locationLabel: { color: COLORS.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  locationValue: { color: COLORS.ink, fontSize: 12, fontWeight: "800", marginTop: 2 },
});


function AuthPanel({ user, isAuthenticated, onLogin, onLogout }: { user: { name: string | null; email: string | null } | null; isAuthenticated: boolean; onLogin: () => void; onLogout: () => void }) {
  return <View style={authStyles.card}><MaterialIcons name={isAuthenticated ? "cloud-done" : "cloud-off"} size={22} color={isAuthenticated ? COLORS.green : COLORS.orange} /><View style={{ flex: 1 }}><Text style={authStyles.title}>{isAuthenticated ? "Conta sincronizada" : "Entre para sincronizar"}</Text><Text style={authStyles.text}>{isAuthenticated ? `${user?.name || "Sua conta"} · pedidos e catálogo salvos na nuvem.` : "Use o login seguro do Pediu para acessar seus pedidos em qualquer dispositivo."}</Text></View><Pressable style={authStyles.button} onPress={isAuthenticated ? onLogout : onLogin}><Text style={authStyles.buttonText}>{isAuthenticated ? "Sair" : "Entrar"}</Text></Pressable></View>;
}

const authStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line },
  title: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  text: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  button: { backgroundColor: COLORS.ink, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9 },
  buttonText: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
});


const paymentStyles = StyleSheet.create({
  pixButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.ink, backgroundColor: "#F3FAF8" },
  pixButtonText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  pending: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF0D7", borderRadius: 13, padding: 12 },
  pendingText: { flex: 1, color: COLORS.orange, fontSize: 11, fontWeight: "800", lineHeight: 16 },
});
function VoiceWaveform({ active, processing }: { active: boolean; processing: boolean }) {
  const levels = useRef(Array.from({ length: 17 }, () => new Animated.Value(0.22))).current;

  useEffect(() => {
    const loops = levels.map((level, index) => {
      const peak = 0.48 + ((index * 17) % 7) / 12;
      const duration = 260 + (index % 5) * 75;
      return Animated.loop(Animated.sequence([
        Animated.timing(level, { toValue: peak, duration, delay: index * 18, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(level, { toValue: 0.2 + (index % 3) * 0.05, duration: duration + 60, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
    });

    if (active || processing) loops.forEach((loop) => loop.start());
    else levels.forEach((level) => level.stopAnimation(() => level.setValue(0.22)));
    return () => loops.forEach((loop) => loop.stop());
  }, [active, processing, levels]);

  return <View style={[voiceStyles.waveform, !active && !processing && voiceStyles.waveformIdle]} accessibilityLabel={processing ? "Processando áudio" : active ? "Ondas sonoras indicando que o Pediu está ouvindo" : "Microfone parado"}>{levels.map((level, index) => <Animated.View key={index} style={[voiceStyles.waveBar, { transform: [{ scaleY: level }] }]} />)}</View>;
}

function VoiceAssistantModal({ mode, busy, isRecording, onRecord, reply, onClose, onAction, onCommand }: { mode: VoiceMode; busy: boolean; isRecording: boolean; onRecord: () => void; reply: string; onClose: () => void; onAction: (action: string) => void; onCommand: (command: string) => void }) {
  const customerActions = [{ label: "Encontrar doces perto", icon: "🍰", action: "doces" }, { label: "Ver meus pedidos", icon: "🛍️", action: "pedidos" }, { label: "Conversar com uma loja", icon: "💬", action: "loja" }];
  const sellerActions = [{ label: "Registrar uma venda", icon: "🧾", action: "venda" }, { label: "Consultar vendas fiadas", icon: "📒", action: "fiado" }, { label: "Mostrar meu catálogo", icon: "📦", action: "catalogo" }, { label: "Criar uma divulgação", icon: "📣", action: "divulgar" }];
  const actions = mode === "customer" ? customerActions : sellerActions;
  const [command, setCommand] = useState("");
  const [isListening, setIsListening] = useState(false);
  const startListening = () => {
    const recognitionConstructor = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (!recognitionConstructor) {
      setCommand("Use uma ação rápida ou digite seu pedido");
      return;
    }
    const recognition = new recognitionConstructor();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setCommand(transcript);
      if (transcript) onCommand(transcript);
    };
    recognition.start();
  };
  const voiceActive = isListening || isRecording;
  return <View style={voiceStyles.backdrop}><View style={voiceStyles.sheet}><View style={styles.sheetHandle} /><View style={[voiceStyles.orb, voiceActive && voiceStyles.orbActive]}><MaterialIcons name={busy ? "hourglass-top" : "mic"} size={30} color={COLORS.white} /></View><Text style={voiceStyles.kicker}>{mode === "customer" ? "ASSISTENTE DO CLIENTE" : "ASSISTENTE DA LOJA"}</Text><Text style={voiceStyles.title}>{mode === "customer" ? "O que você quer pedir?" : "Como posso ajudar sua loja?"}</Text><Text style={voiceStyles.subtitle}>Fale ou digite uma instrução. A IA interpreta e só executa ações permitidas.</Text><VoiceWaveform active={voiceActive} processing={busy} /><Text style={voiceStyles.voiceState}>{busy ? "Processando sua mensagem…" : voiceActive ? "Estou ouvindo… toque novamente para enviar" : "Toque no microfone para falar"}</Text><View style={voiceStyles.commandRow}><TextInput value={command} onChangeText={setCommand} onSubmitEditing={() => onCommand(command)} placeholder={mode === "customer" ? "Ex.: quero pedir doces" : "Ex.: quem me deve?"} placeholderTextColor={COLORS.muted} style={voiceStyles.commandInput} returnKeyType="done" /><Pressable style={[voiceStyles.commandButton, voiceActive && voiceStyles.listeningButton]} disabled={busy} onPress={Platform.OS === "web" ? startListening : onRecord}><MaterialIcons name={voiceActive ? "graphic-eq" : "mic"} size={18} color={COLORS.white} /></Pressable><Pressable style={voiceStyles.commandButton} disabled={busy} onPress={() => onCommand(command)}><MaterialIcons name={busy ? "hourglass-top" : "send"} size={18} color={COLORS.white} /></Pressable></View>{reply ? <Text style={voiceStyles.reply}>{reply}</Text> : null}<View style={voiceStyles.actions}>{actions.map((item) => <Pressable key={item.action} style={({ pressed }) => [voiceStyles.action, pressed && styles.pressed]} onPress={() => onAction(item.action)}><Text style={voiceStyles.actionIcon}>{item.icon}</Text><Text style={voiceStyles.actionText}>{item.label}</Text><MaterialIcons name="arrow-forward" size={17} color={COLORS.coral} /></Pressable>)}</View><Pressable style={styles.textButton} onPress={onClose}><Text style={styles.textButtonLabel}>Fechar assistente</Text></Pressable></View></View>;
}

function SellerVoiceLauncher({ onPress }: { onPress: () => void }) {
  return <Pressable style={({ pressed }) => [voiceStyles.launcher, pressed && styles.pressed]} onPress={onPress}><View style={voiceStyles.launcherIcon}><MaterialIcons name="mic" size={18} color={COLORS.white} /></View><View style={{ flex: 1 }}><Text style={voiceStyles.launcherTitle}>Fale com o Pediu</Text><Text style={voiceStyles.launcherText}>Registrar venda, consultar fiado ou divulgar</Text></View><MaterialIcons name="arrow-forward" size={18} color={COLORS.ink} /></Pressable>;
}

function SellerClients({ customers, onNotice }: { customers: { id: number; name: string; balance: string }[]; onNotice: (message: string) => void }) {
  const visibleCustomers = customers.length ? customers.map((customer, index) => ({ name: customer.name, detail: `Fiado · R$ ${Number(customer.balance).toFixed(2).replace(".", ",")}`, emoji: customer.name.slice(0, 1).toUpperCase(), tone: [COLORS.yellow, "#BDE6D3", "#D8C8F5"][index % 3] })) : [{ name: "Nenhum cliente cadastrado", detail: "Use o assistente para registrar uma venda", emoji: "+", tone: COLORS.coralSoft }];
  const totalOwed = customers.reduce((sum, customer) => sum + Number(customer.balance), 0);
  return <><View style={styles.simpleHeader}><View><Text style={styles.eyebrow}>RELACIONAMENTO</Text><Text style={styles.pageTitle}>Meus clientes</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{customers.length}</Text></View></View><View style={clientStyles.summary}><View><Text style={clientStyles.summaryNumber}>R$ {totalOwed.toFixed(2).replace(".", ",")}</Text><Text style={clientStyles.summaryLabel}>em vendas fiadas</Text></View><MaterialIcons name="account-balance-wallet" size={28} color={COLORS.orange} /></View><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Clientes recentes</Text><Text style={styles.link}>Persistidos</Text></View>{visibleCustomers.map((client) => <View style={clientStyles.row} key={client.name}><View style={[clientStyles.clientAvatar, { backgroundColor: client.tone }]}><Text style={clientStyles.clientAvatarText}>{client.emoji}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{client.name}</Text><Text style={styles.muted}>{client.detail}</Text></View><Pressable style={clientStyles.action} onPress={() => onNotice(`${client.name}: histórico aberto`)}><MaterialIcons name="chevron-right" size={20} color={COLORS.ink} /></Pressable></View>)}<View style={clientStyles.reminder}><MaterialIcons name="notifications-active" size={21} color={COLORS.coral} /><View style={{ flex: 1 }}><Text style={styles.tipTitle}>Lembrete de fiado</Text><Text style={styles.tipText}>Envie uma cobrança amigável para quem está com pagamento pendente.</Text></View><Pressable style={clientStyles.reminderButton} onPress={() => onNotice("Lembrete de cobrança preparado")}><Text style={clientStyles.reminderButtonText}>Preparar</Text></Pressable></View></>;
}

const voiceStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(18, 38, 44, 0.42)", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 28, gap: 12 },
  orb: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 2 },
  orbActive: { backgroundColor: COLORS.ink },
  kicker: { color: COLORS.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, textAlign: "center", marginTop: 3 },
  title: { color: COLORS.ink, fontSize: 24, fontWeight: "900", textAlign: "center" },
  subtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 8 },
  waveform: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 },
  waveformIdle: { opacity: 0.42 },
  waveBar: { width: 4, height: 36, borderRadius: 4, backgroundColor: COLORS.coral },
  voiceState: { color: COLORS.muted, fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: -5 },
  actions: { gap: 9, marginTop: 4 },
  action: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.canvas, borderRadius: 15, padding: 13, borderWidth: 1, borderColor: COLORS.line },
  actionIcon: { fontSize: 20 },
  actionText: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  launcher: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.coralSoft, borderRadius: 18, padding: 13, borderWidth: 1, borderColor: "#FFD8CE" },
  launcherIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" },
  launcherTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  launcherText: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  commandRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.canvas, borderRadius: 15, borderWidth: 1, borderColor: COLORS.line, padding: 6 },
  commandInput: { flex: 1, color: COLORS.ink, fontSize: 13, paddingHorizontal: 8, height: 40 },
  commandButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" },
  listeningButton: { backgroundColor: COLORS.ink },
  reply: { color: COLORS.ink, fontSize: 12, lineHeight: 17, backgroundColor: COLORS.coralSoft, borderRadius: 12, padding: 10 },
});

const clientStyles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF0D7", borderRadius: 20, padding: 18 },
  summaryNumber: { color: COLORS.ink, fontSize: 27, fontWeight: "900" },
  summaryLabel: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.white, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: COLORS.line },
  clientAvatar: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  clientAvatarText: { color: COLORS.ink, fontSize: 15, fontWeight: "900" },
  action: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.coralSoft, alignItems: "center", justifyContent: "center" },
  reminder: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.coralSoft, borderRadius: 18, padding: 14 },
  reminderButton: { backgroundColor: COLORS.coral, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 9 },
  reminderButtonText: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
});


function SellerOnboardingModal({ isAuthenticated, name, phone, address, pixKey, onChangeName, onChangePhone, onChangeAddress, onChangePixKey, onLogin, onCreate, onClose, busy }: { isAuthenticated: boolean; name: string; phone: string; address: string; pixKey: string; onChangeName: (value: string) => void; onChangePhone: (value: string) => void; onChangeAddress: (value: string) => void; onChangePixKey: (value: string) => void; onLogin: () => void; onCreate: () => void; onClose: () => void; busy: boolean }) {
  return <View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.eyebrow}>COMECE A VENDER</Text><Text style={styles.sheetTitle}>Cadastre sua loja</Text><Text style={styles.muted}>Em poucos passos, sua vitrine aparece para clientes próximos.</Text>{!isAuthenticated ? <><View style={onboardingStyles.loginBanner}><MaterialIcons name="lock" size={18} color={COLORS.coral} /><Text style={onboardingStyles.loginText}>Entre para salvar sua loja e acessar os pedidos em qualquer dispositivo.</Text></View><Pressable style={styles.primaryButton} onPress={onLogin}><Text style={styles.primaryButtonText}>Entrar com login seguro</Text><MaterialIcons name="arrow-forward" size={18} color={COLORS.white} /></Pressable></> : <><Text style={styles.fieldLabel}>NOME DA LOJA</Text><TextInput value={name} onChangeText={onChangeName} placeholder="Ex.: Doce Encanto Bakery" placeholderTextColor={COLORS.muted} style={styles.input} /><Text style={styles.fieldLabel}>WHATSAPP / TELEFONE</Text><TextInput value={phone} onChangeText={onChangePhone} placeholder="(11) 99999-9999" placeholderTextColor={COLORS.muted} style={styles.input} keyboardType="phone-pad" /><Text style={styles.fieldLabel}>ENDEREÇO</Text><TextInput value={address} onChangeText={onChangeAddress} placeholder="Rua, número e bairro" placeholderTextColor={COLORS.muted} style={styles.input} /><Text style={styles.fieldLabel}>CHAVE PIX</Text><TextInput value={pixKey} onChangeText={onChangePixKey} placeholder="CPF, telefone ou e-mail" placeholderTextColor={COLORS.muted} style={styles.input} /><Pressable style={[styles.primaryButton, busy && styles.disabledButton]} disabled={busy} onPress={onCreate}><Text style={styles.primaryButtonText}>{busy ? "Salvando..." : "Criar minha loja"}</Text><MaterialIcons name="arrow-forward" size={18} color={COLORS.white} /></Pressable></>}<Pressable style={styles.textButton} onPress={onClose}><Text style={styles.textButtonLabel}>Agora não</Text></Pressable></View></View>;
}

const onboardingStyles = StyleSheet.create({
  loginBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.coralSoft, borderRadius: 15, padding: 13 },
  loginText: { flex: 1, color: COLORS.ink, fontSize: 12, lineHeight: 17 },
});


function SaleModal({ total, customerId, paymentMethod, busy, onChangeTotal, onChangeCustomerId, onChangePaymentMethod, onSubmit, onClose }: { total: string; customerId: string; paymentMethod: "pix" | "card" | "cash" | "fiado"; busy: boolean; onChangeTotal: (value: string) => void; onChangeCustomerId: (value: string) => void; onChangePaymentMethod: (value: "pix" | "card" | "cash" | "fiado") => void; onSubmit: () => void; onClose: () => void }) {
  return <View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.eyebrow}>ASSISTENTE DA LOJA</Text><Text style={styles.sheetTitle}>Registrar venda</Text><Text style={styles.muted}>O lançamento fica salvo no histórico da sua loja.</Text><Text style={styles.fieldLabel}>VALOR DA VENDA</Text><TextInput value={total} onChangeText={onChangeTotal} placeholder="Ex.: 42,00" placeholderTextColor={COLORS.muted} style={styles.input} keyboardType="decimal-pad" /><Text style={styles.fieldLabel}>ID DO CLIENTE (OPCIONAL)</Text><TextInput value={customerId} onChangeText={onChangeCustomerId} placeholder="Necessário para fiado" placeholderTextColor={COLORS.muted} style={styles.input} keyboardType="number-pad" /><Text style={styles.fieldLabel}>FORMA DE PAGAMENTO</Text><View style={saleStyles.methods}>{(["cash", "pix", "card", "fiado"] as const).map((method) => <Pressable key={method} style={[saleStyles.method, paymentMethod === method && saleStyles.methodActive]} onPress={() => onChangePaymentMethod(method)}><Text style={[saleStyles.methodText, paymentMethod === method && saleStyles.methodTextActive]}>{method === "cash" ? "Dinheiro" : method === "pix" ? "PIX" : method === "card" ? "Cartão" : "Fiado"}</Text></Pressable>)}</View><Pressable style={[styles.primaryButton, busy && styles.disabledButton]} disabled={busy} onPress={onSubmit}><Text style={styles.primaryButtonText}>{busy ? "Salvando..." : "Salvar venda"}</Text><MaterialIcons name="check" size={18} color={COLORS.white} /></Pressable><Pressable style={styles.textButton} onPress={onClose}><Text style={styles.textButtonLabel}>Cancelar</Text></Pressable></View></View>;
}

const saleStyles = StyleSheet.create({
  methods: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 5 },
  method: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.white },
  methodActive: { borderColor: COLORS.coral, backgroundColor: COLORS.coralSoft },
  methodText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  methodTextActive: { color: COLORS.coral },
});


const notificationStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line, gap: 9 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: 12, padding: 9 },
  unread: { backgroundColor: COLORS.coralSoft },
});


function CheckoutModal({ addresses, address, paymentMethod, total, busy, onChangeAddress, onSelectAddress, onChangePaymentMethod, onSubmit, onClose }: { addresses: SavedAddress[]; address: string; paymentMethod: "pix" | "card" | "cash"; total: number; busy: boolean; onChangeAddress: (value: string) => void; onSelectAddress: (address: SavedAddress) => void; onChangePaymentMethod: (value: "pix" | "card" | "cash") => void; onSubmit: () => void; onClose: () => void }) {
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.eyebrow}>FINALIZAR PEDIDO</Text><Text style={styles.sheetTitle}>Onde devemos entregar?</Text><Text style={styles.muted}>Escolha um endereço salvo ou informe outro para este pedido.</Text>{addresses.length ? <><Text style={styles.fieldLabel}>ENDEREÇOS SALVOS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={checkoutStyles.savedAddresses}>{addresses.map((savedAddress) => <Pressable key={savedAddress.id} style={[checkoutStyles.savedAddress, address === formatSavedAddress(savedAddress) && checkoutStyles.savedAddressActive]} onPress={() => onSelectAddress(savedAddress)}><Text style={checkoutStyles.savedAddressLabel}>{savedAddress.label}{savedAddress.isDefault ? " · Padrão" : ""}</Text><Text style={checkoutStyles.savedAddressText}>{formatSavedAddress(savedAddress)}</Text></Pressable>)}</ScrollView></> : null}<Text style={styles.fieldLabel}>ENDEREÇO DE ENTREGA</Text><TextInput value={address} onChangeText={onChangeAddress} placeholder="Rua, número, bairro e complemento" placeholderTextColor={COLORS.muted} style={[styles.input, checkoutStyles.addressInput]} multiline returnKeyType="done" /><Text style={styles.fieldLabel}>FORMA DE PAGAMENTO</Text><View style={checkoutStyles.methods}>{(["pix", "card", "cash"] as const).map((method) => <Pressable key={method} style={[checkoutStyles.method, paymentMethod === method && checkoutStyles.methodActive]} onPress={() => onChangePaymentMethod(method)}><MaterialIcons name={method === "pix" ? "pix" : method === "card" ? "credit-card" : "payments"} size={18} color={paymentMethod === method ? COLORS.coral : COLORS.muted} /><Text style={[checkoutStyles.methodText, paymentMethod === method && checkoutStyles.methodTextActive]}>{method === "pix" ? "PIX" : method === "card" ? "Cartão" : "Dinheiro"}</Text></Pressable>)}</View><View style={styles.totalRow}><Text style={styles.totalLabel}>Total do pedido</Text><Text style={styles.totalValue}>{`R$ ${total.toFixed(2).replace(".", ",")}`}</Text></View>{paymentMethod === "pix" ? <Text style={checkoutStyles.note}>Após confirmar, o pedido será criado e o PIX ficará disponível no acompanhamento.</Text> : null}<Pressable style={[styles.primaryButton, busy && styles.disabledButton]} disabled={busy} onPress={onSubmit}><Text style={styles.primaryButtonText}>{busy ? "Enviando pedido..." : "Confirmar pedido"}</Text><MaterialIcons name="check" size={18} color={COLORS.white} /></Pressable><Pressable style={styles.textButton} onPress={onClose}><Text style={styles.textButtonLabel}>Voltar ao carrinho</Text></Pressable></View></KeyboardAvoidingView>;
}

const checkoutStyles = StyleSheet.create({
  addressInput: { minHeight: 70, textAlignVertical: "top", paddingTop: 12 },
  savedAddresses: { gap: 8, paddingBottom: 4 },
  savedAddress: { width: 190, minHeight: 72, borderWidth: 1, borderColor: COLORS.line, borderRadius: 13, backgroundColor: COLORS.white, padding: 10, gap: 3 },
  savedAddressActive: { borderColor: COLORS.coral, backgroundColor: COLORS.coralSoft },
  savedAddressLabel: { color: COLORS.ink, fontSize: 11, fontWeight: "900" },
  savedAddressText: { color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  methods: { flexDirection: "row", gap: 8 },
  method: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: COLORS.line, borderRadius: 13, backgroundColor: COLORS.white },
  methodActive: { borderColor: COLORS.coral, backgroundColor: COLORS.coralSoft },
  methodText: { color: COLORS.muted, fontSize: 11, fontWeight: "800" },
  methodTextActive: { color: COLORS.coral },
  note: { color: COLORS.orange, fontSize: 11, lineHeight: 16, backgroundColor: "#FFF5E8", borderRadius: 10, padding: 9 },
});
