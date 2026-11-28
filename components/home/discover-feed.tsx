import { MaterialIcons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { HomeStoreCards } from "@/components/home/store-cards";
import { PediuPressable, PediuReveal } from "@/components/pediu-motion";
import { HomeSkeleton } from "@/components/ui/skeleton";
import { useCoachTarget } from "@/lib/coach-marks";
import { groupHomeStores, prepEstimateLabel, priceValue, type HomeStoreCard } from "@/lib/home-stores";
import { cardElevation, FOOD_THUMBS, PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";

type Category = {
  label: string;
  query: string;
  photo?: number;
  icon?: keyof typeof MaterialIcons.glyphMap;
  tint?: string;
};

const CATEGORIES: Category[] = [
  { label: "Lanches", query: "Lanches", photo: FOOD_THUMBS.burger },
  { label: "Pizza", query: "Pizza", photo: FOOD_THUMBS.pizza },
  { label: "Japonesa", query: "Japonesa", photo: FOOD_THUMBS.sushi },
  { label: "Doces", query: "Doces", photo: FOOD_THUMBS.acai },
  { label: "Massas", query: "Massas", photo: FOOD_THUMBS.pasta },
  { label: "Mercado", query: "Mercado", icon: "storefront", tint: "#FFE7A3" },
  { label: "Bebidas", query: "Bebidas", icon: "local-bar", tint: "#D9F1EE" },
];

type Product = {
  id: number;
  storeId?: number;
  name: string;
  store: string;
  imageUrl?: string | null;
  deliveryFee?: string | null;
  storeOpen?: boolean;
  nextOpenLabel?: string | null;
  distance?: string | null;
  flash?: boolean;
  prepMinutes?: number | null;
  logoData?: string | null;
  price?: string | null;
  available?: boolean;
};

type Banner = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  background: string;
  ink: string;
  photo: number;
  onPress?: () => void;
};

function money(value?: string | number | null) {
  return `R$ ${priceValue(value == null ? null : String(value)).toFixed(2).replace(".", ",")}`;
}

/** "R$ 20" for whole amounts, "R$ 7,50" otherwise: fits a banner title. */
function shortMoney(value?: string | number | null) {
  const amount = priceValue(value == null ? null : String(value));
  return Number.isInteger(amount) ? `R$ ${amount}` : money(amount);
}

function SectionTitle({ children, aside }: { children: string; aside?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
      <Text accessibilityRole="header" style={{ fontFamily: PEDIU_TOKENS.fontDisplay, fontWeight: "600", fontSize: 21, color: PEDIU_TOKENS.text }}>
        {children}
      </Text>
      {aside ? (
        <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "700", fontSize: 13, color: PEDIU_TOKENS.muted }}>{aside}</Text>
      ) : null}
    </View>
  );
}

