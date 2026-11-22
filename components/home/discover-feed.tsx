import { MaterialIcons } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, View } from "react-native";
import { HomeStoreCards } from "@/components/home/store-cards";
import { PediuPressable } from "@/components/pediu-motion";
import { HomeSkeleton } from "@/components/ui/skeleton";
import { groupHomeStores, type HomeStoreCard } from "@/lib/home-stores";
import { cardElevation, PEDIU_TOKENS } from "@/lib/pediu-tokens";

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
};

export function DiscoverFeed({
  products,
  loading,
  error,
  greeting,
  subtitle,
  searchQuery,
  setSearchQuery,
  locationTitle,
  locationAddress,
  locationLoading,
  onLocationPress,
  onNotifications,
  onSearch,
  onCategory,
  onOpenStore,
  hasFast,
}: {
  products: Product[];
  loading: boolean;
  error: boolean;
  greeting: string;
  subtitle: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  locationTitle: string;
  locationAddress: string;
  locationLoading: boolean;
  onLocationPress: () => void;
  onNotifications: () => void;
  onSearch: () => void;
  onCategory: (value: string) => void;
  onOpenStore: (store: HomeStoreCard) => void;
  hasFast: boolean;
}) {
  const stores = groupHomeStores(products);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <PediuPressable
          accessibilityRole="button"
          accessibilityLabel="Escolher onde entregar"
          onPress={onLocationPress}
          style={[
            {
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            },
            cardElevation("rest"),
          ]}
        >
          <MaterialIcons name="location-on" size={20} color={PEDIU_TOKENS.primary} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontWeight: "800", color: PEDIU_TOKENS.inkDeep, fontSize: 15 }}>
              {locationLoading ? "Buscando endereço..." : locationTitle}
            </Text>
            <Text numberOfLines={1} style={{ color: PEDIU_TOKENS.muted, fontSize: 13 }}>
              {locationAddress || "Toque para informar onde entregar"}
            </Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={20} color={PEDIU_TOKENS.subtle} />
        </PediuPressable>
        <PediuPressable
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          onPress={onNotifications}
          style={[
            {
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            },
            cardElevation("rest"),
          ]}
        >
          <MaterialIcons name="notifications-none" size={24} color={PEDIU_TOKENS.inkDeep} />
        </PediuPressable>
      </View>

      <View>
        <Text style={{ fontSize: 28, fontWeight: "800", color: PEDIU_TOKENS.inkDeep }}>{greeting}</Text>
        {subtitle ? (
          <Text style={{ marginTop: 4, color: PEDIU_TOKENS.muted, fontSize: 15, lineHeight: 21 }}>{subtitle}</Text>
        ) : null}
      </View>

      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingHorizontal: 14,
            height: 52,
          },
          cardElevation("raised"),
        ]}
      >
        <MaterialIcons name="search" size={22} color={PEDIU_TOKENS.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar comida ou loja"
          placeholderTextColor={PEDIU_TOKENS.subtle}
          style={{ flex: 1, marginLeft: 8, color: PEDIU_TOKENS.text, fontSize: 16 }}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 8 }}>
        {CATEGORIES.map((item) => (
          <PediuPressable key={item.label} onPress={() => onCategory(item.query)} style={{ alignItems: "center", width: 76, gap: 6 }}>
            <View
              style={[
                {
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                },
                cardElevation("rest"),
              ]}
            >
              <MaterialIcons name={item.icon} size={24} color={PEDIU_TOKENS.primary} />
            </View>
            <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: "700", color: PEDIU_TOKENS.text, textAlign: "center" }}>
              {item.label}
            </Text>
          </PediuPressable>
        ))}
      </ScrollView>

      <View
        style={{
          borderRadius: 20,
          padding: 16,
          backgroundColor: PEDIU_TOKENS.primary,
        }}
      >
        <Text style={{ color: "#FFF7F5", fontSize: 18, fontWeight: "800" }}>
          {hasFast ? "Entrega rápida perto de você" : "Peça no Pediu"}
        </Text>
        <Text style={{ color: "#FFE8EB", marginTop: 4, fontSize: 14 }}>
          {hasFast ? "Tem loja com entrega rápida agora." : "As lojas do bairro, no seu tempo."}
        </Text>
      </View>

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
