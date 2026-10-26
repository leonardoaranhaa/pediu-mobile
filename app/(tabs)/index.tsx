import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { OpeningHoursEditor } from "@/components/opening-hours-editor";
import { PinMap } from "@/components/pin-map";
import { ProductExtrasFields, type ProductExtras } from "@/components/product-extras-fields";
import { askToJoin } from "@/components/auth-prompt";
import { AssistantChat } from "@/components/assistant-chat";
import { ProfileHome } from "@/components/profile-home";
import { StoreSignupForm } from "@/components/store-signup-form";
import { StoreTour } from "@/components/store-tour";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { edgeModalProps } from "@/components/edge-modal";
import type { AccountAction, SignupRole } from "@/lib/guest-access";
import { geocodeTypedAddress } from "@/lib/location";
import {
  bottomSafeInset,
  scrollPaddingForFloatingBar,
  scrollPaddingForScreenEnd,
} from "@/lib/screen-space";
import {
  brlInputToDecimal,
  decimalToBrlInput,
  decimalToKmInput,
  kmInputToDecimal,
  maskBrazilPhone,
  maskBrlTyping,
} from "@/lib/br-fields";
import { friendlyUserMessage } from "@/lib/user-message";
import type { MascotReaction } from "@/components/pediu-mascot";
import { CartPeek } from "@/components/pediu/cart-peek";
import { PediuMascot } from "@/components/pediu-mascot";
import {
  PediuPressable,
  PediuPulse,
  PediuReveal,
} from "@/components/pediu-motion";
import { PediuV2Discovery } from "@/components/pediu-v2-discovery";
import { ThemePicker } from "@/components/theme-picker";
import { trpc } from "@/lib/trpc";
import type { CartOption } from "@/lib/cart";
import { canRegisterSale, cartTotal, pixPaymentLabel } from "@/lib/pediu-mvp";
import { useCart } from "@/providers/cart-provider";
import { useAppPreferences, type AppTheme } from "@/lib/app-preferences";
import {
  getHomeContext,
  rankHomeProducts,
  type HomeContext,
} from "@/lib/home-context";
import { resolveCurrentLocation } from "@/lib/location";
import { FOOD_ASSETS } from "@/lib/pediu-tokens";

const COLORS = {
  coral: "#E20D2A",
  coralSoft: "#FFE7E7",
  orange: "#FF8A3D",
  ink: "#111111",
  text: "#1A120C",
  muted: "#6E635A",
  canvas: "#FFF4E8",
  white: "#FFFDF9",
  line: "#E9DED3",
  green: "#0B8A5C",
  yellow: "#FFC400",
};

