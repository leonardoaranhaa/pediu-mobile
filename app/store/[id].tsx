import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PEDIU } from "@/components/pediu-page";
import { storeHeaderCopy } from "@/lib/store-header";
import { cardElevation } from "@/lib/pediu-tokens";
import { bottomSafeInset } from "@/lib/screen-space";
import { useCart } from "@/providers/cart-provider";
import { trpc } from "@/lib/trpc";
import { Platform } from "react-native";

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = Number(id);
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState("Tudo");
  const query = trpc.pediu.marketplace.store.useQuery(
    { storeId },
    { enabled: Number.isInteger(storeId) && storeId > 0, staleTime: 30_000 },
  );
  const store = query.data;
  const header = useMemo(
    () =>
      store
        ? storeHeaderCopy({
            open: store.open,
            nextOpenLabel: store.nextOpenLabel,
            deliveryFee: store.deliveryFee,
            prepMinutes: store.prepMinutes,
            minOrder: store.minOrder,
          })
        : null,
    [store],
  );
  const categories = useMemo(() => {
    const names = new Set((store?.products ?? []).map((product) => product.category).filter(Boolean));
    return ["Tudo", ...names];
  }, [store?.products]);
  const visibleProducts = (store?.products ?? []).filter(
    (product) => category === "Tudo" || product.category === category,
  );
  const cartTotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const bottom = bottomSafeInset(insets.bottom, Platform.OS);

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F6F4", paddingTop: insets.top }}>
      <ScrollView
        stickyHeaderIndices={store ? [1] : []}
        contentContainerStyle={{ paddingBottom: (cart.itemCount ? 88 : 24) + bottom, paddingHorizontal: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={22} color="#111111" />
          </Pressable>
          <Text style={{ fontWeight: "800", color: "#111111" }}>{store?.name ?? "Loja"}</Text>
        </View>
        {query.isLoading ? <Text style={{ color: "#6E635A" }}>Carregando a loja...</Text> : null}
        {query.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>Não foi possível abrir esta loja. Tente de novo.</Text> : null}
        {!query.isLoading && !query.error && !store ? (
          <Text style={{ color: "#6E635A" }}>Esta loja ainda não está disponível.</Text>
        ) : null}
        {store && header ? (
          <View style={{ height: 120, borderRadius: 20, overflow: "hidden", backgroundColor: header.closed ? "#8C8178" : "#E20D2A", justifyContent: "flex-end", padding: 16 }}>
            {store.logoData ? (
              <Image source={{ uri: store.logoData }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.45 }} />
            ) : (
              <Text style={{ position: "absolute", right: 16, top: 12, fontSize: 64, fontWeight: "800", color: "rgba(255,255,255,0.28)" }}>
                {store.name.slice(0, 1).toUpperCase()}
              </Text>
            )}
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>{store.name}</Text>
            <Text style={{ color: "#fff", fontWeight: "800", marginTop: 4 }}>{header.badge}</Text>
          </View>
        ) : null}
        </View>
        {store && header ? (
          <View style={{ backgroundColor: "#F7F6F4", paddingVertical: 8 }}>
            <Text style={{ color: "#3A2A22", marginBottom: 8 }}>
              {[header.timeLabel, header.feeLabel, header.minOrderLabel].filter(Boolean).join("  ·  ")}
            </Text>
            {header.closedNote ? <Text style={{ color: "#6E635A", fontWeight: "700", marginBottom: 8 }}>{header.closedNote}</Text> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {categories.map((item) => {
                const selected = item === category;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setCategory(item)}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      backgroundColor: selected ? "#111111" : "#FFFFFF",
                    }}
                  >
                    <Text style={{ color: selected ? "#fff" : "#1A120C", fontWeight: "700" }}>{item}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View />
        )}
        {store ? (
          <View style={{ gap: 10, opacity: header?.closed ? 0.7 : 1 }}>
            {visibleProducts.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(product.id) } })}
                style={[{ flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 12, alignItems: "center" }, cardElevation("rest")]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "800", fontSize: 16, color: "#111" }}>{product.name}</Text>
                  {product.description ? <Text numberOfLines={2} style={{ color: "#6E635A" }}>{product.description}</Text> : null}
                  <Text style={{ color: PEDIU.coral, fontWeight: "800" }}>
                    {product.available ? `R$ ${Number(product.price).toFixed(2).replace(".", ",")}` : "Esgotado"}
                  </Text>
                </View>
                {product.imageData ? (
                  <Image source={{ uri: product.imageData }} style={{ width: 72, height: 72, borderRadius: 14 }} />
                ) : (
                  <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: "#F3E6E8", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="restaurant" size={28} color="#E20D2A" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
      {cart.itemCount > 0 ? (
        <Pressable
          onPress={() => router.push("/cart")}
          style={[
            {
              position: "absolute",
              left: 16,
              right: 16,
              bottom: bottom,
              backgroundColor: PEDIU.coral,
              borderRadius: 18,
              minHeight: 56,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            },
            cardElevation("raised"),
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
            {`Ver sacola · ${cart.itemCount} ${cart.itemCount === 1 ? "item" : "itens"}`}
          </Text>
          <Text style={{ color: "#fff", fontWeight: "800" }}>{`R$ ${cartTotal.toFixed(2).replace(".", ",")}`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