function PromoCarousel({ banners, width }: { banners: Banner[]; width: number }) {
  const [page, setPage] = useState(0);
  const gap = 12;
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / (width + gap));
    if (next !== page) setPage(next);
  };
  if (!banners.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + gap}
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ gap }}
      >
        {banners.map((banner) => (
          <PediuPressable
            key={banner.id}
            accessibilityRole="button"
            accessibilityLabel={`${banner.title}. ${banner.body} ${banner.cta}`}
            onPress={banner.onPress}
            style={[
              {
                width,
                height: 148,
                borderRadius: 22,
                backgroundColor: banner.background,
                overflow: "hidden",
                padding: 18,
                justifyContent: "space-between",
              },
            ]}
          >
            <View
              style={{
                position: "absolute",
                right: -26,
                bottom: -30,
                width: 150,
                height: 150,
                borderRadius: 75,
                overflow: "hidden",
                borderWidth: 5,
                borderColor: "rgba(255,255,255,0.85)",
              }}
            >
              <Image source={banner.photo} style={{ width: "100%", height: "100%" }} />
            </View>
            <View style={{ gap: 4, maxWidth: width * 0.6 }}>
              <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "900", fontSize: 11, letterSpacing: 1.3, color: banner.ink, opacity: 0.85 }}>
                {banner.kicker}
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: PEDIU_TOKENS.fontDisplay, fontWeight: "600", fontSize: 23, color: banner.ink }}>
                {banner.title}
              </Text>
              <Text numberOfLines={2} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontSize: 13, lineHeight: 18, color: banner.ink, opacity: 0.9 }}>
                {banner.body}
              </Text>
            </View>
            <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: banner.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "900", fontSize: 12, color: banner.background }}>{banner.cta}</Text>
              <MaterialIcons name="arrow-forward" size={14} color={banner.background} />
            </View>
          </PediuPressable>
        ))}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }} accessibilityElementsHidden>
          {banners.map((banner, i) => (
            <View
              key={banner.id}
              style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? PEDIU_TOKENS.primary : PEDIU_TOKENS.line }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function DiscoverFeed({
  products,
  loading,
  error,
  greeting,
  subtitle,
  searchQuery,
  setSearchQuery,
  locationTitle,
  onLocationPress,
  onNotifications,
  onSearch,
  onCategory,
  activeCategory,
  onOpenStore,
  onOpenProduct,
  mascot,
  onBenefits,
  onClub,
  onFlash,
  hasFast,
}: {
  products: Product[];
  loading: boolean;
  error: boolean;
  greeting?: string;
  subtitle?: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  locationTitle: string;
  locationAddress?: string;
  locationLoading: boolean;
  onLocationPress: () => void;
  onNotifications: () => void;
  onSearch: () => void;
  onCategory: (value: string) => void;
  activeCategory?: string;
  onOpenStore: (store: HomeStoreCard) => void;
  onOpenProduct?: (productId: number) => void;
  mascot?: ReactNode;
  onBenefits?: () => void;
  onClub?: () => void;
  onFlash?: () => void;
  hasFast?: boolean;
}) {
  const stores = groupHomeStores(products);
  const { width } = useWindowDimensions();
  const rowWidth = Math.min(width, 430) - 32;
  const dishes = products.filter((item) => item.available !== false && item.storeOpen !== false && priceValue(item.price) > 0).slice(0, 8);
  const dishWidth = dishes.length > 1 ? Math.round(rowWidth * 0.82) : rowWidth;
  const addressRef = useCoachTarget("home.address");
  const searchRef = useCoachTarget("home.search");
  const categoriesRef = useCoachTarget("home.categories");
  const mascotRef = useCoachTarget("home.mascot");
  const bannersRef = useCoachTarget("home.banners");
  const coupons = trpc.pediu.coupons.available.useQuery(undefined, { staleTime: 5 * 60_000 });
  const coupon = coupons.data?.[0];
  const fast = hasFast || products.some((item) => item.flash);
  const active = CATEGORIES.find((item) => item.query === activeCategory);

  const banners: Banner[] = [];
  if (coupon) {
    const percentage = coupon.type === "percentage";
    const minimum = Number(coupon.minSubtotal ?? 0);
    banners.push({
      id: "coupon",
      kicker: `CUPOM ${coupon.code}`,
      title: percentage ? `${Number(coupon.value)}% de desconto` : `${shortMoney(coupon.value)} de desconto`,
      body: minimum > 0 ? `Em pedidos a partir de ${shortMoney(minimum)}. Use no checkout.` : "Use no checkout do seu próximo pedido.",
      cta: "Ver cupons",
      background: PEDIU_TOKENS.primary,
      ink: "#FFFFFF",
      photo: FOOD_THUMBS.burger,
      onPress: onBenefits,
    });
  }
  banners.push({
    id: "club",
    kicker: "CLUBE PEDIU",
    title: "Pedido vira ponto",
    body: "Junte pontos nos seus pedidos e troque por desconto.",
    cta: "Conhecer o Clube",
    background: PEDIU_TOKENS.accent,
    ink: PEDIU_TOKENS.text,
    photo: FOOD_THUMBS.acai,
    onPress: onClub,
  });
  if (fast) {
    banners.push({
      id: "flash",
      kicker: "PEDIU FLASH",
      title: "Entrega rapidinha",
      body: "Lojas com entrega expressa perto de você.",
      cta: "Ver lojas Flash",
      background: PEDIU_TOKENS.ink,
      ink: "#FFFFFF",
      photo: FOOD_THUMBS.pizza,
      onPress: onFlash,
    });
  }

  return (
    <View style={{ gap: 18, width: rowWidth, alignSelf: "stretch" }}>
      <View style={{ width: rowWidth, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Pressable
            ref={addressRef}
            accessibilityRole="button"
            accessibilityLabel="Escolher onde entregar"
            onPress={onLocationPress}
            style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", maxWidth: "100%" }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: PEDIU_TOKENS.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="location-on" size={20} color={PEDIU_TOKENS.primary} />
            </View>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "700", color: PEDIU_TOKENS.muted, fontSize: 12 }}>Entregar em</Text>
              <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "900", color: PEDIU_TOKENS.text, fontSize: 15 }}>
                {locationTitle || "Informe seu endereço"}
              </Text>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={PEDIU_TOKENS.primary} />
          </Pressable>
        </View>
        <PediuPressable
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          onPress={onNotifications}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: PEDIU_TOKENS.white,
            borderWidth: 1,
            borderColor: PEDIU_TOKENS.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="notifications-none" size={22} color={PEDIU_TOKENS.text} />
        </PediuPressable>
      </View>

      {greeting ? (
        <PediuReveal style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text accessibilityRole="header" style={{ fontFamily: PEDIU_TOKENS.fontDisplay, fontWeight: "600", fontSize: 26, lineHeight: 31, color: PEDIU_TOKENS.text }}>
              {greeting}
            </Text>
            {subtitle ? (
              <Text numberOfLines={2} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontSize: 15, lineHeight: 21, color: PEDIU_TOKENS.muted }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {mascot ? (
            <View ref={mascotRef} style={{ borderRadius: 40 }}>
              {mascot}
            </View>
          ) : null}
        </PediuReveal>
      ) : null}

      <View
        ref={searchRef}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: PEDIU_TOKENS.white,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: PEDIU_TOKENS.line,
            paddingHorizontal: 14,
            height: 52,
          },
          cardElevation("rest"),
        ]}
      >
        <MaterialIcons name="search" size={22} color={PEDIU_TOKENS.primary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar comida, loja ou mercado"
          placeholderTextColor={PEDIU_TOKENS.subtle}
          style={{ flex: 1, minWidth: 0, marginLeft: 10, color: PEDIU_TOKENS.text, fontSize: 15, fontFamily: PEDIU_TOKENS.fontBody }}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          accessibilityLabel="Buscar comida, loja ou mercado"
        />
      </View>

      <View ref={categoriesRef} style={{ marginHorizontal: -4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
          {CATEGORIES.map((item) => {
            const selected = activeCategory === item.query;
            return (
              <PediuPressable
                key={item.label}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={selected ? `${item.label}, filtro ativo. Toque para ver tudo` : `Ver ${item.label}`}
                onPress={() => onCategory(selected ? "" : item.query)}
                style={{ width: 76, alignItems: "center", gap: 6, paddingVertical: 2 }}
              >
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 22,
                    overflow: "hidden",
                    backgroundColor: item.tint ?? PEDIU_TOKENS.surfaceMuted,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: selected ? 3 : 0,
                    borderColor: PEDIU_TOKENS.primary,
                  }}
                >
                  {item.photo ? (
                    <Image source={item.photo} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <MaterialIcons name={item.icon ?? "restaurant"} size={30} color={PEDIU_TOKENS.text} />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: PEDIU_TOKENS.fontBody, fontSize: 13, fontWeight: selected ? "900" : "700", color: selected ? PEDIU_TOKENS.primary : PEDIU_TOKENS.text }}
                >
                  {item.label}
                </Text>
              </PediuPressable>
            );
          })}
        </ScrollView>
      </View>

      {!activeCategory && !searchQuery.trim() ? (
        <View ref={bannersRef}>
          <PromoCarousel banners={banners} width={rowWidth} />
        </View>
      ) : null}

      {!loading && !error && dishes.length ? (
        <View style={{ gap: 12 }}>
          <SectionTitle>{active ? `${active.label} perto de você` : "Pratos perto de você"}</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 6 }}>
            {dishes.map((dish) => (
              <PediuPressable
                key={dish.id}
                accessibilityRole="button"
                accessibilityLabel={`${dish.name}, ${dish.store}, ${money(dish.price)}`}
                onPress={() => onOpenProduct?.(dish.id)}
                style={[
                  {
                    width: dishWidth,
                    flexDirection: "row",
                    gap: 12,
                    padding: 12,
                    borderRadius: PEDIU_TOKENS.radius.lg,
                    borderWidth: 1,
                    borderColor: PEDIU_TOKENS.line,
                    backgroundColor: PEDIU_TOKENS.white,
                  },
                  cardElevation("rest"),
                ]}
              >
                <View style={{ width: 84, height: 84, borderRadius: 14, overflow: "hidden", backgroundColor: PEDIU_TOKENS.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
                  {dish.imageUrl ? (
                    <Image source={{ uri: dish.imageUrl }} style={{ width: 84, height: 84 }} />
                  ) : (
                    <MaterialIcons name="restaurant" size={30} color="#C8AE95" />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: 3 }}>
                  <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "900", fontSize: 16, color: PEDIU_TOKENS.text }}>
                    {dish.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontSize: 13, color: PEDIU_TOKENS.muted }}>
                    {[dish.store, prepEstimateLabel(dish.prepMinutes)].filter(Boolean).join(" · ")}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                    <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "900", fontSize: 16, color: PEDIU_TOKENS.text }}>{money(dish.price)}</Text>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: PEDIU_TOKENS.primary, alignItems: "center", justifyContent: "center" }}>
                      <MaterialIcons name="add" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </PediuPressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {loading ? <HomeSkeleton /> : null}
      {error ? (
        <Text style={{ color: PEDIU_TOKENS.error, fontWeight: "700" }}>
          Não foi possível carregar as lojas. Puxe a tela para tentar de novo.
        </Text>
      ) : null}
      {!loading && !error ? (
        stores.length === 0 ? (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 24 }}>
            <MaterialIcons name={active ? "search-off" : "storefront"} size={40} color={PEDIU_TOKENS.subtle} />
            <Text style={{ fontFamily: PEDIU_TOKENS.fontDisplay, fontWeight: "600", fontSize: 18, color: PEDIU_TOKENS.text, textAlign: "center" }}>
              {active ? `Ainda não tem ${active.label.toLowerCase()} por aqui` : "Nenhuma loja aberta por perto agora"}
            </Text>
            <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, color: PEDIU_TOKENS.muted, fontSize: 14, textAlign: "center" }}>
              {active ? "Experimente outra categoria ou veja tudo o que está aberto." : "Quando alguém abrir perto de você, aparece aqui."}
            </Text>
            {active ? (
              <PediuPressable
                accessibilityRole="button"
                onPress={() => onCategory("")}
                style={{ minHeight: 44, borderRadius: 999, paddingHorizontal: 18, justifyContent: "center", backgroundColor: PEDIU_TOKENS.primarySoft }}
              >
                <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "900", color: PEDIU_TOKENS.primary }}>Ver tudo</Text>
              </PediuPressable>
            ) : null}
          </View>
        ) : (
          <HomeStoreCards stores={stores} onOpen={onOpenStore} />
        )
      ) : null}
    </View>
  );
}
