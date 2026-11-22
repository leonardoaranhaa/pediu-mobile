import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { Page, PEDIU, s } from "@/components/pediu-page";
import { storeHeaderCopy } from "@/lib/store-header";
import { cardElevation } from "@/lib/pediu-tokens";
import { useCart } from "@/providers/cart-provider";
import { trpc } from "@/lib/trpc";

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = Number(id);
  const cart = useCart();
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
  const facts = [header?.timeLabel, header?.feeLabel, header?.minOrderLabel].filter(Boolean);
  const categories = useMemo(() => {
    const names = new Set((store?.products ?? []).map((product) => product.category).filter(Boolean));
    return ["Tudo", ...names];
  }, [store?.products]);
  const visibleProducts = (store?.products ?? []).filter(
    (product) => category === "Tudo" || product.category === category,
  );
  const cartTotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const cartBar =
    cart.itemCount > 0 ? (
      <Pressable
        onPress={() => router.push("/cart")}
        style={[
          {
            marginHorizontal: 16,
            marginBottom: 8,
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
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
          {`Ver sacola · ${cart.itemCount} ${cart.itemCount === 1 ? "item" : "itens"}`}
        </Text>
        <Text style={{ color: "#fff", fontWeight: "900" }}>
          {`R$ ${cartTotal.toFixed(2).replace(".", ",")}`}
        </Text>
      </Pressable>
    ) : null;

  return (
    <Page title={store?.name ?? "Loja"} eyebrow="CARDÁPIO" back dock={cartBar}>
      {query.isLoading ? <Text style={s.muted}>Carregando a loja...</Text> : null}
      {query.error ? (
        <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>
          Não foi possível abrir esta loja. Tente de novo.
        </Text>
      ) : null}
      {!query.isLoading && !query.error && !store ? (
        <Text style={s.muted}>
          Esta loja ainda não está disponível. Se ela está em análise, os produtos aparecem depois da aprovação.
        </Text>
      ) : null}
      {store && header ? (
        <View style={{ gap: 14, opacity: header.closed ? 0.72 : 1 }}>
          {store.reviewing ? (
            <View style={{ backgroundColor: "#FFF3C4", borderRadius: 16, padding: 14 }}>
              <Text style={{ color: "#111111", fontWeight: "900" }}>Sua loja está em análise</Text>
              <Text style={{ color: "#3A2A22", marginTop: 4 }}>
                Os clientes ainda não veem estes produtos.
              </Text>
            </View>
          ) : null}
          {store.rejected ? (
            <View style={{ backgroundColor: "#FDE8EA", borderRadius: 16, padding: 14 }}>
              <Text style={{ color: "#111111", fontWeight: "900" }}>Sua loja foi reprovada</Text>
            </View>
          ) : null}
          <View
            style={{
              backgroundColor: header.closed ? "#F4EFE8" : PEDIU.white,
              borderRadius: 24,
              padding: 16,
              gap: 12,
              borderWidth: 1,
              borderColor: PEDIU.line,
            }}
          >
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              {store.logoData ? (
                <Image
                  source={{ uri: store.logoData }}
                  style={{ width: 72, height: 72, borderRadius: 18 }}
                />
              ) : (
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    backgroundColor: "#FFE2C4",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 28, fontWeight: "900", color: "#163B48" }}>
                    {store.name.trim().slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: "#111111" }}>{store.name}</Text>
                <View
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: header.closed ? "#E7E1DA" : "#E5F6EE",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontWeight: "900", color: header.closed ? "#6E635A" : "#0B8A5C" }}>
                    {header.badge}
                  </Text>
                </View>
              </View>
            </View>
            {facts.length ? (
              <Text style={{ color: "#3A2A22", fontSize: 14, lineHeight: 20 }}>{facts.join("  ·  ")}</Text>
            ) : null}
            {header.closedNote ? (
              <Text style={{ color: "#6E635A", fontWeight: "700" }}>{header.closedNote}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
                    backgroundColor: selected ? PEDIU.coral : PEDIU.white,
                    borderWidth: 1,
                    borderColor: selected ? PEDIU.coral : PEDIU.line,
                  }}
                >
                  <Text style={{ color: selected ? "#fff" : "#1A120C", fontWeight: "800" }}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ gap: 8 }}>
            {visibleProducts.map((product) => (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                accessibilityLabel={product.name}
                onPress={() =>
                  router.push({ pathname: "/product/[id]", params: { id: String(product.id) } })
                }
                style={[
                  {
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                    backgroundColor: PEDIU.white,
                    borderRadius: 16,
                    padding: 12,
                    opacity: product.available ? 1 : 0.55,
                  },
                  cardElevation("rest"),
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "900", color: "#111111", fontSize: 16 }} numberOfLines={2}>
                    {product.name}
                  </Text>
                  {product.description ? (
                    <Text style={{ color: "#6E635A", fontSize: 13 }} numberOfLines={2}>
                      {product.description}
                    </Text>
                  ) : null}
                  <Text style={{ color: PEDIU.coral, fontWeight: "900", fontSize: 16 }}>
                    {product.available ? `R$ ${Number(product.price).toFixed(2).replace(".", ",")}` : "Esgotado"}
                  </Text>
                </View>
                {product.imageData ? (
                  <Image
                    source={{ uri: product.imageData }}
                    style={{ width: 72, height: 72, borderRadius: 14 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 14,
                      backgroundColor: "#FFF0D7",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#6E635A", fontWeight: "800", fontSize: 12 }}>Sem foto</Text>
                  </View>
                )}
              </Pressable>
            ))}
            {!visibleProducts.length ? (
              <Text style={s.muted}>Nenhum produto nesta categoria.</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </Page>
  );
}