type Product = {
  id: number;
  storeId?: number;
  name: string;
  store: string;
  price: string;
  distance: string;
  category: string;
  description?: string | null;
  imageUrl?: string | null;
  adId?: number | null;
  adHeadline?: string | null;
  adDescription?: string | null;
  adOfferLabel?: string | null;
  emoji: string;
  available: boolean;
  deliveryFee?: string;
  storeKind?: "restaurant" | "market" | "service";
  flashEnabled?: boolean;
  flash?: boolean;
  storeOpen?: boolean;
  nextOpenLabel?: string | null;
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

type SellerCustomer = {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  creditLimit: string;
  balance: string;
  status: string;
};

function formatSavedAddress(address: SavedAddress) {
  return [
    `${address.street}, ${address.number}`,
    address.complement,
    `${address.neighborhood} · ${address.city}/${address.state}`,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

type OrderStatus =
  | "Pendente"
  | "Aceito"
  | "Preparando"
  | "Pronto"
  | "A caminho"
  | "Entregue"
  | "Cancelado";
type VoiceMode = "customer" | "seller";

const CATEGORIES = [
  { label: "Flash 99", query: "__flash__", image: FOOD_ASSETS.burger },
  { label: "Pizza", query: "Pizza", image: FOOD_ASSETS.pizza },
  { label: "Burger", query: "Lanches", image: FOOD_ASSETS.burger },
  { label: "Japonesa", query: "Japonesa", image: FOOD_ASSETS.sushi },
  { label: "Brasileira", query: "Brasileira", image: FOOD_ASSETS.feijoada },
  { label: "Churrasco", query: "Churrasco", image: FOOD_ASSETS.churrasco },
  { label: "Saudável", query: "Saudável", image: FOOD_ASSETS.acai },
];

export default function HomeScreen() {
  const { user, nameConfirmed, isAuthenticated, refresh: refreshAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    theme,
    customization,
    mascotMoment,
    setMascotMoment,
    updateCustomization,
  } = useAppPreferences();
  const params = useLocalSearchParams<{ assistant?: string; tab?: string }>();
  const {
    items: globalCartItems,
    itemCount: globalCartCount,
    addItem: addGlobalItem,
    clear: clearGlobalCart,
  } = useCart();
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [customerTab, setCustomerTab] = useState<
    "discover" | "orders" | "profile"
  >("discover");
  useEffect(() => {
    if (params.tab === "orders" || params.tab === "profile" || params.tab === "discover") {
      setCustomerTab(params.tab);
    }
  }, [params.tab]);
  const [sellerTab, setSellerTab] = useState<
    "home" | "orders" | "catalog" | "clients" | "settings"
  >("home");
  useEffect(() => {
    if (!user?.id) {
      setRole("customer");
      return;
    }
    const roles = user?.roles ?? [];
    const merchant = user?.role === "merchant" || roles.includes("merchant");
    const courier = user?.role === "courier" || roles.includes("courier");
    if (courier && !merchant) {
      router.replace("/courier");
      return;
    }
    setRole(merchant ? "seller" : "customer");
  }, [user?.id, user?.role, user?.roles]);

  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localHour, setLocalHour] = useState(() => new Date().getHours());
  const homeContext = useMemo(
    () => getHomeContext(new Date(2020, 0, 1, localHour)),
    [localHour],
  );
  const effectiveHomeContext = useMemo(
    () =>
      customization.smartHomeEnabled
        ? homeContext
        : {
            ...homeContext,
            greeting: "Olá",
            subtitle:
              "Escolha seus favoritos e descubra o que está disponível.",
            focusLabel: "Ofertas perto de você",
            focusDescription:
              "Mercado, restaurantes e Flash ficam sempre acessíveis.",
          },
    [customization.smartHomeEnabled, homeContext],
  );
  useEffect(() => {
    const timer = setInterval(() => {
      const nextHour = new Date().getHours();
      setLocalHour((current) => (current === nextHour ? current : nextHour));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);
  const marketplaceQuery = trpc.pediu.marketplace.search.useQuery(
    {
      category: category && category !== "__flash__" ? category : undefined,
      flash: category === "__flash__" ? true : undefined,
      query: searchQuery.trim() || undefined,
      limit: 50,
      offset: 0,
    },
    { staleTime: 30_000 },
  );
  const storeQuery = trpc.pediu.stores.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const storeProductsQuery = trpc.pediu.products.mine.useQuery(
    { storeId: storeQuery.data?.id ?? 0 },
    {
      enabled:
        isAuthenticated && role === "seller" && Boolean(storeQuery.data?.id),
      refetchInterval: 15_000,
    },
  );
  const storeOrdersQuery = trpc.pediu.orders.storeMine.useQuery(undefined, {
    enabled: isAuthenticated && role === "seller",
    refetchInterval: 10_000,
  });
  const customerOrdersQuery = trpc.pediu.orders.mine.useQuery(undefined, {
    enabled: isAuthenticated && role === "customer",
    refetchInterval: 5_000,
  });
  const customerAddressesQuery = trpc.pediu.addresses.list.useQuery(undefined, {
    enabled: isAuthenticated && role === "customer",
  });
  const showMascotMoment = (nextReaction: MascotReaction) => {
    setMascotMoment(nextReaction);
    if (mascotResetTimer.current) clearTimeout(mascotResetTimer.current);
    mascotResetTimer.current = setTimeout(
      () => {
        setMascotMoment("hungry");
      },
      nextReaction === "full" ? 7_600 : 3_800,
    );
  };
  const changeCustomerTab = (nextTab: "discover" | "orders" | "profile") => {
    setCustomerTab(nextTab);
    setMascotMoment(
      nextTab === "profile"
        ? "avoid"
        : nextTab === "orders"
          ? "curious"
          : "hungry",
    );
  };
  const changeSellerTab = (
    nextTab: "home" | "orders" | "catalog" | "clients" | "settings",
  ) => {
    setSellerTab(nextTab);
    setMascotMoment(nextTab === "settings" ? "avoid" : "curious");
  };
  const updateOrderStatusMutation = trpc.pediu.orders.status.useMutation({
    onSuccess: () => {
      void storeOrdersQuery.refetch();
      void customerOrdersQuery.refetch();
    },
    onError: (error) => notify(friendlyUserMessage(error.message)),
  });
  const clientsQuery = trpc.pediu.clients.mine.useQuery(undefined, {
    enabled: isAuthenticated && role === "seller",
  });
  const salesQuery = trpc.pediu.sales.mine.useQuery(undefined, {
    enabled: isAuthenticated && role === "seller",
  });
  const notificationsQuery = trpc.pediu.notifications.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createPixMutation = trpc.pediu.payments.createPix.useMutation({
    onError: (error) => notifyWithHaptic(friendlyUserMessage(error.message), false),
  });
  const createOrderMutation = trpc.pediu.orders.create.useMutation({
    onSuccess: (result) => {
      if (checkoutPayment === "pix") {
        createPixMutation.mutate(
          { orderId: result.orderId },
          {
            onSuccess: (charge) => {
              clearGlobalCart();
              showMascotMoment("full");
              setShowCheckout(false);
              setShowCart(false);
              setPixPaymentPending(charge.status === "pending");
              changeCustomerTab("orders");
              void customerOrdersQuery.refetch();
              void notifyWithHaptic(
                charge.status === "pending"
                  ? "Pedido enviado. PIX aguardando confirmação"
                  : charge.status === "paid"
                    ? "Pedido enviado. PIX confirmado"
                    : charge.status === "cancelled"
                      ? "Cobrança PIX cancelada"
                      : "Cobrança PIX recusada",
              );
              void scheduleOrderNotification(
                charge.status === "pending"
                  ? "Seu pedido foi enviado e o PIX está aguardando confirmação."
                  : "Seu pedido foi enviado. Consulte o status do pagamento.",
              );
              router.push({
                pathname: "/order/track",
                params: {
                  orderId: String(result.orderId),
                  paymentId: String(charge.paymentId),
                  pixUrl: charge.ticketUrl ?? "",
                },
              });
            },
          },
        );
        return;
      }

      clearGlobalCart();
      showMascotMoment("full");
      setShowCheckout(false);
      setShowCart(false);
      setPixPaymentPending(false);
      changeCustomerTab("orders");
      void customerOrdersQuery.refetch();
      void notifyWithHaptic("Pedido enviado para a loja");
      void scheduleOrderNotification(
        "Seu pedido foi enviado e aguarda confirmação da loja.",
      );
      router.push({
        pathname: "/order/track",
        params: { orderId: String(result.orderId) },
      });
    },
    onError: (error) => notifyWithHaptic(friendlyUserMessage(error.message), false),
  });
  const voiceMutation = trpc.pediu.voice.interpret.useMutation();
  const transcribeMutation = trpc.pediu.voice.transcribe.useMutation();
  const createSaleMutation = trpc.pediu.sales.create.useMutation({
    onSuccess: () => {
      setShowSaleModal(false);
      setSaleTotal("");
      setSaleCustomerId("");
      void salesQuery.refetch();
      notify("Venda registrada com sucesso");
    },
  });
  const addLedgerMutation = trpc.pediu.ledger.add.useMutation();
  const createClientMutation = trpc.pediu.clients.create.useMutation({
    onSuccess: () => {
      void clientsQuery.refetch();
      notify("Cliente salvo no relacionamento");
    },
    onError: (error) => notify(friendlyUserMessage(error.message)),
  });
  const setClientLimitMutation = trpc.pediu.credit.setLimit.useMutation({
    onSuccess: () => {
      void clientsQuery.refetch();
      notify("Limite de fiado atualizado");
    },
    onError: (error) => notify(friendlyUserMessage(error.message)),
  });
  const blockClientMutation = trpc.pediu.credit.block.useMutation({
    onSuccess: () => {
      void clientsQuery.refetch();
      notify("Status do cliente atualizado");
    },
    onError: (error) => notify(friendlyUserMessage(error.message)),
  });
  const registerPushMutation = trpc.pediu.notifications.register.useMutation();
  const markNotificationMutation =
    trpc.pediu.notifications.markRead.useMutation({
      onSuccess: () => {
        void notificationsQuery.refetch();
      },
    });
  const createStoreMutation = trpc.pediu.stores.create.useMutation({
    onSuccess: async () => {
      setShowSellerOnboarding(false);
      setRole("seller");
      changeSellerTab("home");
      await refreshAuth();
      void storeQuery.refetch();
      notify("Sua loja foi criada");
    },
  });
  const createProductMutation = trpc.pediu.products.create.useMutation({
    onSuccess: () => {
      setNewProductName("");
      setNewProductPrice("");
      setNewProductCategory("Doces");
      setNewProductDescription("");
      setShowAddProduct(false);
      void storeProductsQuery.refetch();
      notify("Produto salvo no catálogo");
    },
    onError: (error) => notify(friendlyUserMessage(error.message)),
  });
  const updateProductAvailabilityMutation =
    trpc.pediu.products.availability.useMutation({
      onSuccess: () => {
        void storeProductsQuery.refetch();
      },
      onError: (error) => notify(friendlyUserMessage(error.message)),
    });
  const updateStoreMutation = trpc.pediu.stores.update.useMutation({
    onSuccess: () => {
      void storeQuery.refetch();
      notify("Configurações da loja atualizadas");
    },
    onError: (error) => notify(friendlyUserMessage(error.message)),
  });
  const cart = useMemo<Product[]>(
    () =>
      globalCartItems.flatMap((item) =>
        Array.from({ length: item.quantity }, () => ({
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
          storeKind: item.storeKind,
          flashEnabled: Boolean(item.flashEnabled),
        })),
      ),
    [globalCartItems],
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddressId, setDeliveryAddressId] = useState<
    number | undefined
  >();
  const [checkoutIdempotencyKey] = useState(
    () =>
      `legacy-checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const [checkoutPayment, setCheckoutPayment] = useState<"pix" | "cash">("pix");
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
  const [salePaymentMethod, setSalePaymentMethod] = useState<
    "pix" | "cash" | "fiado"
  >("cash");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Doces");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [productExtras, setProductExtras] = useState<ProductExtras>({});
  const [notice, setNotice] = useState("");
  const [pixPaymentPending, setPixPaymentPending] = useState(false);
  const [locationLabel, setLocationLabel] = useState("Usar minha localização");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const cartScale = useRef(new Animated.Value(1)).current;
  const mascotResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantAutoOpened = useRef(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(
    () => () => {
      if (mascotResetTimer.current) clearTimeout(mascotResetTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (
      params.assistant !== "seller" ||
      role !== "seller" ||
      showVoice ||
      assistantAutoOpened.current
    )
      return;
    assistantAutoOpened.current = true;
    setVoiceMode("seller");
    setShowVoice(true);
    router.setParams({ assistant: undefined } as never);
  }, [params.assistant, role, showVoice]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selectedProduct) {
        setSelectedProduct(null);
        return true;
      }
      if (showCheckout) {
        Alert.alert(
          "Sair do pedido?",
          "Seu carrinho continua salvo. O pedido ainda não foi enviado.",
          [
            { text: "Continuar pedido", style: "cancel" },
            { text: "Sair", onPress: () => setShowCheckout(false) },
          ],
        );
        return true;
      }
      if (showCart) {
        setShowCart(false);
        return true;
      }
      if (showAddProduct) {
        setShowAddProduct(false);
        return true;
      }
      if (showVoice) {
        setShowVoice(false);
        return true;
      }
      if (showSaleModal) {
        setShowSaleModal(false);
        return true;
      }
      if (showSellerOnboarding) {
        setShowSellerOnboarding(false);
        return true;
      }
      if (role === "customer" && customerTab !== "discover") {
        changeCustomerTab("discover");
        return true;
      }
      if (role === "seller" && sellerTab !== "home") {
        changeSellerTab("home");
        return true;
      }
      Alert.alert("Sair do Pediu?", "Você pode voltar quando quiser.", [
        { text: "Ficar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });
    return () => subscription.remove();
  }, [
    customerTab,
    role,
    selectedProduct,
    sellerTab,
    showAddProduct,
    showCart,
    showCheckout,
    showSaleModal,
    showSellerOnboarding,
    showVoice,
  ]),
  );

  useEffect(() => {
    Animated.sequence([
      Animated.timing(screenOpacity, {
        toValue: 0.72,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [customerTab, role, sellerTab, screenOpacity]);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;
    void (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        const finalPermission = permission.granted
          ? permission
          : await Notifications.requestPermissionsAsync();
        if (!finalPermission.granted) return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await registerPushMutation.mutateAsync({
          token,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
      } catch {
        // Push registration depends on a physical device and native credentials.
      }
    })();
  }, [isAuthenticated, registerPushMutation]);

  const notifyWithHaptic = async (message: string, success = true) => {
    notify(message);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(
        success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    }
  };

  const scheduleOrderNotification = async (body: string) => {
    if (Platform.OS === "web") return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) return;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: "Pediu", body, sound: "default" },
      trigger: null,
    });
  };

  const requestLocation = async () => {
    setLocationLoading(true);
    if (Platform.OS === "web") {
      setLocationLabel("Localização disponível no app");
      notify("Abra o Pediu no celular para usar o GPS");
      setLocationLoading(false);
      return;
    }
    try {
      const resolved = await resolveCurrentLocation();
      setLocationLabel(resolved.shortAddress);
      setLocationAddress(resolved.address);
      if (!customization.locationEnabled) {
        updateCustomization({ locationEnabled: true });
      }
      notify("Endereço atualizado automaticamente");
    } catch (error) {
      notifyWithHaptic(
        error instanceof Error
          ? friendlyUserMessage(error.message)
          : "Não foi possível localizar você",
        false,
      );
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!customization.locationEnabled) return;
    void Location.getForegroundPermissionsAsync().then((permission) => {
      if (!permission.granted) return;
      void resolveCurrentLocation()
        .then((resolved) => {
          setLocationLabel(resolved.shortAddress);
          setLocationAddress(resolved.address);
        })
        .catch(() => undefined);
    });
  }, [customization.locationEnabled]);

  const liveProducts = useMemo(
    () =>
      (marketplaceQuery.data?.items ?? []).map((product) => ({
        id: product.id,
        storeId: product.storeId,
        name: product.name,
        store: product.storeName,
        price: `R$ ${Number(product.price).toFixed(2).replace(".", ",")}`,
        distance: "perto de você",
        category: product.category,
        description: product.description,
        imageUrl: product.imageData || product.adImageUrl,
        adId: product.adId,
        adHeadline: product.adHeadline,
        adDescription: product.adDescription,
        adOfferLabel: product.adOfferLabel,
        emoji:
          product.category === "Lanches"
            ? "🍔"
            : product.category === "Pizza"
              ? "🍕"
              : product.category === "Doces"
                ? "🍰"
                : product.category === "Serviços"
                  ? "🛠️"
                  : "🍽️",
        available: Boolean(product.available),
        storeOpen: product.storeOpen,
        nextOpenLabel: product.nextOpenLabel,
        deliveryFee: product.deliveryFee,
        storeKind: product.storeKind,
        flashEnabled: Boolean(product.flashEnabled),
        flash: Boolean(product.flashEnabled),
      })),
    [marketplaceQuery.data],
  );

  const filteredProducts = useMemo(
    () =>
      customization.smartHomeEnabled
        ? rankHomeProducts(
            liveProducts.filter(
              (product) =>
                !category ||
                (category === "__flash__"
                  ? product.flash
                  : product.category === category),
            ),
            homeContext,
          )
        : liveProducts.filter(
            (product) =>
              !category ||
              (category === "__flash__"
                ? product.flash
                : product.category === category),
          ),
    [category, customization.smartHomeEnabled, homeContext, liveProducts],
  );
  const activeCustomerOrder = useMemo(
    () =>
      (customerOrdersQuery.data ?? []).find(
        (order) => !["Entregue", "Cancelado"].includes(order.status),
      ),
    [customerOrdersQuery.data],
  );

  const notify = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2400);
  };

  const requestLogin = (action: AccountAction = "account", role?: SignupRole) => {
    askToJoin({ action, role, returnTo: "/(tabs)" });
  };

  const addToCart = (product: Product, options: CartOption[] = [], unitPrice?: string) => {
    if (!product.available) {
      void notifyWithHaptic("Este produto está esgotado", false);
      return;
    }
    if (product.storeOpen === false) {
      void notifyWithHaptic(product.nextOpenLabel || "Fechada no momento", false);
      return;
    }
    if (!isAuthenticated) {
      requestLogin("cart");
      return;
    }
    const optionLabel = options.map((option) => option.name).join(", ");
    const result = addGlobalItem({
      id: product.id,
      storeId: product.storeId ?? 0,
      name: optionLabel ? `${product.name} (${optionLabel})` : product.name,
      storeName: product.store,
      category: product.category,
      price: unitPrice ?? String(cartTotal([product.price]).toFixed(2)),
      deliveryFee: String(product.deliveryFee ?? "0.00"),
      emoji: product.emoji,
      storeKind: product.storeKind,
      flashEnabled: Boolean(product.flashEnabled),
      options,
    });
    if (!result.ok) {
      notify(result.error ?? "Não foi possível adicionar o produto");
      return;
    }
    setSelectedProduct(null);
    showMascotMoment("happy");
    Animated.sequence([
      Animated.timing(cartScale, {
        toValue: 1.18,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(cartScale, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    void notifyWithHaptic("Adicionado ao seu pedido");
  };

  const openCheckout = () => {
    if (!cart.length) return;
    if (!isAuthenticated) {
      requestLogin("checkout");
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
    const itemsTotal = globalCartItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );
    const deliveryFee = Number(globalCartItems[0]?.deliveryFee ?? 0);
    const total = (itemsTotal + deliveryFee).toFixed(2);
    createOrderMutation.mutate({
      idempotencyKey: checkoutIdempotencyKey,
      storeId: globalCartItems[0]?.storeId ?? 1,
      total,
      paymentMethod: checkoutPayment,
      addressId: deliveryAddressId,
      deliveryAddress: deliveryAddress.trim(),
      items: globalCartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.price).toFixed(2),
        note: item.note,
        optionIds: item.options?.map((option) => option.id),
      })),
    });
  };

  const sellerProducts = useMemo(
    () =>
      (storeProductsQuery.data ?? []).map((product) => ({
        id: product.id,
        storeId: product.storeId,
        name: product.name,
        store: storeQuery.data?.name ?? "Minha loja",
        price: `R$ ${Number(product.price).toFixed(2).replace(".", ",")}`,
        distance: "sua loja",
        category: product.category,
        description: product.description,
        emoji:
          product.category === "Lanches"
            ? "🍔"
            : product.category === "Serviços"
              ? "🛠️"
              : "🍰",
        available: Boolean(product.available),
        deliveryFee: "0.00",
      })),
    [storeProductsQuery.data, storeQuery.data?.name],
  );

  const shareStoreCatalog = async () => {
    const store = storeQuery.data;
    if (!store) {
      notify("Cadastre sua loja antes de divulgar");
      return;
    }
    const products = sellerProducts
      .filter((product) => product.available)
      .slice(0, 20);
    const lines = products.length
      ? products
          .map((product) => `• ${product.name} — ${product.price}`)
          .join("\n")
      : "Catálogo em atualização. Fale com a loja para conhecer as opções.";
    const message = `${store.name}\n${store.address ? `${store.address}\n` : ""}\nPeça pelo Pediu:\n${lines}`;
    try {
      await Share.share({ message, title: `Catálogo ${store.name}` });
      notify("Catálogo pronto para compartilhar");
    } catch {
      notify("Não foi possível abrir o compartilhamento");
    }
  };

  const addProduct = () => {
    const price = newProductPrice.replace(",", ".").trim();
    const storeId = storeQuery.data?.id;
    if (
      !storeId ||
      !newProductName.trim() ||
      !/^\d+(\.\d{1,2})?$/.test(price)
    ) {
      notify("Informe nome, categoria e um preço válido");
      return;
    }
    createProductMutation.mutate({
      storeId,
      name: newProductName.trim(),
      category: newProductCategory.trim() || "Geral",
      description: newProductDescription.trim() || undefined,
      price,
      imageData: productExtras.imageData,
      optionGroups: productExtras.optionGroups,
    });
  };

  const openVoiceAssistant = (mode: VoiceMode) => {
    setVoiceMode(mode);
    setShowVoice(true);
  };

  const handleVoiceAction = (action: string) => {
    setShowVoice(false);
    if (action === "doces") {
      if (role !== "customer") return;
      changeCustomerTab("discover");
      setCategory("Doces");
      void notifyWithHaptic("Encontrei doces perto de você");
      return;
    }
    if (action === "pedidos") {
      if (role !== "customer") return;
      changeCustomerTab("orders");
      return;
    }
    if (action === "suporte") {
      router.push("/support");
      return;
    }
    if (role !== "seller") return;
    if (action === "venda") {
      changeSellerTab("home");
      setShowSaleModal(true);
      return;
    }
    if (action === "fiado") {
      changeSellerTab("clients");
      void notifyWithHaptic("Abrindo clientes e vendas fiadas");
      return;
    }
    if (action === "catalogo") {
      changeSellerTab("catalog");
      return;
    }
    if (action === "divulgar") {
      changeSellerTab("home");
      void shareStoreCatalog();
    }
    void notifyWithHaptic("Ação não reconhecida", false);
  };

  const handleVoiceCommand = async (command: string) => {
    if (!command.trim()) return;
    setVoiceReply("Entendendo seu pedido...");
    try {
      const result = await voiceMutation.mutateAsync({
        mode: voiceMode,
        command,
      });
      setVoiceReply(result.reply);
      if (result.action !== "fallback") handleVoiceAction(result.action);
    } catch {
      setVoiceReply(
        "Não consegui conectar ao assistente. Use uma das ações rápidas.",
      );
    }
  };

  const toggleNativeRecording = async () => {
    if (Platform.OS === "web") return;
    if (recorderState.isRecording) {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return;
      setVoiceReply("Transcrevendo seu áudio...");
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      try {
        const result = await transcribeMutation.mutateAsync({
          audioBase64,
          mimeType: "audio/m4a",
        });
        await handleVoiceCommand(result.text);
      } catch {
        setVoiceReply(
          "Não consegui transcrever o áudio. Tente novamente ou digite o comando.",
        );
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
      void notifyWithHaptic(
        salePaymentMethod === "fiado"
          ? "Escolha o cliente para lançar no fiado"
          : "Informe um valor válido",
      );
      return;
    }
    createSaleMutation.mutate(
      {
        total: normalizedTotal,
        customerId,
        paymentMethod: salePaymentMethod,
      },
      {
        onSuccess: () => {
          if (salePaymentMethod === "fiado" && customerId) {
            addLedgerMutation.mutate({
              customerId,
              type: "credit",
              amount: normalizedTotal,
              note: "Venda fiada",
            });
          }
        },
        onError: (error) => notify(friendlyUserMessage(error.message)),
      },
    );
  };

  const createStore = () => {
    if (!isAuthenticated) {
      requestLogin("seller", "merchant");
      return;
    }
    if (!storeName.trim()) return;
    createStoreMutation.mutate({
      name: storeName.trim(),
      phone: storePhone.trim() || undefined,
      address: storeAddress.trim() || undefined,
      pixKey: storePixKey.trim() || undefined,
      deliveryFee: "0.00",
    });
  };

  const createClient = (input: {
    name: string;
    phone?: string;
    notes?: string;
    creditLimit: string;
  }) => {
    createClientMutation.mutate(input);
  };

  const updateClientLimit = (customerId: number, creditLimit: string) => {
    setClientLimitMutation.mutate({ customerId, creditLimit });
  };

  const toggleClientBlock = (customerId: number, blocked: boolean) => {
    blockClientMutation.mutate({ customerId, blocked });
  };

  const updateStore = (input: {
    name?: string;
    phone?: string;
    address?: string;
    pixKey?: string;
    deliveryFee?: string;
    deliveryEnabled?: boolean;
    pickupEnabled?: boolean;
    deliveryRadiusKm?: string;
    latitude?: number | null;
    longitude?: number | null;
    isOpen?: boolean;
    openingHours?: string;
  }) => {
    updateStoreMutation.mutate(input);
  };

  return (
    <ScreenContainer
      backgroundColor={theme.canvas}
      edges={["top", "left", "right"]}
    >
      <Animated.View
        style={[
          styles.appShell,
          { opacity: screenOpacity, backgroundColor: theme.canvas },
        ]}
      >
        <FloatingDecorations />
        {role === "customer" ? (
          <>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: scrollPaddingForFloatingBar(insets.bottom, Platform.OS) },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {customerTab === "discover" && (
                <CustomerDiscover
                  products={filteredProducts}
                  loading={marketplaceQuery.isLoading}
                  error={marketplaceQuery.isError}
                  homeContext={effectiveHomeContext}
                  motionEnabled={customization.motionEnabled}
                  userName={nameConfirmed ? user?.name : null}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onProductPress={setSelectedProduct}
                  locationLabel={locationLabel}
                  locationAddress={locationAddress}
                  locationLoading={locationLoading}
                  theme={theme}
                  onLocationPress={requestLocation}
                  onAssistant={() => openVoiceAssistant("customer")}
                  onOrders={() => changeCustomerTab("orders")}
                  onBenefits={() => router.push("/coupons")}
                  onMarket={() => router.push("/market")}
                  onSearch={() => router.push("/search")}
                  onCategory={setCategory}
                  activeOrder={activeCustomerOrder}
                  onActiveOrder={() => {
                    if (!activeCustomerOrder) return;
                    router.push({
                      pathname: "/order/track",
                      params: { orderId: String(activeCustomerOrder.id) },
                    });
                  }}
                  notifications={notificationsQuery.data ?? []}
                  onReadNotification={(id) =>
                    markNotificationMutation.mutate({ notificationId: id })
                  }
                  mascot={
                    customization.mascotEnabled ? (
                      <PediuMascot
                        theme={theme}
                        styleId={customization.mascotStyle}
                        reaction={mascotMoment?.reaction ?? "hungry"}
                        motionEnabled={customization.motionEnabled}
                        compact
                        programmed={false}
                        showSpeech={false}
                        onPress={() => openVoiceAssistant("customer")}
                      />
                    ) : null
                  }
                />
              )}
              {customerTab === "orders" && (
                <CustomerOrders
                  orders={customerOrdersQuery.data ?? []}
                  loading={customerOrdersQuery.isLoading}
                  isAuthenticated={isAuthenticated}
                  onLogin={() => requestLogin("orders")}
                  onCancel={(orderId) =>
                    updateOrderStatusMutation.mutate({
                      orderId,
                      status: "Cancelado",
                    })
                  }
                  onDiscover={() => changeCustomerTab("discover")}
                />
              )}
              {customerTab === "profile" && <ProfileHome />}
            </ScrollView>
            <CartPeek
              itemCount={globalCartCount}
              subtitle={globalCartItems[0]?.storeName}
              totalLabel={`R$ ${cartTotal(cart.map((item) => item.price))
                .toFixed(2)
                .replace(".", ",")}`}
              onPress={() => router.push("/cart")}
            />
            <CustomerNav
              active={customerTab}
              onChange={changeCustomerTab}
              onSearch={() => router.push("/search")}
              bottomInset={insets.bottom}
              theme={theme}
            />
          </>
        ) : (
          <>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: scrollPaddingForFloatingBar(insets.bottom, Platform.OS) },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {sellerTab === "home" && (
                <>
                  <SellerHome
                    theme={theme}
                    store={storeQuery.data}
                    ownerName={user?.name}
                    orders={storeOrdersQuery.data ?? []}
                    productCount={sellerProducts.length}
                    salesTotal={(salesQuery.data ?? []).reduce(
                      (sum, sale) => sum + Number(sale.total),
                      0,
                    )}
                    onCatalog={() => changeSellerTab("catalog")}
                    onOrders={() => changeSellerTab("orders")}
                    onClients={() => changeSellerTab("clients")}
                    onShareCatalog={() => void shareStoreCatalog()}
                    onAds={() => router.push("/seller/ads")}
                    onVoice={() => openVoiceAssistant("seller")}
                  />
                  <SellerVoiceLauncher
                    onPress={() => openVoiceAssistant("seller")}
                  />
                </>
              )}
              {sellerTab === "orders" && (
                <SellerOrders
                  orders={storeOrdersQuery.data ?? []}
                  onUpdateStatus={(orderId, status) =>
                    updateOrderStatusMutation.mutate({ orderId, status })
                  }
                  onCallCourier={(orderId) =>
                    router.push({
                      pathname: "/seller/delivery",
                      params: { orderId: String(orderId) },
                    })
                  }
                />
              )}
              {sellerTab === "catalog" && (
                <SellerCatalog
                  products={sellerProducts}
                  loading={storeProductsQuery.isLoading}
                  onAdd={() => setShowAddProduct(true)}
                  onToggle={(id, available) =>
                    updateProductAvailabilityMutation.mutate({
                      productId: id,
                      available,
                    })
                  }
                  onShare={shareStoreCatalog}
                />
              )}
              {sellerTab === "clients" && (
                <SellerClients
                  customers={clientsQuery.data ?? []}
                  onCreate={createClient}
                  creating={createClientMutation.isPending}
                  onSetLimit={updateClientLimit}
                  onBlock={toggleClientBlock}
                  busy={
                    setClientLimitMutation.isPending ||
                    blockClientMutation.isPending
                  }
                />
              )}
              {sellerTab === "settings" && (
                <SellerSettings
                  store={storeQuery.data}
                  salesCount={salesQuery.data?.length ?? 0}
                  onSave={updateStore}
                  saving={updateStoreMutation.isPending}
                  onAssistant={() => openVoiceAssistant("seller")}
                />
              )}
            </ScrollView>
            <SellerNav
              active={sellerTab}
              onChange={changeSellerTab}
              bottomInset={insets.bottom}
              theme={theme}
            />
          </>
        )}

        {notice ? (
          <View style={styles.toast}>
            <MaterialIcons name="check-circle" size={18} color={COLORS.white} />
            <Text style={styles.toastText}>{notice}</Text>
          </View>
        ) : null}

        {role === "seller" && sellerTab === "home" && user?.id && storeQuery.data ? (
          <StoreTour userId={user.id} storeName={storeQuery.data.name} />
        ) : null}

        <Modal
          visible={!!selectedProduct}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedProduct(null)}
          {...edgeModalProps}
        >
          {selectedProduct ? (
            <ProductModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onAdd={(options, unitPrice) => addToCart(selectedProduct, options, unitPrice)}
            />
          ) : null}
        </Modal>

        <Modal
          visible={showCart}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCart(false)}
          {...edgeModalProps}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.sheet, styles.sheetTall, { paddingBottom: bottomSafeInset(insets.bottom, Platform.OS) }]}>
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Seu pedido</Text>
                {cart.length ? (
                  cart.map((item, index) => (
                    <View style={styles.cartRow} key={`${item.id}-${index}`}>
                      <Text style={styles.cartEmoji}>{item.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.muted}>{item.store}</Text>
                      </View>
                      <Text style={styles.price}>{item.price}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Seu pedido está vazio.</Text>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{`R$ ${cartTotal(
                    cart.map((item) => item.price),
                  )
                    .toFixed(2)
                    .replace(".", ",")}`}</Text>
                </View>
                {cart.length ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Entrega</Text>
                    <Text style={styles.totalValue}>{`R$ ${Number(
                      cart[0]?.deliveryFee ?? 0,
                    )
                      .toFixed(2)
                      .replace(".", ",")}`}</Text>
                  </View>
                ) : null}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total do pedido</Text>
                  <Text
                    style={styles.totalValue}
                  >{`R$ ${(cartTotal(cart.map((item) => item.price)) + Number(cart[0]?.deliveryFee ?? 0)).toFixed(2).replace(".", ",")}`}</Text>
                </View>
                {cart.length && !pixPaymentPending ? (
                  <Pressable
                    style={paymentStyles.pixButton}
                    onPress={() => {
                      setPixPaymentPending(true);
                      void notifyWithHaptic(
                        "Cobrança PIX criada e aguardando confirmação",
                      );
                    }}
                  >
                    <MaterialIcons name="pix" size={18} color={COLORS.ink} />
                    <Text style={paymentStyles.pixButtonText}>
                      {pixPaymentLabel("idle")}
                    </Text>
                  </Pressable>
                ) : null}
                {pixPaymentPending ? (
                  <View style={paymentStyles.pending}>
                    <MaterialIcons
                      name="schedule"
                      size={18}
                      color={COLORS.orange}
                    />
                    <Text style={paymentStyles.pendingText}>
                      {pixPaymentLabel("pending")}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                    !cart.length && styles.disabledButton,
                  ]}
                  disabled={!cart.length}
                  onPress={openCheckout}
                >
                  <Text style={styles.primaryButtonText}>
                    Continuar para entrega
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.white}
                  />
                </Pressable>
                <Pressable
                  style={styles.textButton}
                  onPress={() => setShowCart(false)}
                >
                  <Text style={styles.textButtonLabel}>
                    Continuar escolhendo
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showCheckout}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCheckout(false)}
          {...edgeModalProps}
        >
          <CheckoutModal
            addresses={customerAddressesQuery.data ?? []}
            address={deliveryAddress}
            paymentMethod={checkoutPayment}
            total={
              cartTotal(cart.map((item) => item.price)) +
              Number(cart[0]?.deliveryFee ?? 0)
            }
            busy={createOrderMutation.isPending || createPixMutation.isPending}
            onChangeAddress={(value) => {
              setDeliveryAddressId(undefined);
              setDeliveryAddress(value);
            }}
            onSelectAddress={(savedAddress) => {
              setDeliveryAddressId(savedAddress.id);
              setDeliveryAddress(formatSavedAddress(savedAddress));
            }}
            onChangePaymentMethod={setCheckoutPayment}
            onSubmit={submitOrder}
            onClose={() => setShowCheckout(false)}
          />
        </Modal>

        <Modal
          visible={showAddProduct}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddProduct(false)}
          {...edgeModalProps}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.sheet, styles.sheetTall, { paddingBottom: bottomSafeInset(insets.bottom, Platform.OS) }]}>
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Novo produto</Text>
                <Text style={styles.fieldLabel}>NOME DO PRODUTO</Text>
                <TextInput
                  value={newProductName}
                  onChangeText={setNewProductName}
                  placeholder="Ex.: Torta de morango"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>CATEGORIA</Text>
                <TextInput
                  value={newProductCategory}
                  onChangeText={setNewProductCategory}
                  placeholder="Ex.: Doces"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>PREÇO</Text>
                <TextInput
                  value={newProductPrice}
                  onChangeText={setNewProductPrice}
                  placeholder="Ex.: 18,00"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.fieldLabel}>DESCRIÇÃO (OPCIONAL)</Text>
                <TextInput
                  value={newProductDescription}
                  onChangeText={setNewProductDescription}
                  placeholder="Ex.: Serve duas pessoas"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                  multiline
                />
                <ProductExtrasFields onChange={setProductExtras} />
                <Pressable
                  style={[
                    styles.primaryButton,
                    createProductMutation.isPending && styles.disabledButton,
                  ]}
                  disabled={createProductMutation.isPending}
                  onPress={addProduct}
                >
                  <Text style={styles.primaryButtonText}>
                    {createProductMutation.isPending
                      ? "Salvando..."
                      : "Adicionar ao catálogo"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.textButton}
                  onPress={() => setShowAddProduct(false)}
                >
                  <Text style={styles.textButtonLabel}>Cancelar</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showVoice}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVoice(false)}
          {...edgeModalProps}
        >
          <AssistantChat
            audience={role === "seller" ? "merchant" : isAuthenticated ? "customer" : "guest"}
            onClose={() => setShowVoice(false)}
            onNavigate={(target) => {
              if (target.screen === "orders") changeCustomerTab("orders");
              if (target.screen === "cart") setShowCart(true);
              if (target.screen === "catalog") changeSellerTab("catalog");
              if (target.screen === "store_orders") changeSellerTab("orders");
              if (target.screen === "track" && target.orderId) {
                setShowVoice(false);
                router.push({ pathname: "/order/track", params: { orderId: String(target.orderId) } });
              }
            }}
          />
        </Modal>

        <Modal
          visible={showSaleModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSaleModal(false)}
          {...edgeModalProps}
        >
          <SaleModal
            customers={clientsQuery.data ?? []}
            total={saleTotal}
            customerId={saleCustomerId}
            paymentMethod={salePaymentMethod}
            busy={createSaleMutation.isPending || addLedgerMutation.isPending}
            onChangeTotal={setSaleTotal}
            onChangeCustomerId={setSaleCustomerId}
            onChangePaymentMethod={setSalePaymentMethod}
            onSubmit={submitSale}
            onClose={() => setShowSaleModal(false)}
          />
        </Modal>

        <Modal
          visible={showSellerOnboarding}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSellerOnboarding(false)}
          {...edgeModalProps}
        >
          <View style={styles.modalBackdrop}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: scrollPaddingForScreenEnd(insets.bottom, Platform.OS) }}>
              {isAuthenticated ? (
                <StoreSignupForm
                  onCreated={() => {
                    setShowSellerOnboarding(false);
                    void storeQuery.refetch();
                  }}
                  onClose={() => setShowSellerOnboarding(false)}
                />
              ) : (
                <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 8 }}>
                  <Text style={styles.cardTitle}>Entre para cadastrar a loja</Text>
                  <Pressable onPress={() => requestLogin("seller", "merchant")}>
                    <Text style={styles.link}>Criar conta da loja</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowSellerOnboarding(false)}>
                    <Text style={styles.link}>Agora não</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      </Animated.View>
    </ScreenContainer>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <View style={[styles.brandMark, small && styles.brandMarkSmall]}>
      <Text style={[styles.brandMarkText, small && styles.brandMarkTextSmall]}>
        p
      </Text>
    </View>
  );
}

function FloatingDecorations() {
  const first = useRef(new Animated.Value(0)).current;
  const second = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const firstLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(first, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(first, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const secondLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(second, {
          toValue: 1,
          duration: 4100,
          delay: 300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(second, {
          toValue: 0,
          duration: 4100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    firstLoop.start();
    secondLoop.start();
    return () => {
      firstLoop.stop();
      secondLoop.stop();
    };
  }, [first, second]);

  return (
    <View pointerEvents="none" style={styles.decorLayer}>
      <Animated.View
        style={[
          styles.floatingBlob,
          styles.floatingBlobOne,
          {
            transform: [
              {
                translateY: first.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 18],
                }),
              },
              { rotate: "18deg" },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingBlob,
          styles.floatingBlobTwo,
          {
            transform: [
              {
                translateY: second.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -14],
                }),
              },
              { rotate: "-12deg" },
            ],
          },
        ]}
      />
    </View>
  );
}

function CustomerDiscover({
  products,
  loading,
  error,
  homeContext,
  motionEnabled,
  userName,
  searchQuery,
  setSearchQuery,
  onProductPress,
  locationLabel,
  locationAddress,
  locationLoading,
  onLocationPress,
  onAssistant,
  onOrders,
  onBenefits,
  onMarket,
  onSearch,
  onCategory,
  activeOrder,
  onActiveOrder,
  notifications,
  onReadNotification,
  theme,
  mascot,
}: {
  products: Product[];
  loading: boolean;
  error: boolean;
  homeContext: HomeContext;
  motionEnabled: boolean;
  userName?: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onProductPress: (product: Product) => void;
  locationLabel: string;
  locationAddress: string;
  locationLoading: boolean;
  onLocationPress: () => void;
  onAssistant: () => void;
  onOrders: () => void;
  onBenefits: () => void;
  onMarket: () => void;
  onSearch: () => void;
  onCategory: (value: string) => void;
  activeOrder?: { id: number; status: string };
  onActiveOrder: () => void;
  notifications: {
    id: number;
    title: string;
    body: string;
    readAt: Date | string | null;
    actionPath?: string | null;
  }[];
  onReadNotification: (notificationId: number) => void;
  theme: AppTheme;
  mascot?: ReactNode;
}) {
  const firstName = userName?.trim().split(/\s+/)[0];
  return (
    <>
      <PediuPressable
        accessibilityRole="button"
        accessibilityLabel="Escolher onde entregar"
        style={styles.p3LocationRow}
        onPress={onLocationPress}
      >
        <View style={styles.p3LocationTitle}>
          <MaterialIcons name="location-on" size={21} color={theme.primary} />
          <Text style={[styles.p3LocationText, { color: theme.text }]}>
            {locationLoading
              ? "Buscando endereço..."
              : locationLabel === "Usar minha localização"
                ? "Meu endereço"
                : locationLabel}
          </Text>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={19}
            color={theme.muted}
          />
        </View>
        <Text
          numberOfLines={2}
          style={[styles.p3LocationAddress, { color: theme.muted }]}
        >
          {locationAddress || "Toque para informar onde entregar"}
        </Text>
      </PediuPressable>
      <View style={styles.p3GreetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.p3Greeting, { color: theme.ink }]}>
            {homeContext.greeting}
            {firstName ? `, ${firstName}` : ""}.
          </Text>
          <Text style={[styles.p3GreetingSub, { color: theme.muted }]}>
            {homeContext.subtitle}
          </Text>
        </View>
        <View style={styles.p3MascotSlot}>{mascot}</View>
        <PediuPressable
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          style={[
            styles.p3Bell,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
          onPress={() => router.push("/account/notifications")}
        >
          <MaterialIcons
            name="notifications-none"
            size={25}
            color={theme.ink}
          />
          <View
            style={[styles.p3BellDot, { backgroundColor: theme.primary }]}
          />
        </PediuPressable>
      </View>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: theme.card, borderColor: theme.line },
        ]}
      >
        <MaterialIcons name="search" size={21} color={theme.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar comida, produtos ou serviços"
          placeholderTextColor={theme.muted}
          style={[styles.searchInput, { color: theme.text }]}
          returnKeyType="search"
        />
      </View>
      <PediuV2Discovery
        theme={theme}
        homeContext={homeContext}
        motionEnabled={motionEnabled}
        products={products}
        notifications={notifications}
        onProductPress={onProductPress}
        onReadNotification={onReadNotification}
        onSearch={onSearch}
        onAssistant={onAssistant}
        onOrders={onOrders}
        onBenefits={onBenefits}
        onMarket={onMarket}
        onCategory={onCategory}
        activeOrder={activeOrder}
        onActiveOrder={onActiveOrder}
      />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Escolha pelo sabor</Text>
        <PediuPressable onPress={onSearch}>
          <Text style={styles.link}>Ver tudo</Text>
        </PediuPressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map((item) => (
          <PediuPressable
            key={item.label}
            style={styles.categoryTile}
            onPress={() => onCategory(item.query)}
          >
            <Image source={item.image} style={styles.categoryImage} />
            <Text style={[styles.categoryLabel, { color: theme.text }]}>
              {item.label}
            </Text>
          </PediuPressable>
        ))}
      </ScrollView>
      <PediuPressable
        style={[
          styles.benefitCard,
          { backgroundColor: theme.primarySoft, borderColor: theme.line },
        ]}
        onPress={onBenefits}
      >
        <View style={[styles.benefitIcon, { backgroundColor: theme.primary }]}>
          <MaterialIcons name="local-offer" size={20} color={COLORS.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.benefitTitle, { color: theme.ink }]}>
            Pediu Vantagens
          </Text>
          <Text style={[styles.benefitText, { color: theme.muted }]}>
            Cupons e condições especiais dos lojistas aparecem no checkout
            quando estiverem disponíveis.
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={theme.ink} />
      </PediuPressable>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{homeContext.focusLabel}</Text>
        <Text style={styles.link}>Ver tudo</Text>
      </View>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Carregando opções...</Text>
          <Text style={styles.emptyText}>
            Buscando produtos disponíveis perto de você.
          </Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Não foi possível carregar o catálogo
          </Text>
          <Text style={styles.emptyText}>
            Tente novamente em alguns instantes.
          </Text>
        </View>
      ) : products.length ? (
        products.map((product, index) => (
          <PediuReveal key={product.id} delay={index * 65}>
            <PediuPressable
              style={styles.productCard}
              onPress={() => onProductPress(product)}
            >
              <View style={styles.productImage}>
                {product.imageUrl ? (
                  <Image
                    source={{ uri: product.imageUrl }}
                    style={styles.productImageAsset}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.productEmoji}>{product.emoji}</Text>
                )}
                <View style={styles.availablePill}>
                  <View
                    style={[
                      styles.dot,
                      product.adId ? { backgroundColor: COLORS.orange } : null,
                    ]}
                  />
                  <Text
                    style={[
                      styles.availableText,
                      product.adId ? { color: COLORS.orange } : null,
                    ]}
                  >
                    {product.storeOpen === false
                      ? "FECHADA"
                      : !product.available
                        ? "ESGOTADO"
                        : product.adId
                          ? "OFERTA PEDIU"
                          : "DISPONÍVEL"}
                  </Text>
                </View>
              </View>
              <View style={styles.productInfo}>
                <View style={{ flex: 1 }}>
                  <View style={styles.ratingRow}>
                    <Text style={styles.rating}>
                      {product.storeOpen === false
                        ? product.nextOpenLabel || "Fechada no momento"
                        : !product.available
                          ? "Esgotado"
                          : product.adOfferLabel || "Disponível agora"}
                    </Text>
                    <Text style={styles.distance}>{product.distance}</Text>
                  </View>
                  <Text style={styles.productName}>
                    {product.adHeadline || product.name}
                  </Text>
                  {product.adHeadline ? (
                    <Text style={styles.storeName}>
                      {product.name} · {product.store}
                    </Text>
                  ) : (
                    <Text style={styles.storeName}>{product.store}</Text>
                  )}
                </View>
                <Text style={styles.productPrice}>{product.price}</Text>
              </View>
              <View style={styles.productFooter}>
                <Text style={styles.localText}>
                  {product.adDescription ||
                    product.description ||
                    "Publicado pela loja no catálogo do Pediu"}
                </Text>
                <View style={styles.arrowCircle}>
                  <MaterialIcons
                    name="arrow-forward"
                    size={17}
                    color={COLORS.white}
                  />
                </View>
              </View>
            </PediuPressable>
          </PediuReveal>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nenhuma opção disponível agora</Text>
          <Text style={styles.emptyText}>
            Quando uma loja abrir e publicar produtos, eles aparecerão aqui.
          </Text>
        </View>
      )}
      <View style={styles.promiseCard}>
        <MaterialIcons name="favorite" size={20} color={COLORS.coral} />
        <View style={{ flex: 1 }}>
          <Text style={styles.promiseTitle}>Compre de quem está perto</Text>
          <Text style={styles.promiseText}>
            Apoiamos o comércio local e entregamos com cuidado.
          </Text>
        </View>
      </View>
    </>
  );
}

function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (options: CartOption[], unitPrice: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const detail = trpc.pediu.marketplace.detail.useQuery({ productId: product.id });
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [choiceNotice, setChoiceNotice] = useState("");
  const groups = detail.data?.options ?? [];
  const base = Number(detail.data?.product.price ?? 0);
  const extra = groups.reduce((sum, group) => {
    const choice = group.choices.find((item) => item.id === selected[group.id]);
    return sum + Number(choice?.priceDelta ?? 0);
  }, 0);
  const unitPrice = (Number.isFinite(base) ? base + extra : 0).toFixed(2);
  const confirm = () => {
    if (!product.available || detail.data?.storeOpen === false) return;
    if (detail.isLoading || !detail.data) return;
    const missing = groups.find((group) => group.required && !selected[group.id]);
    if (missing) {
      setChoiceNotice(`Escolha ${missing.name} para continuar.`);
      return;
    }
    const options = groups.flatMap((group) => {
      const choice = group.choices.find((item) => item.id === selected[group.id]);
      if (!choice) return [];
      return [{
        id: choice.id,
        groupId: group.id,
        groupName: group.name,
        name: choice.name,
        priceDelta: String(choice.priceDelta),
      }];
    });
    onAdd(options, unitPrice);
  };
  return (
    <View style={styles.modalBackdrop}>
      <View style={[styles.sheet, styles.sheetTall, { paddingBottom: bottomSafeInset(insets.bottom, Platform.OS) }]}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheetHandle} />
          <View style={styles.modalProductImage}>
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.modalProductImageAsset}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.modalEmoji}>{product.emoji}</Text>
            )}
          </View>
          <Text style={styles.eyebrow}>{product.store.toUpperCase()}</Text>
          <Text style={styles.sheetTitle}>
            {product.adHeadline || product.name}
          </Text>
          {product.adHeadline ? (
            <Text style={styles.muted}>{product.name}</Text>
          ) : null}
          <Text style={styles.muted}>
            {product.distance} ·{" "}
            {detail.data?.storeOpen === false
              ? (detail.data.nextOpenLabel ?? "Fechada no momento")
              : product.available
                ? "disponível agora"
                : "Esgotado"}
          </Text>
          <Text style={styles.modalDescription}>
            {product.adDescription ||
              product.description ||
              "Confira os detalhes diretamente com a loja pelo catálogo do Pediu."}
          </Text>
          {product.adOfferLabel ? (
            <View style={styles.modalOffer}>
              <MaterialIcons
                name="local-offer"
                size={17}
                color={COLORS.orange}
              />
              <Text style={styles.modalOfferText}>{product.adOfferLabel}</Text>
            </View>
          ) : null}
          {detail.isLoading ? <Text style={styles.muted}>Carregando opções...</Text> : null}
          {groups.map((group) => (
            <View key={group.id} style={{ gap: 8 }}>
              <Text style={styles.cardTitle}>
                {group.name}
                {group.required ? " · obrigatório" : " · opcional"}
              </Text>
              {group.choices.map((choice) => {
                const on = selected[group.id] === choice.id;
                const delta = Number(choice.priceDelta);
                return (
                  <Pressable
                    key={choice.id}
                    onPress={() => {
                      setChoiceNotice("");
                      setSelected((current) => ({ ...current, [group.id]: choice.id }));
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: on ? COLORS.coral : COLORS.line,
                      backgroundColor: on ? COLORS.coralSoft : COLORS.white,
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <Text style={styles.cardTitle}>
                      {choice.name}
                      {delta > 0 ? ` · +R$ ${delta.toFixed(2).replace(".", ",")}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {choiceNotice ? <Text style={{ color: COLORS.coral, fontWeight: "800" }}>{choiceNotice}</Text> : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Preço</Text>
            <Text style={styles.totalValue}>
              {detail.data ? `R$ ${unitPrice.replace(".", ",")}` : product.price}
            </Text>
          </View>
          <PediuPressable
            disabled={!product.available || detail.data?.storeOpen === false || detail.isLoading || !detail.data}
            style={[
              styles.primaryButton,
              (!product.available || detail.data?.storeOpen === false || detail.isLoading) && styles.disabledButton,
            ]}
            onPress={confirm}
          >
            <Text style={styles.primaryButtonText}>
              {!product.available
                ? "Esgotado"
                : detail.data?.storeOpen === false
                  ? "Loja fechada"
                  : "Adicionar ao pedido"}
            </Text>
            <MaterialIcons name="add" size={19} color={COLORS.white} />
          </PediuPressable>
          <PediuPressable style={styles.textButton} onPress={onClose}>
            <Text style={styles.textButtonLabel}>Voltar</Text>
          </PediuPressable>
        </ScrollView>
      </View>
    </View>
  );
}

function CustomerOrders({
  orders,
  loading,
  isAuthenticated,
  onLogin,
  onCancel,
  onDiscover,
}: {
  orders: {
    id: number;
    storeId: number;
    storeName?: string | null;
    status: OrderStatus;
    total: string;
    cancelReason?: string | null;
    deliveryAddress: string | null;
    createdAt: Date | string | null;
  }[];
  loading: boolean;
  isAuthenticated: boolean;
  onLogin: () => void;
  onCancel: (orderId: number) => void;
  onDiscover: () => void;
}) {
  const progress: OrderStatus[] = [
    "Pendente",
    "Aceito",
    "Preparando",
    "Pronto",
    "A caminho",
    "Entregue",
  ];
  const progressWidth = (status: OrderStatus): `${number}%` => {
    if (status === "Cancelado") return "0%";
    const index = Math.max(0, progress.indexOf(status));
    return `${Math.round(((index + 1) / progress.length) * 100)}%`;
  };
  if (!isAuthenticated) {
    return (
      <>
        <View style={styles.simpleHeader}>
          <Text style={styles.pageTitle}>Meus pedidos</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>?</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Entre para ver seus pedidos
          </Text>
          <Text style={styles.emptyText}>
            Seus pedidos ficam salvos na sua conta, neste celular e nos outros.
          </Text>
          <Pressable style={styles.primaryButton} onPress={onLogin}>
            <Text style={styles.primaryButtonText}>
              Entrar ou criar conta
            </Text>
          </Pressable>
        </View>
      </>
    );
  }
  return (
    <>
      <View style={styles.simpleHeader}>
        <Text style={styles.pageTitle}>Meus pedidos</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>?</Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Carregando pedidos...</Text>
          <Text style={styles.emptyText}>
            Buscando seus pedidos mais recentes.
          </Text>
        </View>
      ) : orders.length ? (
        orders.map((order) => (
          <View style={styles.orderCard} key={order.id}>
            <View style={styles.orderTop}>
              <View>
                <Text style={styles.eyebrow}>PEDIDO #{order.id}</Text>
                <Text style={styles.orderStore}>
                  {order.storeName || "Loja"}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {order.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {`R$ ${Number(order.total).toFixed(2).replace(".", ",")}`}
              </Text>
            </View>
            {order.deliveryAddress ? (
              <Text style={styles.muted}>Entrega: {order.deliveryAddress}</Text>
            ) : null}
            {order.status !== "Cancelado" ? (
              <>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: progressWidth(order.status) },
                    ]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  {progress.map((status) => (
                    <Text key={status} style={styles.progressLabelsText}>
                      {status}
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.muted}>
                {order.cancelReason || "Este pedido foi cancelado."}
              </Text>
            )}
            <Pressable
              style={styles.outlineButtonSmall}
              onPress={() =>
                router.push({
                  pathname: "/order/track",
                  params: { orderId: String(order.id) },
                })
              }
            >
              <Text style={styles.outlineButtonText}>Acompanhar pedido</Text>
            </Pressable>
            {order.status === "Pendente" || order.status === "Aceito" ? (
              <Pressable
                style={styles.outlineButtonSmall}
                onPress={() => onCancel(order.id)}
              >
                <Text style={styles.outlineButtonText}>Cancelar pedido</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIllustration}>🛍️</Text>
          <Text style={styles.emptyTitle}>Você ainda não fez um pedido</Text>
          <Text style={styles.emptyText}>
            Encontre algo gostoso perto de você e peça em poucos toques.
          </Text>
          <Pressable style={styles.primaryButton} onPress={onDiscover}>
            <Text style={styles.primaryButtonText}>Explorar agora</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}
function SellerHome({
  theme,
  store,
  ownerName,
  orders,
  productCount,
  salesTotal,
  onCatalog,
  onOrders,
  onClients,
  onShareCatalog,
  onAds,
  onVoice,
}: {
  theme: AppTheme;
  store?: { name?: string | null };
  ownerName?: string | null;
  orders: { status: string }[];
  productCount: number;
  salesTotal: number;
  onCatalog: () => void;
  onOrders: () => void;
  onClients: () => void;
  onShareCatalog: () => void;
  onAds: () => void;
  onVoice: () => void;
}) {
  const pendingOrders = orders.filter(
    (order) => order.status === "Pendente",
  ).length;
  const firstName = ownerName?.trim().split(/\s+/)[0];
  return (
    <>
      <View style={[styles.sellerHeader, { backgroundColor: theme.ink }]}>
        <View>
          <Text style={[styles.eyebrowLight, { color: theme.highlight }]}>
            PAINEL DA LOJA
          </Text>
          <Text style={styles.sellerTitle}>{store?.name ?? "Sua loja"}</Text>
          <Text style={styles.sellerSubtitle}>
            {firstName
              ? `Bom dia, ${firstName}. Tudo pronto?`
              : "Configure sua loja para começar."}
          </Text>
        </View>
        <BrandMark />
      </View>
      <View style={styles.statGrid}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <Text style={[styles.statNumber, { color: theme.ink }]}>
            {pendingOrders}
          </Text>
          <Text style={styles.statLabel}>pedidos pendentes</Text>
          <MaterialIcons name="receipt-long" size={22} color={theme.primary} />
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <Text
            style={[styles.statNumber, { color: theme.ink }]}
          >{`R$ ${salesTotal.toFixed(2).replace(".", ",")}`}</Text>
          <Text style={styles.statLabel}>vendas registradas</Text>
          <MaterialIcons name="trending-up" size={22} color={COLORS.green} />
        </View>
      </View>
      <View
        style={[
          styles.aiSellerCard,
          { backgroundColor: theme.primarySoft, borderColor: theme.line },
        ]}
      >
        <View style={[styles.aiIcon, { backgroundColor: theme.primary }]}>
          <MaterialIcons name="auto-awesome" size={21} color={COLORS.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.aiTitle, { color: theme.ink }]}>
            Crie um anúncio que chama atenção
          </Text>
          <Text style={[styles.aiText, { color: "#3A2A22" }]}>
            Imagem e copy prontas para você revisar e publicar.
          </Text>
        </View>
        <Pressable
          style={styles.smallLightButton}
          onPress={onAds}
        >
          <Text style={styles.smallLightButtonText}>Criar</Text>
        </Pressable>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Atalhos</Text>
      </View>
      <View style={styles.shortcutGrid}>
        <Pressable
          style={({ pressed }) => [
            styles.shortcut,
            { backgroundColor: theme.card, borderColor: theme.line },
            pressed && styles.cardPressed,
          ]}
          onPress={onCatalog}
        >
          <MaterialIcons name="inventory-2" size={24} color={theme.primary} />
          <Text style={styles.shortcutTitle}>Catálogo</Text>
          <Text style={styles.shortcutSub}>
            {productCount} produto(s) ativo(s)
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.shortcut,
            { backgroundColor: theme.card, borderColor: theme.line },
            pressed && styles.cardPressed,
          ]}
          onPress={onOrders}
        >
          <MaterialIcons
            name="local-shipping"
            size={24}
            color={theme.highlight}
          />
          <Text style={styles.shortcutTitle}>Pedidos</Text>
          <Text style={styles.shortcutSub}>
            {pendingOrders} aguardando ação
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.shortcut,
            { backgroundColor: theme.card, borderColor: theme.line },
            pressed && styles.cardPressed,
          ]}
          onPress={onShareCatalog}
        >
          <MaterialIcons name="campaign" size={24} color={theme.ink} />
          <Text style={styles.shortcutTitle}>Divulgar</Text>
          <Text style={styles.shortcutSub}>Envie o cardápio</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.shortcut,
            { backgroundColor: theme.card, borderColor: theme.line },
            pressed && styles.cardPressed,
          ]}
          onPress={onClients}
        >
          <MaterialIcons name="people" size={24} color={COLORS.green} />
          <Text style={styles.shortcutTitle}>Clientes</Text>
          <Text style={styles.shortcutSub}>Quem compra fiado</Text>
        </Pressable>
      </View>
      <View
        style={[
          styles.tipCard,
          { backgroundColor: theme.card, borderColor: theme.line },
        ]}
      >
        <MaterialIcons name="lightbulb" size={22} color={theme.highlight} />
        <View style={{ flex: 1 }}>
          <Text style={styles.tipTitle}>Dica do Pediu</Text>
          <Text style={styles.tipText}>
            Uma boa foto e uma descrição curta ajudam seu produto a vender mais.
          </Text>
        </View>
      </View>
    </>
  );
}

function SellerOrders({
  orders,
  onUpdateStatus,
  onCallCourier,
}: {
  orders: {
    id: number;
    customerId: number;
    customerName?: string | null;
    paymentLabel?: string | null;
    lines?: Array<{
      productId: number;
      name: string;
      quantity: number;
      unitPrice: string;
      note: string | null;
    }>;
    total: string;
    status: string;
    deliveryAddress: string | null;
    fulfillmentMode?: "delivery" | "pickup";
    createdAt: Date | null;
  }[];
  onUpdateStatus: (
    orderId: number,
    status:
      | "Aceito"
      | "Preparando"
      | "Pronto"
      | "Entregue"
      | "Cancelado",
  ) => void;
  onCallCourier: (orderId: number) => void;
}) {
  const nextStatus: Record<
    string,
    "Aceito" | "Preparando" | "Pronto" | "Entregue" | "Cancelado" | undefined
  > = {
    Pendente: "Aceito",
    Aceito: "Preparando",
    Preparando: "Pronto",
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
          <Text style={styles.muted}>
            Quando um cliente fizer um pedido, ele aparecerá aqui.
          </Text>
        </View>
      ) : (
        orders.map((order) => {
          const delivery = order.fulfillmentMode !== "pickup";
          const next =
            order.status === "Pronto" && !delivery
              ? "Entregue"
              : nextStatus[order.status];
          const actionLabel =
            order.status === "Pendente"
              ? "Aceitar pedido"
              : order.status === "Aceito"
                ? "Começar preparo"
                : order.status === "Preparando"
                  ? "Marcar como pronto"
                  : order.status === "Pronto"
                    ? "Liberar retirada"
                    : order.status;

          return (
            <View style={styles.sellerOrderCard} key={order.id}>
              <Pressable style={styles.orderTop} onPress={() => router.push("/seller/orders")}>
                <View>
                  <Text style={styles.eyebrow}>
                    {order.status.toUpperCase()} · #{order.id}
                  </Text>
                  <Text style={styles.orderStore}>
                    {order.customerName?.trim() || "Cliente"}
                  </Text>
                </View>
                <Text style={styles.price}>
                  R$ {Number(order.total).toFixed(2).replace(".", ",")}
                </Text>
              </Pressable>
              <Text style={styles.muted}>
                {order.fulfillmentMode === "pickup"
                  ? "Retirada na loja"
                  : order.deliveryAddress ||
                    "Endereço de entrega não informado"}
              </Text>
              {(order.lines ?? []).map((line) => (
                <Text key={`${order.id}-${line.productId}-${line.note ?? ""}`} style={styles.muted}>
                  {line.quantity}× {line.name}
                  {line.note ? ` · ${line.note}` : ""} · R${" "}
                  {Number(line.unitPrice).toFixed(2).replace(".", ",")}
                </Text>
              ))}
              <Text style={styles.muted}>{order.paymentLabel || "Pagamento a confirmar"}</Text>

              {next ? (
                <View style={styles.orderActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButtonSmall,
                      pressed && styles.pressed,
                    ]}
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
              ) : order.status === "Pronto" && delivery ? (
                <View style={styles.orderActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButtonSmall,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onCallCourier(order.id)}
                  >
                    <Text style={styles.primaryButtonText}>Chamar motoboy</Text>
                  </Pressable>
                </View>
              ) : order.status === "A caminho" ? (
                <Text style={styles.muted}>
                  O motoboy aceitou ou está na rota. A entrega é concluída por ele.
                </Text>
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

function SellerCatalog({
  products,
  loading,
  onAdd,
  onToggle,
  onShare,
}: {
  products: Product[];
  loading: boolean;
  onAdd: () => void;
  onToggle: (id: number, available: boolean) => void;
  onShare: () => void;
}) {
  return (
    <>
      <View style={styles.simpleHeader}>
        <View>
          <Text style={styles.eyebrow}>SUA VITRINE</Text>
          <Text style={styles.pageTitle}>Catálogo</Text>
        </View>
        <Pressable style={styles.addCircle} onPress={onAdd}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </Pressable>
      </View>
      <Text style={styles.muted}>
        Produtos persistidos da sua loja. Alterações ficam disponíveis para os
        clientes.
      </Text>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Carregando catálogo...</Text>
        </View>
      ) : products.length ? (
        products.map((product) => (
          <View style={styles.catalogRow} key={product.id}>
            <View style={styles.catalogEmoji}>
              <Text>{product.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{product.name}</Text>
              <Text style={styles.muted}>
                {product.category} · {product.price}
              </Text>
              {product.description ? (
                <Text style={styles.muted} numberOfLines={1}>
                  {product.description}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={`${product.available ? "Desativar" : "Ativar"} ${product.name}`}
              style={[
                styles.stockSwitch,
                product.available && styles.stockSwitchOn,
              ]}
              onPress={() => onToggle(product.id, !product.available)}
            >
              <View
                style={[
                  styles.stockKnob,
                  product.available && styles.stockKnobOn,
                ]}
              />
            </Pressable>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Seu catálogo está vazio</Text>
          <Text style={styles.emptyText}>
            Adicione o primeiro produto para começar a vender.
          </Text>
        </View>
      )}
      <Pressable style={styles.publishCard} onPress={onShare}>
        <MaterialIcons name="campaign" size={22} color={COLORS.coral} />
        <View style={{ flex: 1 }}>
          <Text style={styles.tipTitle}>Divulgue seu catálogo</Text>
          <Text style={styles.tipText}>
            Compartilhe os produtos disponíveis da sua loja.
          </Text>
        </View>
        <MaterialIcons name="share" size={22} color={COLORS.coral} />
      </Pressable>
    </>
  );
}

function SellerSettings({
  store,
  salesCount,
  onSave,
  saving,
  onAssistant,
}: {
  store?: {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    pixKey: string | null;
    deliveryFee: string;
    deliveryEnabled: number;
    pickupEnabled: number;
    deliveryRadiusKm: string;
    latitude: string | null;
    longitude: string | null;
    isOpen: number;
    openingHours?: string | null;
  };
  salesCount: number;
  onSave: (input: {
    name?: string;
    phone?: string;
    address?: string;
    pixKey?: string;
    deliveryFee?: string;
    deliveryEnabled?: boolean;
    pickupEnabled?: boolean;
    deliveryRadiusKm?: string;
    latitude?: number | null;
    longitude?: number | null;
    isOpen?: boolean;
    openingHours?: string;
  }) => void;
  saving: boolean;
  onAssistant: () => void;
}) {
  const [name, setName] = useState(store?.name ?? "");
  const [phone, setPhone] = useState(maskBrazilPhone(store?.phone ?? ""));
  const [address, setAddress] = useState(store?.address ?? "");
  const [pixKey, setPixKey] = useState(store?.pixKey ?? "");
  const [deliveryFee, setDeliveryFee] = useState(
    decimalToBrlInput(store?.deliveryFee ?? "0"),
  );
  const [deliveryEnabled, setDeliveryEnabled] = useState(
    Boolean(store?.deliveryEnabled ?? 1),
  );
  const [pickupEnabled, setPickupEnabled] = useState(
    Boolean(store?.pickupEnabled),
  );
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(
    decimalToKmInput(store?.deliveryRadiusKm ?? "10"),
  );
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    store?.latitude != null && store?.longitude != null
      ? { latitude: Number(store.latitude), longitude: Number(store.longitude) }
      : null,
  );
  const [pinKey, setPinKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [hoursJson, setHoursJson] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [isOpen, setIsOpen] = useState(Boolean(store?.isOpen));
  useEffect(() => {
    setName(store?.name ?? "");
    setPhone(maskBrazilPhone(store?.phone ?? ""));
    setAddress(store?.address ?? "");
    setPixKey(store?.pixKey ?? "");
    setDeliveryFee(decimalToBrlInput(store?.deliveryFee ?? "0"));
    setDeliveryEnabled(Boolean(store?.deliveryEnabled ?? 1));
    setPickupEnabled(Boolean(store?.pickupEnabled));
    setDeliveryRadiusKm(decimalToKmInput(store?.deliveryRadiusKm ?? "10"));
    setPin(
      store?.latitude != null && store?.longitude != null
        ? { latitude: Number(store.latitude), longitude: Number(store.longitude) }
        : null,
    );
    setIsOpen(Boolean(store?.isOpen));
  }, [
    store?.id,
    store?.name,
    store?.phone,
    store?.address,
    store?.pixKey,
    store?.deliveryFee,
    store?.deliveryEnabled,
    store?.pickupEnabled,
    store?.deliveryRadiusKm,
    store?.latitude,
    store?.longitude,
    store?.isOpen,
  ]);
  const locateStore = async () => {
    setValidationMessage("");
    setLocating(true);
    try {
      const point = await geocodeTypedAddress(`${address}, Brasil`);
      if (!point) {
        setValidationMessage("Não achamos esse endereço. Confira rua, número e cidade.");
        return;
      }
      setPin(point);
      setPinKey((value) => value + 1);
    } catch {
      setValidationMessage("Não foi possível consultar o mapa agora.");
    } finally {
      setLocating(false);
    }
  };
  const save = () => {
    const normalizedFee = brlInputToDecimal(deliveryFee);
    const normalizedRadius = kmInputToDecimal(deliveryRadiusKm);
    const parsedLatitude = pin?.latitude ?? null;
    const parsedLongitude = pin?.longitude ?? null;
    if (name.trim().length < 2) {
      setValidationMessage("Informe o nome da loja.");
      return;
    }
    if (!normalizedFee) {
      setValidationMessage("Informe a taxa de entrega. Ex.: 5,00");
      return;
    }
    if (!normalizedRadius) {
      setValidationMessage("Informe o raio de entrega em quilômetros. Ex.: 10");
      return;
    }
    if (
      deliveryEnabled &&
      (parsedLatitude === null ||
        parsedLongitude === null ||
        !Number.isFinite(parsedLatitude) ||
        !Number.isFinite(parsedLongitude) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90 ||
        parsedLongitude < -180 ||
        parsedLongitude > 180)
    ) {
      setValidationMessage(
        "Marque o ponto da loja no mapa antes de ativar o delivery.",
      );
      return;
    }
    setValidationMessage("");
    onSave({
      name: name.trim(),
      phone: maskBrazilPhone(phone) || undefined,
      address: address.trim() || undefined,
      pixKey: pixKey.trim() || undefined,
      deliveryFee: normalizedFee,
      deliveryEnabled,
      pickupEnabled,
      deliveryRadiusKm: normalizedRadius,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      isOpen,
      ...(hoursJson ? { openingHours: hoursJson } : {}),
    });
  };
  return (
    <>
      <View style={styles.simpleHeader}>
        <View>
          <Text style={styles.eyebrow}>CONFIGURAÇÕES</Text>
          <Text style={styles.pageTitle}>Sua loja</Text>
        </View>
        <Text style={styles.link}>{salesCount} vendas</Text>
      </View>
      <View style={styles.fieldCard}>
        <Text style={styles.sectionTitle}>Dados publicados</Text>
        <Text style={styles.fieldLabel}>NOME DA LOJA</Text>
        <Text style={styles.fieldHelp}>Como a loja aparece para quem pede.</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Delícia de Avaí"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          accessibilityLabel="Nome da loja"
        />
        <Text style={styles.fieldLabel}>WHATSAPP</Text>
        <Text style={styles.fieldHelp}>Telefone com DDD para o cliente falar com a loja.</Text>
        <TextInput
          value={phone}
          onChangeText={(value) => setPhone(maskBrazilPhone(value))}
          placeholder="(14) 98110-4964"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          keyboardType="phone-pad"
          accessibilityLabel="WhatsApp da loja"
        />
        <Text style={styles.fieldLabel}>ENDEREÇO DA LOJA</Text>
        <Text style={styles.fieldHelp}>Rua, número, bairro e cidade. Depois busque no mapa.</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Rua, número, bairro e cidade"
          placeholderTextColor={COLORS.muted}
          style={[styles.input, { minHeight: 72, height: undefined, textAlignVertical: "top", paddingTop: 12 }]}
          multiline
          accessibilityLabel="Endereço da loja"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar este endereço no mapa"
          onPress={() => void locateStore()}
          style={styles.mapButton}
        >
          <MaterialIcons name="map" size={18} color={COLORS.coral} />
          <Text style={styles.mapButtonText}>
            {locating ? "Procurando no mapa..." : "Buscar este endereço no mapa"}
          </Text>
        </Pressable>
        <Text style={styles.fieldLabel}>CHAVE PIX DA LOJA</Text>
        <Text style={styles.fieldHelp}>
          CPF, celular, e-mail ou chave aleatória. O cliente usa essa chave para pagar você.
        </Text>
        <TextInput
          value={pixKey}
          onChangeText={setPixKey}
          placeholder="CPF, celular, e-mail ou chave aleatória"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          accessibilityLabel="Chave PIX da loja"
        />
        <Text style={styles.fieldLabel}>TAXA DE ENTREGA</Text>
        <Text style={styles.fieldHelp}>Valor cobrado em cada entrega. Ex.: R$ 5,00</Text>
        <View style={styles.moneyRow}>
          <Text style={styles.moneyPrefix}>R$</Text>
          <TextInput
            value={deliveryFee}
            onChangeText={(value) => setDeliveryFee(maskBrlTyping(value))}
            placeholder="0,00"
            placeholderTextColor={COLORS.muted}
            style={[styles.input, styles.moneyInput]}
            keyboardType="decimal-pad"
            accessibilityLabel="Taxa de entrega em reais"
          />
        </View>
        <View style={{ gap: 8, marginTop: 6 }}>
          <View style={styles.settingsRow}>
            <View style={styles.settingsIcon}>
              <MaterialIcons
                name="delivery-dining"
                size={20}
                color={COLORS.ink}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Delivery</Text>
              <Text style={styles.muted}>
                Só aceita pedidos dentro do raio configurado
              </Text>
            </View>
            <Switch
              value={deliveryEnabled}
              onValueChange={setDeliveryEnabled}
              trackColor={{ false: COLORS.line, true: COLORS.coralSoft }}
              thumbColor={deliveryEnabled ? COLORS.coral : COLORS.muted}
            />
          </View>
          <View style={styles.settingsRow}>
            <View style={styles.settingsIcon}>
              <MaterialIcons name="store" size={20} color={COLORS.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Retirada na loja</Text>
              <Text style={styles.muted}>Pedido sem taxa e sem entregador</Text>
            </View>
            <Switch
              value={pickupEnabled}
              onValueChange={setPickupEnabled}
              trackColor={{ false: COLORS.line, true: COLORS.coralSoft }}
              thumbColor={pickupEnabled ? COLORS.coral : COLORS.muted}
            />
          </View>
        </View>
        <Text style={styles.fieldLabel}>RAIO DO DELIVERY</Text>
        <Text style={styles.fieldHelp}>Distância máxima, em quilômetros. Ex.: 10</Text>
        <View style={styles.moneyRow}>
          <TextInput
            value={deliveryRadiusKm}
            onChangeText={(value) =>
              setDeliveryRadiusKm(value.replace(/[^\d,]/g, "").replace(/(,.*),/g, "$1"))
            }
            placeholder="10"
            placeholderTextColor={COLORS.muted}
            style={[styles.input, styles.moneyInput]}
            keyboardType="decimal-pad"
            accessibilityLabel="Raio de entrega em quilômetros"
          />
          <Text style={styles.moneyPrefix}>km</Text>
        </View>
        {pin ? (
          <PinMap
            latitude={pin.latitude}
            longitude={pin.longitude}
            anchorKey={`${store?.id ?? 0}-${pinKey}`}
            label="Loja"
            onChange={setPin}
          />
        ) : null}
        <Text style={styles.muted}>
          Arraste o ponto até a porta da loja. Não precisa digitar latitude nem longitude.
        </Text>
        <OpeningHoursEditor
          key={store?.id ?? 0}
          initial={store?.openingHours}
          onChange={setHoursJson}
        />
        {validationMessage ? (
          <Text
            style={{ color: COLORS.coral, fontSize: 12, fontWeight: "800" }}
          >
            {validationMessage}
          </Text>
        ) : null}
        <Pressable
          style={styles.settingsRow}
          onPress={() => setIsOpen((value) => !value)}
        >
          <View style={styles.settingsIcon}>
            <MaterialIcons
              name={isOpen ? "store" : "storefront"}
              size={20}
              color={COLORS.ink}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {isOpen ? "Loja aberta" : "Loja fechada"}
            </Text>
            <Text style={styles.muted}>
              Define se a loja aparece para quem pede
            </Text>
          </View>
          <View style={[styles.stockSwitch, isOpen && styles.stockSwitchOn]}>
            <View style={[styles.stockKnob, isOpen && styles.stockKnobOn]} />
          </View>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, saving && styles.disabledButton]}
          disabled={saving}
          onPress={save}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? "Salvando..." : "Salvar configurações"}
          </Text>
          <MaterialIcons name="check" size={18} color={COLORS.white} />
        </Pressable>
      </View>
      <View style={styles.fieldCard}>
        <ThemePicker
          title="Personalize o painel da loja"
          description="Escolha as cores do aplicativo."
        />
      </View>
      <Pressable style={styles.settingsRow} onPress={onAssistant}>
        <View style={styles.settingsIcon}>
          <MaterialIcons name="auto-awesome" size={20} color={COLORS.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Assistente do Pediu</Text>
          <Text style={styles.muted}>
            Pedidos, loja e vendas por aqui
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={COLORS.muted} />
      </Pressable>
      <Pressable style={styles.outlineButton} onPress={() => router.push("/account/profile")}>
        <Text style={styles.outlineButtonText}>Minha conta</Text>
      </Pressable>
    </>
  );
}

function AssistantNavItem({
  motionEnabled,
  onPress,
  theme,
}: {
  motionEnabled: boolean;
  onPress: () => void;
  theme: AppTheme;
}) {
  return (
    <PediuPulse enabled={motionEnabled} style={styles.assistantNavPulse}>
      <PediuPressable
        accessibilityRole="button"
        accessibilityLabel="Abrir assistente do Pediu"
        style={[
          styles.navItem,
          styles.assistantNavItem,
          { backgroundColor: theme.primary },
        ]}
        onPress={onPress}
      >
        <MaterialIcons name="auto-awesome" size={20} color={COLORS.white} />
        <Text style={[styles.navLabel, styles.navLabelActive]}>Assistente</Text>
      </PediuPressable>
    </PediuPulse>
  );
}

function CustomerNav({
  active,
  onChange,
  onSearch,
  bottomInset,
  theme,
}: {
  active: string;
  onChange: (value: "discover" | "orders" | "profile") => void;
  onSearch: () => void;
  bottomInset: number;
  theme: AppTheme;
}) {
  return (
    <View
      style={[
        styles.bottomNav,
        {
          borderColor: theme.ink,
          backgroundColor: theme.ink,
          bottom: bottomSafeInset(bottomInset, Platform.OS),
        },
      ]}
    >
      <PediuPressable
        style={[
          styles.navItem,
          active === "discover" && { backgroundColor: theme.primary },
        ]}
        onPress={() => onChange("discover")}
      >
        <MaterialIcons
          name="explore"
          size={21}
          color={active === "discover" ? COLORS.white : theme.muted}
        />
        <Text
          style={[
            styles.navLabel,
            active === "discover" && styles.navLabelActive,
          ]}
        >
          Início
        </Text>
      </PediuPressable>
      <PediuPressable
        accessibilityRole="button"
        accessibilityLabel="Abrir busca"
        style={styles.navItem}
        onPress={onSearch}
      >
        <MaterialIcons name="search" size={21} color={theme.muted} />
        <Text style={styles.navLabel}>Busca</Text>
      </PediuPressable>
      <PediuPressable
        accessibilityRole="button"
        accessibilityLabel="Abrir pedidos"
        style={[
          styles.navItem,
          active === "orders" && { backgroundColor: theme.primary },
        ]}
        onPress={() => onChange("orders")}
      >
        <MaterialIcons
          name="receipt-long"
          size={21}
          color={active === "orders" ? COLORS.white : theme.muted}
        />
        <Text
          style={[
            styles.navLabel,
            active === "orders" && styles.navLabelActive,
          ]}
        >
          Pedidos
        </Text>
      </PediuPressable>
      <PediuPressable
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
        style={[
          styles.navItem,
          active === "profile" && { backgroundColor: theme.primary },
        ]}
        onPress={() => onChange("profile")}
      >
        <MaterialIcons
          name="person"
          size={21}
          color={active === "profile" ? COLORS.white : theme.muted}
        />
        <Text
          style={[
            styles.navLabel,
            active === "profile" && styles.navLabelActive,
          ]}
        >
          Perfil
        </Text>
      </PediuPressable>
    </View>
  );
}

function SellerNav({
  active,
  onChange,
  bottomInset,
  theme,
}: {
  active: string;
  onChange: (
    value: "home" | "orders" | "catalog" | "clients" | "settings",
  ) => void;
  bottomInset: number;
  theme: AppTheme;
}) {
  return (
    <View
      style={[
        styles.bottomNav,
        {
          borderColor: theme.ink,
          backgroundColor: theme.ink,
          bottom: bottomSafeInset(bottomInset, Platform.OS),
        },
      ]}
    >
      {[
        ["home", "storefront", "Início"],
        ["orders", "receipt-long", "Pedidos"],
        ["catalog", "restaurant-menu", "Cardápio"],
        ["ads", "campaign", "Anúncios"],
        ["settings", "tune", "Ajustes"],
      ].map(([key, icon, label]) => {
        const item = (
          <PediuPressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${label}`}
            style={[
              styles.navItem,
              active === key && { backgroundColor: theme.primary },
            ]}
            onPress={() => {
              if (key === "ads") {
                router.push("/seller/ads");
                return;
              }
              onChange(
                key as "home" | "orders" | "catalog" | "clients" | "settings",
              );
            }}
          >
            <MaterialIcons
              name={icon as any}
              size={22}
              color={active === key ? COLORS.white : theme.muted}
            />
            <Text
              style={[styles.navLabel, active === key && styles.navLabelActive]}
            >
              {label}
            </Text>
          </PediuPressable>
        );
        return item;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    backgroundColor: COLORS.canvas,
    overflow: "hidden",
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: "hidden",
  },
  floatingBlob: { position: "absolute", borderRadius: 999, opacity: 0.7 },
  floatingBlobOne: {
    width: 170,
    height: 170,
    backgroundColor: "#FFE2D5",
    top: 28,
    right: -92,
  },
  floatingBlobTwo: {
    width: 150,
    height: 150,
    backgroundColor: "#DFF3E7",
    top: 420,
    left: -90,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 176,
    gap: 16,
    zIndex: 1,
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
  },
  p3LocationRow: {
    alignItems: "flex-start",
    gap: 2,
    maxWidth: "100%",
    minHeight: 44,
    justifyContent: "center",
  },
  p3LocationTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
  },
  p3LocationText: {
    fontFamily: "Nunito",
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  p3LocationAddress: {
    fontFamily: "Nunito",
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 25,
  },
  p3MascotSlot: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  p3GreetingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  p3Greeting: {
    fontFamily: "Fredoka",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  p3GreetingSub: { fontFamily: "Nunito", fontSize: 16, marginTop: 2 },
  p3Bell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  p3BellDot: {
    position: "absolute",
    right: 10,
    top: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandName: {
    color: COLORS.ink,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.7,
    fontFamily: "Fredoka",
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
  },
  brandMarkSmall: { width: 30, height: 30, borderRadius: 10 },
  brandMarkText: {
    color: COLORS.white,
    fontSize: 37,
    fontWeight: "900",
    fontStyle: "italic",
    lineHeight: 42,
  },
  brandMarkTextSmall: { fontSize: 24, lineHeight: 28 },
  topActions: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  badge: {
    position: "absolute",
    right: 1,
    top: 0,
    backgroundColor: COLORS.orange,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: "800" },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBanner: {
    minHeight: 184,
    borderRadius: 28,
    backgroundColor: COLORS.ink,
    padding: 19,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    shadowColor: COLORS.ink,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  heroCopy: { flex: 1, gap: 7, paddingRight: 8 },
  heroKicker: {
    color: COLORS.yellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  heroText: { color: "#BED0D0", fontSize: 12, lineHeight: 18, maxWidth: 240 },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 3 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  heroPillText: { color: COLORS.white, fontSize: 10, fontWeight: "800" },
  heroOrb: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: COLORS.coral,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  heroOrbEmoji: { color: COLORS.white, fontSize: 46, fontWeight: "900" },
  eyebrow: {
    color: COLORS.coral,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  pageTitle: {
    color: COLORS.ink,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.ink, fontSize: 16, fontWeight: "800" },
  voiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.coralSoft,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: "#FFD8CE",
    shadowColor: COLORS.coral,
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  voiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  voiceSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 30,
    paddingHorizontal: 14,
    height: 58,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    marginLeft: 8,
    fontFamily: "Nunito",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Fredoka",
  },
  link: {
    color: COLORS.coral,
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Nunito",
  },
  categoryRow: { gap: 10, paddingVertical: 2 },
  categoryTile: { width: 76, alignItems: "center", gap: 7 },
  categoryImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: COLORS.coral,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  categoryChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  categoryIcon: { fontSize: 16 },
  categoryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Nunito",
    textAlign: "center",
  },
  categoryLabelActive: { color: COLORS.white },
  productCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 28,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: "#1A2730",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  productImage: {
    height: 156,
    borderRadius: 22,
    backgroundColor: "#FFF0D7",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  productImageAsset: { width: "100%", height: "100%" },
  productEmoji: { fontSize: 64 },
  availablePill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  availableText: { color: COLORS.green, fontSize: 9, fontWeight: "800" },
  productInfo: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 12,
  },
  ratingRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  rating: { color: COLORS.orange, fontSize: 11, fontWeight: "800" },
  distance: { color: COLORS.muted, fontSize: 11 },
  productName: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 5,
    letterSpacing: -0.2,
    fontFamily: "Fredoka",
  },
  storeName: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Nunito",
  },
  productPrice: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: "900",
    fontFamily: "Fredoka",
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  localText: { color: COLORS.muted, fontSize: 10, flex: 1 },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitCard: {
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: { fontSize: 13, fontWeight: "900" },
  benefitText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  promiseCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#FFF0EC",
    padding: 15,
    borderRadius: 18,
  },
  promiseTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  promiseText: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  bottomNav: {
    position: "absolute",
    bottom: 14,
    left: 16,
    right: 16,
    height: 78,
    overflow: "hidden",
    backgroundColor: COLORS.ink,
    borderWidth: 1,
    borderColor: "rgba(240,233,227,0.95)",
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 52,
    height: 48,
    borderRadius: 20,
  },
  assistantNavPulse: {
    alignItems: "center",
    justifyContent: "center",
  },
  assistantNavItem: {
    minWidth: 62,
  },
  navItemActive: { backgroundColor: COLORS.ink },
  navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800" },
  navLabelActive: { color: COLORS.white },
  fabNav: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -27,
    borderWidth: 5,
    borderColor: COLORS.canvas,
    shadowColor: COLORS.coral,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 38, 44, 0.36)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 22,
    paddingBottom: 32,
    gap: 13,
    maxHeight: "92%",
    width: "100%",
    overflow: "hidden",
    shadowColor: COLORS.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { paddingBottom: 8 },
  sheetTall: { maxHeight: "92%", width: "100%", overflow: "hidden" },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.line,
    marginBottom: 3,
  },
  sheetTitle: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  cartEmoji: { fontSize: 28 },
  cardTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  muted: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  price: { color: COLORS.ink, fontSize: 14, fontWeight: "900" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 14,
    marginTop: 5,
  },
  totalLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  totalValue: { color: COLORS.ink, fontSize: 20, fontWeight: "900" },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: COLORS.coral,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "center",
  },
  textButton: { alignItems: "center", padding: 6 },
  textButtonLabel: { color: COLORS.coral, fontWeight: "800", fontSize: 13 },
  disabledButton: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  modalProductImage: {
    height: 150,
    borderRadius: 20,
    backgroundColor: "#FFF0D7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalProductImageAsset: { width: "100%", height: "100%" },
  modalEmoji: { fontSize: 78 },
  modalDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginVertical: 2,
  },
  modalOffer: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    backgroundColor: "#FFF5D6",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  modalOfferText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "900",
    flex: 1,
  },
  simpleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  p3ProfileHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 2,
  },
  p3ProfileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  p3ProfileName: { fontFamily: "Fredoka", fontSize: 29, fontWeight: "800" },
  p3ProfileMeta: { fontFamily: "Nunito", fontSize: 16, marginTop: 1 },
  p3ClubCard: {
    borderRadius: 28,
    padding: 20,
    gap: 10,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  p3CardKickerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  p3CardKicker: {
    fontFamily: "Nunito",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  p3ClubTitle: {
    color: COLORS.white,
    fontFamily: "Fredoka",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 9,
  },
  p3ProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    marginTop: 5,
  },
  p3ProgressFill: { height: "100%", borderRadius: 4 },
  p3ClubHint: {
    color: "rgba(255,244,232,0.72)",
    fontFamily: "Nunito",
    fontSize: 13,
  },
  p3PayRow: {
    minHeight: 76,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  p3PayIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  p3PayTitle: { fontFamily: "Fredoka", fontSize: 17, fontWeight: "800" },
  p3PaySubtitle: { fontFamily: "Nunito", fontSize: 13, marginTop: 2 },
  p3PayAmount: { fontFamily: "Fredoka", fontSize: 17, fontWeight: "800" },
  p3NameCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 7 },
  p3NameEyebrow: {
    fontFamily: "Nunito",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  p3NameValue: { fontFamily: "Fredoka", fontSize: 22, fontWeight: "800" },
  p3SectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 5,
  },
  p3SectionTitle: { fontFamily: "Fredoka", fontSize: 20, fontWeight: "800" },
  p3AddressCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 3,
  },
  p3AddressLabel: { fontFamily: "Fredoka", fontSize: 18, fontWeight: "800" },
  p3AddressText: {
    flex: 1,
    fontFamily: "Nunito",
    fontSize: 14,
    lineHeight: 20,
  },
  p3EmptyRow: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  p3CouponCard: {
    minHeight: 84,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  p3CouponCode: { fontFamily: "Fredoka", fontSize: 18, fontWeight: "800" },
  p3CouponHint: { fontFamily: "Nunito", fontSize: 13, marginTop: 4 },
  p3CouponValue: {
    fontFamily: "Nunito",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    maxWidth: 126,
  },
  p3HelpRow: {
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  p3HelpText: { fontFamily: "Fredoka", fontSize: 17, fontWeight: "800" },
  p3PrimaryButton: {
    minHeight: 54,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  p3PrimaryButtonText: {
    color: COLORS.white,
    fontFamily: "Fredoka",
    fontSize: 16,
    fontWeight: "800",
  },
  p3OutlineButton: {
    minHeight: 52,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  p3OutlineButtonText: {
    fontFamily: "Fredoka",
    fontSize: 15,
    fontWeight: "800",
  },
  p3SellerLink: { alignItems: "center", paddingVertical: 4 },
  p3SellerLinkText: { fontFamily: "Nunito", fontSize: 13, fontWeight: "700" },
  p3Footer: {
    fontFamily: "Nunito",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 6,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    gap: 13,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  orderStore: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  statusPill: {
    backgroundColor: "#FFF0D7",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusPillText: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  orderItem: { flexDirection: "row", alignItems: "center", gap: 9 },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.line,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: 8, backgroundColor: COLORS.green, borderRadius: 4 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -5,
  },
  progressLabelsText: { color: COLORS.muted, fontSize: 9 },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 25,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  emptyIllustration: { fontSize: 58 },
  emptyTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFF0D7",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    backgroundColor: COLORS.ink,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarLargeText: { fontSize: 25, fontWeight: "900", color: COLORS.ink },
  profileName: { color: COLORS.white, fontSize: 18, fontWeight: "800" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.coralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerInvite: {
    backgroundColor: "#FFF0D7",
    borderRadius: 20,
    padding: 16,
    gap: 7,
  },
  sellerInviteTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800" },
  sellerInviteText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: COLORS.coral,
    borderRadius: 14,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  outlineButtonText: { color: COLORS.coral, fontSize: 12, fontWeight: "800" },
  sellerHeader: {
    backgroundColor: COLORS.ink,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrowLight: {
    color: COLORS.yellow,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  sellerTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 4,
  },
  sellerSubtitle: { color: "#BCD0D1", fontSize: 12, marginTop: 3 },
  statGrid: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    gap: 7,
  },
  statNumber: { color: COLORS.ink, fontSize: 22, fontWeight: "900" },
  statLabel: { color: COLORS.muted, fontSize: 11, flex: 1 },
  aiSellerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: COLORS.coral,
    borderRadius: 20,
    padding: 14,
  },
  aiIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: { color: COLORS.white, fontSize: 14, fontWeight: "800" },
  aiText: { color: "#FFE1DA", fontSize: 11, lineHeight: 16, marginTop: 3 },
  smallLightButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  smallLightButtonText: {
    color: COLORS.coral,
    fontSize: 12,
    fontWeight: "800",
  },
  shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  shortcut: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 18,
    padding: 14,
    width: "48%",
    minHeight: 108,
    gap: 7,
  },
  shortcutTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  shortcutSub: { color: COLORS.muted, fontSize: 11 },
  tipCard: {
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
    backgroundColor: "#FFF0D7",
    padding: 15,
    borderRadius: 18,
  },
  tipTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  tipText: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 2 },
  filterChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
  },
  filterChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  filterText: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  filterTextActive: { color: COLORS.white },
  sellerOrderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.line,
    gap: 10,
  },
  orderActions: { flexDirection: "row", gap: 8, marginTop: 3 },
  outlineButtonSmall: {
    borderWidth: 1.5,
    borderColor: COLORS.coral,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  primaryButtonSmall: {
    backgroundColor: COLORS.coral,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  catalogRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: COLORS.white,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  catalogEmoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF0D7",
    alignItems: "center",
    justifyContent: "center",
  },
  stockSwitch: {
    width: 42,
    height: 25,
    borderRadius: 13,
    backgroundColor: COLORS.line,
    justifyContent: "center",
    padding: 3,
  },
  stockSwitchOn: { backgroundColor: COLORS.green },
  stockKnob: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  stockKnobOn: { alignSelf: "flex-end" },
  publishCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: COLORS.coralSoft,
    padding: 15,
    borderRadius: 18,
  },
  fieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.line,
    gap: 7,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginTop: 2,
  },
  fieldHelp: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -2,
  },
  moneyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  moneyPrefix: { color: COLORS.ink, fontSize: 16, fontWeight: "900", minWidth: 28 },
  moneyInput: { flex: 1 },
  mapButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.coral,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  mapButtonText: { color: COLORS.coral, fontWeight: "900", flexShrink: 1 },
  fieldValue: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 9,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
    color: COLORS.ink,
    fontSize: 14,
    backgroundColor: COLORS.canvas,
  },
  mascotDock: {
    position: "absolute",
    right: 8,
    bottom: 110,
    zIndex: 8,
    maxWidth: "72%",
  },
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 88,
    backgroundColor: COLORS.ink,
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
});

const paymentStyles = StyleSheet.create({
  pixButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    backgroundColor: "#F3FAF8",
  },
  pixButtonText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  pending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0D7",
    borderRadius: 13,
    padding: 12,
  },
  pendingText: {
    flex: 1,
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
});
function VoiceWaveform({
  active,
  processing,
}: {
  active: boolean;
  processing: boolean;
}) {
  const levels = useRef(
    Array.from({ length: 17 }, () => new Animated.Value(0.22)),
  ).current;

  useEffect(() => {
    const loops = levels.map((level, index) => {
      const peak = 0.48 + ((index * 17) % 7) / 12;
      const duration = 260 + (index % 5) * 75;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(level, {
            toValue: peak,
            duration,
            delay: index * 18,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(level, {
            toValue: 0.2 + (index % 3) * 0.05,
            duration: duration + 60,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    });

    if (active || processing) loops.forEach((loop) => loop.start());
    else
      levels.forEach((level) =>
        level.stopAnimation(() => level.setValue(0.22)),
      );
    return () => loops.forEach((loop) => loop.stop());
  }, [active, processing, levels]);

  return (
    <View
      style={[
        voiceStyles.waveform,
        !active && !processing && voiceStyles.waveformIdle,
      ]}
      accessibilityLabel={
        processing
          ? "Processando áudio"
          : active
            ? "Ondas sonoras indicando que o Pediu está ouvindo"
            : "Microfone parado"
      }
    >
      {levels.map((level, index) => (
        <Animated.View
          key={index}
          style={[voiceStyles.waveBar, { transform: [{ scaleY: level }] }]}
        />
      ))}
    </View>
  );
}

function PulsingMicButton({
  active,
  busy,
  onPress,
  theme,
}: {
  active: boolean;
  busy: boolean;
  onPress: () => void;
  theme: AppTheme;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: active || busy ? 550 : 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: active || busy ? 550 : 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, busy, pulse]);
  return (
    <Animated.View
      style={[
        voiceStyles.micPulseRing,
        { transform: [{ scale: pulse }], borderColor: theme.primary },
      ]}
    >
      <Pressable
        accessibilityLabel="Ativar microfone do assistente"
        onPress={onPress}
        style={[
          voiceStyles.orb,
          { backgroundColor: active ? theme.ink : theme.primary },
        ]}
      >
        <MaterialIcons
          name={busy ? "hourglass-top" : active ? "graphic-eq" : "mic"}
          size={30}
          color={COLORS.white}
        />
      </Pressable>
    </Animated.View>
  );
}

function VoiceAssistantModal({
  mode,
  busy,
  isRecording,
  onRecord,
  reply,
  onClose,
  onAction,
  onCommand,
  theme,
}: {
  mode: VoiceMode;
  busy: boolean;
  isRecording: boolean;
  onRecord: () => void;
  reply: string;
  onClose: () => void;
  onAction: (action: string) => void;
  onCommand: (command: string) => void;
  theme: AppTheme;
}) {
  const customerActions = [
    { label: "Encontrar doces perto", icon: "🍰", action: "doces" },
    { label: "Ver meus pedidos", icon: "🛍️", action: "pedidos" },
    { label: "Falar com suporte", icon: "💬", action: "suporte" },
  ];
  const sellerActions = [
    { label: "Registrar uma venda", icon: "🧾", action: "venda" },
    { label: "Consultar vendas fiadas", icon: "📒", action: "fiado" },
    { label: "Mostrar meu catálogo", icon: "📦", action: "catalogo" },
    { label: "Criar uma divulgação", icon: "📣", action: "divulgar" },
  ];
  const actions = mode === "customer" ? customerActions : sellerActions;
  const [command, setCommand] = useState("");
  const [isListening, setIsListening] = useState(false);
  const startListening = () => {
    const recognitionConstructor =
      (globalThis as any).SpeechRecognition ||
      (globalThis as any).webkitSpeechRecognition;
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
  const insets = useSafeAreaInsets();
  const voiceActive = isListening || isRecording;
  const modeLabel =
    mode === "customer" ? "ASSISTENTE DO CLIENTE" : "ASSISTENTE DA LOJA";
  const modeTitle =
    mode === "customer" ? "Peça do seu jeito" : "Cuide da sua loja";
  const statusLabel = busy
    ? "Organizando sua solicitação…"
    : voiceActive
      ? "Estou ouvindo você"
      : "Toque para falar";
  return (
    <View style={voiceStyles.backdrop}>
      <View style={[voiceStyles.sheet, { backgroundColor: theme.card, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <ScrollView
          style={voiceStyles.sheetScroll}
          contentContainerStyle={voiceStyles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheetHandle} />
          <View style={voiceStyles.headerRow}>
            <View
              style={[
                voiceStyles.headerIcon,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              <MaterialIcons
                name={mode === "customer" ? "restaurant" : "storefront"}
                size={20}
                color={theme.primary}
              />
            </View>
            <View style={voiceStyles.headerCopy}>
              <Text style={[voiceStyles.kicker, { color: theme.primary }]}>
                {modeLabel}
              </Text>
              <Text
                numberOfLines={1}
                style={[voiceStyles.headerTitle, { color: theme.ink }]}
              >
                {modeTitle}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar assistente"
              hitSlop={10}
              style={[
                voiceStyles.closeButton,
                { backgroundColor: theme.canvas },
              ]}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={20} color={theme.ink} />
            </Pressable>
          </View>
          <View
            style={[
              voiceStyles.introCard,
              { backgroundColor: theme.canvas, borderColor: theme.line },
            ]}
          >
            <View style={voiceStyles.introCopy}>
              <Text style={[voiceStyles.introTitle, { color: theme.ink }]}>
                {mode === "customer"
                  ? "Encontre o que combina com você"
                  : "A sua operação em poucos toques"}
              </Text>
              <Text
                numberOfLines={2}
                style={[voiceStyles.introText, { color: theme.muted }]}
              >
                {mode === "customer"
                  ? "Fale, digite ou use um atalho para começar."
                  : "Registre, consulte e divulgue sem sair do Pediu."}
              </Text>
            </View>
            <PulsingMicButton
              active={voiceActive}
              busy={busy}
              onPress={Platform.OS === "web" ? startListening : onRecord}
              theme={theme}
            />
          </View>
          <View
            style={[
              voiceStyles.statusPill,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <View
              style={[
                voiceStyles.statusDot,
                {
                  backgroundColor:
                    voiceActive || busy ? theme.primary : theme.muted,
                },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[voiceStyles.voiceState, { color: theme.ink }]}
            >
              {statusLabel}
            </Text>
          </View>
          <View
            style={[
              voiceStyles.commandRow,
              { backgroundColor: theme.canvas, borderColor: theme.line },
            ]}
          >
            <TextInput
              value={command}
              onChangeText={setCommand}
              onSubmitEditing={() => onCommand(command)}
              placeholder={
                mode === "customer"
                  ? "Ex.: quero pedir doces"
                  : "Ex.: quem me deve?"
              }
              placeholderTextColor={theme.muted}
              style={[voiceStyles.commandInput, { color: theme.ink }]}
              returnKeyType="done"
            />
            <Pressable
              accessibilityLabel="Ativar microfone"
              style={[
                voiceStyles.commandButton,
                { backgroundColor: voiceActive ? theme.ink : theme.primary },
              ]}
              disabled={busy}
              onPress={Platform.OS === "web" ? startListening : onRecord}
            >
              <MaterialIcons
                name={voiceActive ? "graphic-eq" : "mic"}
                size={18}
                color={COLORS.white}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Enviar comando"
              style={[
                voiceStyles.commandButton,
                { backgroundColor: theme.primary },
              ]}
              disabled={busy || !command.trim()}
              onPress={() => onCommand(command)}
            >
              <MaterialIcons
                name={busy ? "hourglass-top" : "send"}
                size={18}
                color={COLORS.white}
              />
            </Pressable>
          </View>
          {voiceActive || busy ? (
            <VoiceWaveform active={voiceActive} processing={busy} />
          ) : null}
          {reply ? (
            <Text
              numberOfLines={4}
              style={[
                voiceStyles.reply,
                { backgroundColor: theme.primarySoft, color: theme.ink },
              ]}
            >
              {reply}
            </Text>
          ) : null}
          <Text style={[voiceStyles.sectionLabel, { color: theme.muted }]}>
            ATALHOS RÁPIDOS
          </Text>
          <View style={voiceStyles.actions}>
            {actions.map((item) => (
              <Pressable
                key={item.action}
                style={({ pressed }) => [
                  voiceStyles.action,
                  { backgroundColor: theme.canvas, borderColor: theme.line },
                  pressed && styles.pressed,
                ]}
                onPress={() => onAction(item.action)}
              >
                <View
                  style={[
                    voiceStyles.actionIconBubble,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <Text style={voiceStyles.actionIcon}>{item.icon}</Text>
                </View>
                <View style={voiceStyles.actionCopy}>
                  <Text
                    numberOfLines={1}
                    style={[voiceStyles.actionText, { color: theme.ink }]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[voiceStyles.actionHint, { color: theme.muted }]}
                  >
                    {mode === "customer"
                      ? "Abrir agora"
                      : "Gerenciar no painel"}
                  </Text>
                </View>
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={15}
                  color={theme.primary}
                />
              </Pressable>
            ))}
          </View>
          <Pressable style={voiceStyles.closeLink} onPress={onClose}>
            <Text style={[styles.textButtonLabel, { color: theme.primary }]}>
              Fechar assistente
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

function SellerVoiceLauncher({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [voiceStyles.launcher, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={voiceStyles.launcherIcon}>
        <MaterialIcons name="mic" size={18} color={COLORS.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={voiceStyles.launcherTitle}>Fale com o Pediu</Text>
        <Text style={voiceStyles.launcherText}>
          Pedidos, loja e vendas por aqui
        </Text>
      </View>
      <MaterialIcons name="arrow-forward" size={18} color={COLORS.ink} />
    </Pressable>
  );
}

function SellerClients({
  customers,
  onCreate,
  creating,
  onSetLimit,
  onBlock,
  busy,
}: {
  customers: SellerCustomer[];
  onCreate: (input: {
    name: string;
    phone?: string;
    notes?: string;
    creditLimit: string;
  }) => void;
  creating: boolean;
  onSetLimit: (customerId: number, creditLimit: string) => void;
  onBlock: (customerId: number, blocked: boolean) => void;
  busy: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [creditLimit, setCreditLimit] = useState("0,00");
  const [selectedId, setSelectedId] = useState<number>();
  const [selectedLimit, setSelectedLimit] = useState("");
  const totalOwed = customers.reduce(
    (sum, customer) => sum + Number(customer.balance),
    0,
  );
  const submit = () => {
    const normalizedLimit = brlInputToDecimal(creditLimit);
    if (name.trim().length < 2 || !normalizedLimit) return;
    onCreate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      creditLimit: normalizedLimit,
    });
    setName("");
    setPhone("");
    setNotes("");
    setCreditLimit("0,00");
    setShowForm(false);
  };
  return (
    <>
      <View style={styles.simpleHeader}>
        <View>
          <Text style={styles.eyebrow}>RELACIONAMENTO</Text>
          <Text style={styles.pageTitle}>Meus clientes</Text>
        </View>
        <Pressable
          style={styles.addCircle}
          onPress={() => setShowForm((value) => !value)}
        >
          <MaterialIcons
            name={showForm ? "close" : "person-add"}
            size={21}
            color={COLORS.white}
          />
        </Pressable>
      </View>
      <View style={clientStyles.summary}>
        <View>
          <Text style={clientStyles.summaryNumber}>
            R$ {totalOwed.toFixed(2).replace(".", ",")}
          </Text>
          <Text style={clientStyles.summaryLabel}>em vendas fiadas</Text>
        </View>
        <MaterialIcons
          name="account-balance-wallet"
          size={28}
          color={COLORS.orange}
        />
      </View>
      {showForm ? (
        <View style={clientStyles.form}>
          <Text style={styles.sectionTitle}>Novo cliente</Text>
          <Text style={styles.fieldLabel}>NOME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome completo"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            accessibilityLabel="Nome do cliente"
          />
          <Text style={styles.fieldLabel}>TELEFONE</Text>
          <Text style={styles.fieldHelp}>Opcional. Com DDD.</Text>
          <TextInput
            value={phone}
            onChangeText={(value) => setPhone(maskBrazilPhone(value))}
            placeholder="(14) 99999-9999"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            keyboardType="phone-pad"
            accessibilityLabel="Telefone do cliente"
          />
          <Text style={styles.fieldLabel}>LIMITE DE FIADO</Text>
          <Text style={styles.fieldHelp}>Quanto essa pessoa pode ficar devendo. Ex.: R$ 200,00</Text>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyPrefix}>R$</Text>
            <TextInput
              value={creditLimit}
              onChangeText={(value) => setCreditLimit(maskBrlTyping(value))}
              placeholder="0,00"
              placeholderTextColor={COLORS.muted}
              style={[styles.input, styles.moneyInput]}
              keyboardType="decimal-pad"
              accessibilityLabel="Limite de fiado"
            />
          </View>
          <Text style={styles.fieldLabel}>OBSERVAÇÕES</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Opcional"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            accessibilityLabel="Observações do cliente"
          />
          <Pressable
            style={[styles.primaryButton, creating && styles.disabledButton]}
            disabled={creating}
            onPress={submit}
          >
            <Text style={styles.primaryButtonText}>
              {creating ? "Salvando..." : "Salvar cliente"}
            </Text>
            <MaterialIcons name="check" size={18} color={COLORS.white} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Clientes cadastrados</Text>
        <Text style={styles.link}>{customers.length}</Text>
      </View>
      {customers.length ? (
        customers.map((customer, index) => {
          const selected = selectedId === customer.id;
          const isBlocked = customer.status !== "active";
          return (
            <View style={clientStyles.row} key={customer.id}>
              <View
                style={[
                  clientStyles.clientAvatar,
                  {
                    backgroundColor: [COLORS.yellow, "#BDE6D3", "#D8C8F5"][
                      index % 3
                    ],
                  },
                ]}
              >
                <Text style={clientStyles.clientAvatarText}>
                  {customer.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cardTitle}>{customer.name}</Text>
                <Text style={styles.muted}>
                  {isBlocked
                    ? "Bloqueado"
                    : `Fiado · R$ ${Number(customer.balance).toFixed(2).replace(".", ",")} de R$ ${Number(customer.creditLimit).toFixed(2).replace(".", ",")}`}
                </Text>
                {customer.phone ? (
                  <Text style={styles.muted}>{customer.phone}</Text>
                ) : null}
                {selected ? (
                  <View style={clientStyles.inlineActions}>
                    <TextInput
                      value={selectedLimit}
                      onChangeText={setSelectedLimit}
                      placeholder="Novo limite"
                      placeholderTextColor={COLORS.muted}
                      style={[styles.input, clientStyles.limitInput]}
                      keyboardType="decimal-pad"
                    />
                    <Pressable
                      style={clientStyles.smallAction}
                      disabled={busy}
                      onPress={() => {
                        const value = selectedLimit.replace(",", ".").trim();
                        if (/^\d+(\.\d{1,2})?$/.test(value))
                          onSetLimit(customer.id, value);
                      }}
                    >
                      <Text style={clientStyles.smallActionText}>
                        Salvar limite
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        clientStyles.smallAction,
                        isBlocked && clientStyles.unblockAction,
                      ]}
                      disabled={busy}
                      onPress={() => onBlock(customer.id, !isBlocked)}
                    >
                      <Text style={clientStyles.smallActionText}>
                        {isBlocked ? "Desbloquear" : "Bloquear"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
              <Pressable
                style={clientStyles.action}
                onPress={() => {
                  setSelectedId(selected ? undefined : customer.id);
                  setSelectedLimit(Number(customer.creditLimit).toFixed(2));
                }}
              >
                <MaterialIcons
                  name={selected ? "expand-less" : "tune"}
                  size={20}
                  color={COLORS.ink}
                />
              </Pressable>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nenhum cliente cadastrado</Text>
          <Text style={styles.emptyText}>
            Cadastre clientes para registrar vendas fiadas com limite e saldo
            reais.
          </Text>
        </View>
      )}
    </>
  );
}

const voiceStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 38, 44, 0.42)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 10,
    maxHeight: "88%",
    width: "100%",
    overflow: "hidden",
  },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { paddingBottom: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  introCard: {
    minHeight: 88,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  introCopy: { flex: 1, minWidth: 0, gap: 4 },
  introTitle: { fontSize: 15, lineHeight: 19, fontWeight: "900" },
  introText: { fontSize: 11, lineHeight: 15 },
  micPulseRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  orbActive: { backgroundColor: COLORS.ink },
  kicker: {
    color: COLORS.coral,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textAlign: "center",
    marginTop: 3,
  },
  title: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    flexShrink: 1,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  statusPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  waveform: {
    height: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginTop: -2,
  },
  waveformIdle: { opacity: 0.42 },
  waveBar: {
    width: 3,
    height: 23,
    borderRadius: 4,
    backgroundColor: COLORS.coral,
  },
  voiceState: { color: COLORS.muted, fontSize: 10, fontWeight: "800" },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginTop: 2,
  },
  actions: { gap: 8, marginTop: 0 },
  action: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
  },
  actionIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionIcon: { fontSize: 18 },
  actionCopy: { flex: 1, minWidth: 0, gap: 2 },
  actionText: { fontSize: 12, fontWeight: "900" },
  actionHint: { fontSize: 10, fontWeight: "600" },
  launcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.coralSoft,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: "#FFD8CE",
  },
  launcherIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  launcherTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  launcherText: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  commandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.canvas,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 6,
  },
  commandInput: {
    flex: 1,
    minWidth: 0,
    color: COLORS.ink,
    fontSize: 12,
    paddingHorizontal: 7,
    height: 38,
  },
  commandButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  listeningButton: { backgroundColor: COLORS.ink },
  reply: {
    color: COLORS.ink,
    fontSize: 11,
    lineHeight: 16,
    borderRadius: 12,
    padding: 10,
  },
  closeLink: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 5 },
});

const clientStyles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF0D7",
    borderRadius: 20,
    padding: 18,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    gap: 10,
  },
  summaryNumber: { color: COLORS.ink, fontSize: 27, fontWeight: "900" },
  summaryLabel: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarText: { color: COLORS.ink, fontSize: 15, fontWeight: "900" },
  action: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.coralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 7,
    flexWrap: "wrap",
  },
  limitInput: { flex: 1, minWidth: 100, paddingVertical: 8 },
  smallAction: {
    backgroundColor: COLORS.coral,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 9,
  },
  unblockAction: { backgroundColor: COLORS.green },
  smallActionText: { color: COLORS.white, fontSize: 10, fontWeight: "900" },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.coralSoft,
    borderRadius: 18,
    padding: 14,
  },
  reminderButton: {
    backgroundColor: COLORS.coral,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  reminderButtonText: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
});

function SellerOnboardingModal({
  isAuthenticated,
  name,
  phone,
  address,
  pixKey,
  onChangeName,
  onChangePhone,
  onChangeAddress,
  onChangePixKey,
  onLogin,
  onCreate,
  onClose,
  busy,
}: {
  isAuthenticated: boolean;
  name: string;
  phone: string;
  address: string;
  pixKey: string;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onChangePixKey: (value: string) => void;
  onLogin: () => void;
  onCreate: () => void;
  onClose: () => void;
  busy: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.modalBackdrop}>
      <View style={[styles.sheet, styles.sheetTall, { paddingBottom: bottomSafeInset(insets.bottom, Platform.OS) }]}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.eyebrow}>COMECE A VENDER</Text>
          <Text style={styles.sheetTitle}>Cadastre sua loja</Text>
          <Text style={styles.muted}>
            Em poucos passos, sua vitrine aparece para clientes próximos.
          </Text>
          {!isAuthenticated ? (
            <>
              <View style={onboardingStyles.loginBanner}>
                <MaterialIcons name="lock" size={18} color={COLORS.coral} />
                <Text style={onboardingStyles.loginText}>
                  Entre para salvar sua loja e acessar os pedidos em qualquer
                  dispositivo.
                </Text>
              </View>
              <Pressable style={styles.primaryButton} onPress={onLogin}>
                <Text style={styles.primaryButtonText}>
                  Entrar
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color={COLORS.white}
                />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>NOME DA LOJA</Text>
              <TextInput
                value={name}
                onChangeText={onChangeName}
                placeholder="Ex.: Doce Encanto Bakery"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>WHATSAPP / TELEFONE</Text>
              <TextInput
                value={phone}
                onChangeText={onChangePhone}
                placeholder="(11) 99999-9999"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldLabel}>ENDEREÇO</Text>
              <TextInput
                value={address}
                onChangeText={onChangeAddress}
                placeholder="Rua, número e bairro"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>CHAVE PIX</Text>
              <TextInput
                value={pixKey}
                onChangeText={onChangePixKey}
                placeholder="CPF, telefone ou e-mail"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
              />
              <Pressable
                style={[styles.primaryButton, busy && styles.disabledButton]}
                disabled={busy}
                onPress={onCreate}
              >
                <Text style={styles.primaryButtonText}>
                  {busy ? "Salvando..." : "Criar minha loja"}
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color={COLORS.white}
                />
              </Pressable>
            </>
          )}
          <Pressable style={styles.textButton} onPress={onClose}>
            <Text style={styles.textButtonLabel}>Agora não</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const onboardingStyles = StyleSheet.create({
  loginBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.coralSoft,
    borderRadius: 15,
    padding: 13,
  },
  loginText: { flex: 1, color: COLORS.ink, fontSize: 12, lineHeight: 17 },
});

function SaleModal({
  customers,
  total,
  customerId,
  paymentMethod,
  busy,
  onChangeTotal,
  onChangeCustomerId,
  onChangePaymentMethod,
  onSubmit,
  onClose,
}: {
  customers: { id: number; name: string }[];
  total: string;
  customerId: string;
  paymentMethod: "pix" | "cash" | "fiado";
  busy: boolean;
  onChangeTotal: (value: string) => void;
  onChangeCustomerId: (value: string) => void;
  onChangePaymentMethod: (value: "pix" | "cash" | "fiado") => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.modalBackdrop}>
      <View style={[styles.sheet, styles.sheetTall, { paddingBottom: bottomSafeInset(insets.bottom, Platform.OS) }]}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.eyebrow}>ASSISTENTE DA LOJA</Text>
          <Text style={styles.sheetTitle}>Registrar venda</Text>
          <Text style={styles.muted}>
            O lançamento fica salvo no histórico da sua loja.
          </Text>
          <Text style={styles.fieldLabel}>VALOR DA VENDA</Text>
          <Text style={styles.fieldHelp}>Quanto o cliente pagou, em reais. Ex.: 42,00</Text>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyPrefix}>R$</Text>
            <TextInput
              value={total}
              onChangeText={(value) => onChangeTotal(maskBrlTyping(value))}
              placeholder="0,00"
              placeholderTextColor={COLORS.muted}
              style={[styles.input, styles.moneyInput]}
              keyboardType="decimal-pad"
              accessibilityLabel="Valor da venda"
            />
          </View>
          {paymentMethod === "fiado" ? (
            <>
              <Text style={styles.fieldLabel}>CLIENTE DO FIADO</Text>
              <Text style={styles.fieldHelp}>
                Escolha quem fica devendo. O valor entra na conta dessa pessoa.
              </Text>
              {customers.length ? (
                customers.map((customer) => {
                  const selected = customerId === String(customer.id);
                  return (
                    <Pressable
                      key={customer.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Lançar fiado para ${customer.name}`}
                      onPress={() => onChangeCustomerId(String(customer.id))}
                      style={[
                        saleStyles.method,
                        selected && saleStyles.methodActive,
                      ]}
                    >
                      <Text
                        style={[
                          saleStyles.methodText,
                          selected && saleStyles.methodTextActive,
                        ]}
                      >
                        {customer.name}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.fieldHelp}>
                  Cadastre o cliente na aba Clientes antes de lançar no fiado.
                </Text>
              )}
            </>
          ) : null}
          <Text style={styles.fieldLabel}>FORMA DE PAGAMENTO</Text>
          <View style={saleStyles.methods}>
            {(["cash", "pix", "fiado"] as const).map((method) => (
              <Pressable
                key={method}
                style={[
                  saleStyles.method,
                  paymentMethod === method && saleStyles.methodActive,
                ]}
                onPress={() => onChangePaymentMethod(method)}
              >
                <Text
                  style={[
                    saleStyles.methodText,
                    paymentMethod === method && saleStyles.methodTextActive,
                  ]}
                >
                  {method === "cash"
                    ? "Dinheiro"
                    : method === "pix"
                      ? "PIX"
                      : "Fiado"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.primaryButton, busy && styles.disabledButton]}
            disabled={busy}
            onPress={onSubmit}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? "Salvando..." : "Salvar venda"}
            </Text>
            <MaterialIcons name="check" size={18} color={COLORS.white} />
          </Pressable>
          <Pressable style={styles.textButton} onPress={onClose}>
            <Text style={styles.textButtonLabel}>Cancelar</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const saleStyles = StyleSheet.create({
  methods: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 5 },
  method: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
  },
  methodActive: {
    borderColor: COLORS.coral,
    backgroundColor: COLORS.coralSoft,
  },
  methodText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  methodTextActive: { color: COLORS.coral },
});

function CheckoutModal({
  addresses,
  address,
  paymentMethod,
  total,
  busy,
  onChangeAddress,
  onSelectAddress,
  onChangePaymentMethod,
  onSubmit,
  onClose,
}: {
  addresses: SavedAddress[];
  address: string;
  paymentMethod: "pix" | "cash";
  total: number;
  busy: boolean;
  onChangeAddress: (value: string) => void;
  onSelectAddress: (address: SavedAddress) => void;
  onChangePaymentMethod: (value: "pix" | "cash") => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.modalBackdrop}
    >
      <View style={[styles.sheet, styles.sheetTall, { paddingBottom: bottomSafeInset(insets.bottom, Platform.OS) }]}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.eyebrow}>FINALIZAR PEDIDO</Text>
          <Text style={styles.sheetTitle}>Onde devemos entregar?</Text>
          <Text style={styles.muted}>
            Escolha um endereço salvo ou informe outro para este pedido.
          </Text>
          {addresses.length ? (
            <>
              <Text style={styles.fieldLabel}>ENDEREÇOS SALVOS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={checkoutStyles.savedAddresses}
              >
                {addresses.map((savedAddress) => (
                  <Pressable
                    key={savedAddress.id}
                    style={[
                      checkoutStyles.savedAddress,
                      address === formatSavedAddress(savedAddress) &&
                        checkoutStyles.savedAddressActive,
                    ]}
                    onPress={() => onSelectAddress(savedAddress)}
                  >
                    <Text style={checkoutStyles.savedAddressLabel}>
                      {savedAddress.label}
                      {savedAddress.isDefault ? " · Padrão" : ""}
                    </Text>
                    <Text style={checkoutStyles.savedAddressText}>
                      {formatSavedAddress(savedAddress)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
          <Text style={styles.fieldLabel}>ENDEREÇO DE ENTREGA</Text>
          <TextInput
            value={address}
            onChangeText={onChangeAddress}
            placeholder="Rua, número, bairro e complemento"
            placeholderTextColor={COLORS.muted}
            style={[styles.input, checkoutStyles.addressInput]}
            multiline
            returnKeyType="done"
          />
          <Text style={styles.fieldLabel}>FORMA DE PAGAMENTO</Text>
          <View style={checkoutStyles.methods}>
            {(["pix", "cash"] as const).map((method) => (
              <Pressable
                key={method}
                style={[
                  checkoutStyles.method,
                  paymentMethod === method && checkoutStyles.methodActive,
                ]}
                onPress={() => onChangePaymentMethod(method)}
              >
                <MaterialIcons
                  name={method === "pix" ? "pix" : "payments"}
                  size={18}
                  color={paymentMethod === method ? COLORS.coral : COLORS.muted}
                />
                <Text
                  style={[
                    checkoutStyles.methodText,
                    paymentMethod === method && checkoutStyles.methodTextActive,
                  ]}
                >
                  {method === "pix" ? "PIX" : "Dinheiro"}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total do pedido</Text>
            <Text
              style={styles.totalValue}
            >{`R$ ${total.toFixed(2).replace(".", ",")}`}</Text>
          </View>
          {paymentMethod === "pix" ? (
            <Text style={checkoutStyles.note}>
              Após confirmar, o pedido será criado e o PIX ficará disponível no
              acompanhamento.
            </Text>
          ) : null}
          <Pressable
            style={[styles.primaryButton, busy && styles.disabledButton]}
            disabled={busy}
            onPress={onSubmit}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? "Enviando pedido..." : "Confirmar pedido"}
            </Text>
            <MaterialIcons name="check" size={18} color={COLORS.white} />
          </Pressable>
          <Pressable style={styles.textButton} onPress={onClose}>
            <Text style={styles.textButtonLabel}>Voltar ao carrinho</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const checkoutStyles = StyleSheet.create({
  addressInput: { minHeight: 70, textAlignVertical: "top", paddingTop: 12 },
  savedAddresses: { gap: 8, paddingBottom: 4 },
  savedAddress: {
    width: 190,
    minHeight: 72,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    padding: 10,
    gap: 3,
  },
  savedAddressActive: {
    borderColor: COLORS.coral,
    backgroundColor: COLORS.coralSoft,
  },
  savedAddressLabel: { color: COLORS.ink, fontSize: 11, fontWeight: "900" },
  savedAddressText: { color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  methods: { flexDirection: "row", gap: 8 },
  method: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 13,
    backgroundColor: COLORS.white,
  },
  methodActive: {
    borderColor: COLORS.coral,
    backgroundColor: COLORS.coralSoft,
  },
  methodText: { color: COLORS.muted, fontSize: 11, fontWeight: "800" },
  methodTextActive: { color: COLORS.coral },
  note: {
    color: COLORS.orange,
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: "#FFF5E8",
    borderRadius: 10,
    padding: 9,
  },
});
