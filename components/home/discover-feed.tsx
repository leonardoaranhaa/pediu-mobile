import { MaterialIcons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { HomeStoreCards } from "@/components/home/store-cards";
import { PediuPressable } from "@/components/pediu-motion";
import { HomeSkeleton } from "@/components/ui/skeleton";
import { groupHomeStores, prepEstimateLabel, priceValue, type HomeStoreCard } from "@/lib/home-stores";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

const CATEGORIES = [
  { label: "Restaurantes", query: "Lanches", icon: "restaurant" as const },
  { label: "Mercado", query: "Mercado", icon: "storefront" as const },
  { label: "Pizza", query: "Pizza", icon: "local-pizza" as const },
  { label: "Bebidas", query: "Bebidas", icon: "local-bar" as const },
  { label: "Japonesa", query: "Japonesa", icon: "set-meal" as const },
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

function money(value?: string | null) {
  return `R$ ${priceValue(value).toFixed(2).replace(".", ",")}`;
}

export function DiscoverFeed({
  products,
  loading,
  error,
  searchQuery,
  setSearchQuery,
  locationTitle,
  onLocationPress,
  onNotifications,
  onSearch,
  onCategory,
  onOpenStore,
  onOpenProduct,
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
  onOpenStore: (store: HomeStoreCard) => void;
  onOpenProduct?: (productId: number) => void;
  hasFast?: boolean;
}) {
  const stores = groupHomeStores(products);
  const { width } = useWindowDimensions();
  const rowWidth = Math.min(width, 430) - 32;
  const dishes = products.filter((item) => item.available !== false && item.storeOpen !== false && priceValue(item.price) > 0).slice(0, 8);
  const dishWidth = dishes.length > 1 ? Math.round(rowWidth * 0.82) : rowWidth;
  return (
    <View style={{ gap: 16, width: rowWidth, alignSelf: "stretch" }}>
      <View style={{ width: rowWidth, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escolher onde entregar"
          onPress={onLocationPress}
          style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <MaterialIcons name="location-on" size={22} color={PEDIU_TOKENS.primary} />
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "600", color: PEDIU_TOKENS.muted, fontSize: 12 }}>
              Entregar em
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "800", color: PEDIU_TOKENS.text, fontSize: 15 }}>
              {locationTitle || "Informe seu endereço"}
            </Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={20} color={PEDIU_TOKENS.text} />
        </Pressable>
        </View>
        <PediuPressable
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          onPress={onNotifications}
          style={[
            {
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: PEDIU_TOKENS.white,
              borderWidth: 1,
              borderColor: PEDIU_TOKENS.line,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <MaterialIcons name="notifications-none" size={22} color={PEDIU_TOKENS.text} />
        </PediuPressable>
      </View>

      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: PEDIU_TOKENS.white,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: PEDIU_TOKENS.line,
            paddingHorizontal: 14,
            height: 48,
          },
        ]}
      >
        <MaterialIcons name="search" size={20} color={PEDIU_TOKENS.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar comida ou loja"
          placeholderTextColor={PEDIU_TOKENS.subtle}
          style={{ flex: 1, marginLeft: 8, color: PEDIU_TOKENS.text, fontSize: 15, fontFamily: PEDIU_TOKENS.fontBody }}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {CATEGORIES.map((item) => (
          <PediuPressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${item.label}`}
            onPress={() => onCategory(item.query)}
            style={{
              minHeight: 40,
              paddingHorizontal: 14,
              borderRadius: PEDIU_TOKENS.radius.pill,
              borderWidth: 1,
              borderColor: PEDIU_TOKENS.line,
              backgroundColor: PEDIU_TOKENS.white,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <MaterialIcons name={item.icon} size={18} color={PEDIU_TOKENS.primary} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: PEDIU_TOKENS.text, fontFamily: PEDIU_TOKENS.fontBody }}>
              {item.label}
            </Text>
          </PediuPressable>
        ))}
      </ScrollView>

      {!loading && !error && dishes.length ? (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={{ fontFamily: PEDIU_TOKENS.fontDisplay, fontWeight: "600", fontSize: 22, color: PEDIU_TOKENS.text }}>
            Pratos perto de você
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {dishes.map((dish) => (
              <PediuPressable
                key={dish.id}
                accessibilityRole="button"
                accessibilityLabel={`${dish.name}, ${dish.store}, ${money(dish.price)}`}
                onPress={() => onOpenProduct?.(dish.id)}
                style={{
                  width: dishWidth,
                  flexDirection: "row",
                  gap: 12,
                  padding: 12,
                  borderRadius: PEDIU_TOKENS.radius.lg,
                  borderWidth: 1,
                  borderColor: PEDIU_TOKENS.line,
                  backgroundColor: PEDIU_TOKENS.white,
                }}
              >
                <View style={{ width: 84, height: 84, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3E6D8", alignItems: "center", justifyContent: "center" }}>
                  {dish.imageUrl ? (
                    <Image source={{ uri: dish.imageUrl }} style={{ width: 84, height: 84 }} />
                  ) : (
                    <MaterialIcons name="restaurant" size={28} color="#B9A491" />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: 4 }}>
                  <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "800", fontSize: 16, color: PEDIU_TOKENS.text }}>
                    {dish.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontSize: 13, color: PEDIU_TOKENS.muted }}>
                    {[dish.store, prepEstimateLabel(dish.prepMinutes)].filter(Boolean).join(" · ")}
                  </Text>
                  <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "800", fontSize: 16, color: PEDIU_TOKENS.text }}>
                    {money(dish.price)}
                  </Text>
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
        storesEmpty(stores) ? (
          <Text style={{ color: PEDIU_TOKENS.muted, fontSize: 15 }}>
            Nenhuma loja disponível agora. Quando alguém abrir por perto, aparece aqui.
          </Text>
        ) : (
          <HomeStoreCards stores={stores} onOpen={onOpenStore} />
        )
      ) : null}
    </View>
  );
}

function storesEmpty(stores: HomeStoreCard[]) {
  return stores.length === 0;
}
