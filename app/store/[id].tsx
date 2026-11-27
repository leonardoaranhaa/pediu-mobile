import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Image, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { storeHeaderCopy } from "@/lib/store-header";
import { minimumOrderShortfall } from "@/shared/pilot-ops";
import { cardElevation, PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { bottomSafeInset } from "@/lib/screen-space";
import { useCart } from "@/providers/cart-provider";
import { useAppPreferences } from "@/lib/app-preferences";
import { trpc } from "@/lib/trpc";

const T = PEDIU_TOKENS;

function money(value: number | string) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: T.white,
        borderWidth: 1,
        borderColor: T.line,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontFamily: T.fontBody, fontSize: 12, fontWeight: "600", color: T.muted }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: T.fontBody, fontSize: 15, fontWeight: "800", color: T.text }}>
        {value}
      </Text>
    </View>
  );
}

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = Number(id);
  const cart = useCart();
  const PAGE = useAppPreferences().theme.canvas;
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState("Tudo");
  const [menuQuery, setMenuQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
  const productCategories = useMemo(
    () => [...new Set((store?.products ?? []).map((product) => product.category).filter(Boolean))] as string[],
    [store?.products],
  );
  const categories = productCategories.length > 1 ? ["Tudo", ...productCategories] : productCategories;
  const activeCategory = categories.includes(category) ? category : (categories[0] ?? "Tudo");
  const visibleProducts = (store?.products ?? []).filter(
    (product) =>
      (activeCategory === "Tudo" || product.category === activeCategory) &&
      product.name.toLowerCase().includes(menuQuery.trim().toLowerCase()),
  );
  const cartTotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const bottom = bottomSafeInset(insets.bottom, Platform.OS);
  const shortfall = minimumOrderShortfall(cartTotal, store?.minOrder);
  const openProduct = (productId: number) =>
    router.push({ pathname: "/product/[id]", params: { id: String(productId) } });

  if (!store || !header) {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE, paddingTop: insets.top, paddingHorizontal: 16, gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={goBack} style={{ width: 44, height: 44, justifyContent: "center" }}>
          <MaterialIcons name="arrow-back" size={22} color={T.text} />
        </Pressable>
        <Text style={{ fontFamily: T.fontBody, fontSize: 15, color: query.error ? T.primary : T.muted, fontWeight: query.error ? "700" : "400" }}>
          {query.isLoading
            ? "Carregando a loja..."
            : query.error
              ? "Não foi possível abrir esta loja. Tente de novo."
              : "Esta loja ainda não está disponível."}
        </Text>
      </View>
    );
  }

  const subtitle = [header.badge, productCategories.slice(0, 2).join(", ")].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: PAGE }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: (cart.itemCount ? 96 : 24) + bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <View style={{ height: 140 + insets.top, backgroundColor: header.closed ? "#8C8178" : T.primary }}>
            {store.logoData ? (
              <Image source={{ uri: store.logoData }} blurRadius={18} style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.35 }} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={goBack}
              style={{
                position: "absolute",
                top: insets.top + 12,
                left: 16,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: T.white,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="arrow-back" size={22} color={T.text} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                marginTop: -36,
                width: 72,
                height: 72,
                borderRadius: 18,
                backgroundColor: T.white,
                borderWidth: 1,
                borderColor: T.line,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {store.logoData ? (
                <Image source={{ uri: store.logoData }} style={{ width: 72, height: 72 }} />
              ) : (
                <Text style={{ fontFamily: T.fontDisplay, fontWeight: "600", fontSize: 32, color: T.primary }}>
                  {store.name.slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={{ marginTop: 12, fontFamily: T.fontDisplay, fontWeight: "600", fontSize: 28, color: T.text }}>
              {store.name}
            </Text>
            <Text style={{ marginTop: 2, fontFamily: T.fontBody, fontSize: 14, fontWeight: "600", color: T.muted }}>
              <Text style={{ color: header.closed ? T.muted : "#0B7A51", fontWeight: "800" }}>{subtitle[0]}</Text>
              {subtitle[1] ? ` · ${subtitle[1]}` : ""}
            </Text>
            {header.closedNote ? (
              <Text style={{ marginTop: 4, fontFamily: T.fontBody, fontSize: 14, fontWeight: "700", color: T.text }}>
                {header.closedNote}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {header.timeLabel ? <InfoTile label="Entrega" value={header.timeLabel.replace("Cerca de ", "")} /> : null}
              <InfoTile label="Taxa" value={header.feeLabel.replace("Entrega ", "").replace("grátis", "Grátis")} />
              {header.minOrderLabel ? <InfoTile label="Mínimo" value={header.minOrderLabel.replace("Pedido mínimo ", "")} /> : null}
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: PAGE, paddingTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: T.line }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 20 }}>
              {categories.map((item) => {
                const selected = item === activeCategory;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setCategory(item)}
                    style={{ minHeight: 44, justifyContent: "center", borderBottomWidth: 3, borderBottomColor: selected ? T.primary : "transparent" }}
                  >
                    <Text style={{ fontFamily: T.fontBody, fontSize: 15, fontWeight: selected ? "800" : "600", color: selected ? T.text : T.muted }}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={searchOpen ? "Fechar busca no cardápio" : "Buscar no cardápio"}
              onPress={() => {
                if (searchOpen) setMenuQuery("");
                setSearchOpen(!searchOpen);
              }}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <MaterialIcons name={searchOpen ? "close" : "search"} size={22} color={T.text} />
            </Pressable>
          </View>
          {searchOpen ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <TextInput
                autoFocus
                value={menuQuery}
                onChangeText={setMenuQuery}
                placeholder="Buscar no cardápio"
                placeholderTextColor={T.muted}
                style={{
                  backgroundColor: T.white,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  minHeight: 44,
                  color: T.text,
                  fontFamily: T.fontBody,
                  fontSize: 15,
                }}
              />
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, opacity: header.closed ? 0.7 : 1 }}>
          {!visibleProducts.length ? (
            <Text style={{ paddingVertical: 20, fontFamily: T.fontBody, fontSize: 15, color: T.muted }}>
              {menuQuery.trim() ? "Nada com esse nome no cardápio." : "Esta loja ainda não tem produtos."}
            </Text>
          ) : null}
          {visibleProducts.map((product) => {
            const inCart = cart.items.filter((item) => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
            return (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                accessibilityLabel={`${product.name}, ${product.available ? money(product.price) : "esgotado"}${inCart ? `, ${inCart} na sacola` : ""}`}
                onPress={() => openProduct(product.id)}
                style={{ flexDirection: "row", gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.line }}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={{ fontFamily: T.fontBody, fontWeight: "800", fontSize: 16, color: T.text }}>{product.name}</Text>
                  {product.description ? (
                    <Text numberOfLines={2} style={{ fontFamily: T.fontBody, fontSize: 14, lineHeight: 19, color: T.muted }}>
                      {product.description}
                    </Text>
                  ) : null}
                  <Text style={{ marginTop: 4, fontFamily: T.fontBody, fontWeight: "800", fontSize: 16, color: product.available ? T.text : T.muted }}>
                    {product.available ? money(product.price) : "Esgotado"}
                  </Text>
                </View>
                <View style={{ width: 96, height: 96 }}>
                  <View style={{ width: 96, height: 96, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3E6D8", alignItems: "center", justifyContent: "center" }}>
                    {product.imageData ? (
                      <Image source={{ uri: product.imageData }} style={{ width: 96, height: 96 }} />
                    ) : (
                      <MaterialIcons name="restaurant" size={30} color="#B9A491" />
                    )}
                  </View>
                  {product.available ? (
                    <View
                      pointerEvents="none"
                      style={[
                        {
                          position: "absolute",
                          right: -6,
                          bottom: -6,
                          minWidth: 44,
                          height: 44,
                          paddingHorizontal: inCart ? 12 : 0,
                          borderRadius: 22,
                          backgroundColor: T.primary,
                          borderWidth: 3,
                          borderColor: PAGE,
                          alignItems: "center",
                          justifyContent: "center",
                        },
                      ]}
                    >
                      {inCart ? (
                        <Text style={{ color: T.white, fontFamily: T.fontBody, fontWeight: "800", fontSize: 16 }}>{inCart}</Text>
                      ) : (
                        <MaterialIcons name="add" size={22} color={T.white} />
                      )}
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {cart.itemCount > 0 ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: bottom, backgroundColor: PAGE, gap: 8 }}>
          {shortfall ? (
            <Text accessibilityLiveRegion="polite" style={{ fontFamily: T.fontBody, fontSize: 14, fontWeight: "700", color: T.text, textAlign: "center" }}>
              {shortfall}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver sacola, ${cart.itemCount} ${cart.itemCount === 1 ? "item" : "itens"}, ${money(cartTotal)}`}
            onPress={() => router.push("/cart")}
            style={[
              {
                backgroundColor: T.primary,
                borderRadius: 16,
                minHeight: 56,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              cardElevation("rest"),
            ]}
          >
            <Text style={{ color: T.white, fontFamily: T.fontBody, fontWeight: "800", fontSize: 16 }}>
              {`Ver sacola · ${cart.itemCount} ${cart.itemCount === 1 ? "item" : "itens"}`}
            </Text>
            <Text style={{ color: T.white, fontFamily: T.fontBody, fontWeight: "800", fontSize: 16 }}>{money(cartTotal)}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
