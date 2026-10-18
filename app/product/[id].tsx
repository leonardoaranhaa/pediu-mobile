import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { askToJoin } from "@/components/auth-prompt";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/providers/cart-provider";
import { formatCatalogPrice, unitSubtitle } from "@/shared/market-units";
import { formatMoney } from "@/shared/pilot-ops";

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id);
  const query = trpc.pediu.marketplace.detail.useQuery(
    { productId },
    { enabled: Number.isInteger(productId) && productId > 0 },
  );
  const { isAuthenticated } = useAuth();
  const { addItem, updateNote, itemCount } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Record<number, number>>({});

  const detail = query.data;
  const product = detail?.product;
  const extra = useMemo(() => {
    if (!detail) return 0;
    return detail.options.reduce((sum, group) => {
      const choiceId = selected[group.id];
      const choice = group.choices.find((item) => item.id === choiceId);
      return sum + Number(choice?.priceDelta ?? 0);
    }, 0);
  }, [detail, selected]);

  if (!Number.isInteger(productId) || productId <= 0)
    return (
      <Page title="Produto" eyebrow="CATÁLOGO">
        <Card>
          <Text style={s.sectionTitle}>Produto inválido</Text>
          <Text style={s.muted}>Não foi possível identificar o produto solicitado.</Text>
        </Card>
      </Page>
    );
  if (query.isLoading)
    return (
      <Page title="Produto" eyebrow="CATÁLOGO">
        <Card>
          <Text style={s.sectionTitle}>Carregando produto...</Text>
          <Text style={s.muted}>Buscando disponibilidade e preço atuais.</Text>
        </Card>
      </Page>
    );
  if (query.isError || !detail || !product)
    return (
      <Page title="Produto" eyebrow="CATÁLOGO">
        <Card>
          <Text style={s.sectionTitle}>Produto indisponível</Text>
          <Text style={s.muted}>O produto pode ter sido removido ou estar indisponível.</Text>
        </Card>
      </Page>
    );

  const unitPrice = Number(product.price) + extra;
  const storeClosed = detail.storeOpen === false;
  const chosenNames = detail.options
    .map((group) => group.choices.find((choice) => choice.id === selected[group.id])?.name)
    .filter((name): name is string => Boolean(name));

  const addToCart = () => {
    if (storeClosed) {
      setNotice(detail.nextOpenLabel ?? "Esta loja está fechada agora.");
      return;
    }
    const missing = detail.options.find((group) => group.required && !selected[group.id]);
    if (missing) {
      setNotice(`Escolha ${missing.name} para continuar.`);
      return;
    }
    if (!isAuthenticated) {
      askToJoin({ action: "cart", returnTo: `/product/${product.id}` });
      return;
    }
    const result = addItem(
      {
        id: product.id,
        storeId: product.storeId,
        name: product.name,
        storeName: detail.storeName,
        category: product.category,
        description: product.description,
        price: unitPrice.toFixed(2),
        deliveryFee: String(detail.deliveryFee ?? "0.00"),
        storeKind: detail.storeKind,
        flashEnabled: Boolean(detail.flashEnabled),
        saleUnit: product.saleUnit,
        packSize: product.packSize,
        emoji: product.category === "Lanches" ? "🍔" : product.category === "Doces" ? "🍰" : detail.storeKind === "market" ? "🛒" : "🍽️",
      },
      quantity,
    );
    if (!result.ok) {
      setNotice(result.error ?? "Não foi possível adicionar o produto.");
      return;
    }
    if (chosenNames.length) updateNote(product.id, chosenNames.join(", "));
    setNotice(`${quantity} item(ns) adicionado(s) ao carrinho.`);
  };

  const openCart = () => {
    if (!isAuthenticated) {
      askToJoin({ action: "cart", returnTo: `/product/${product.id}` });
      return;
    }
    router.push("/cart");
  };

  return (
    <Page
      title={product.name}
      eyebrow={detail.storeName}
      back
      action={
        <Pressable onPress={openCart}>
          <Text style={{ color: PEDIU.coral, fontWeight: "900" }}>Carrinho ({itemCount})</Text>
        </Pressable>
      }
    >
      <Card>
        {product.imageData ? (
          <Image source={{ uri: product.imageData }} style={{ width: "100%", height: 180, borderRadius: 18 }} />
        ) : (
          <View style={{ width: "100%", height: 180, borderRadius: 18, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 58 }}>{product.category === "Lanches" ? "🍔" : product.category === "Doces" ? "🍰" : "🍽️"}</Text>
          </View>
        )}
        <Text style={s.sectionTitle}>{product.name}</Text>
        <Text style={s.muted}>{product.description || "Produto disponível para pedido."}</Text>
        <Text style={{ color: PEDIU.coral, fontSize: 22, fontWeight: "900" }}>
          {formatMoney(unitPrice)}
        </Text>
        {extra > 0 ? (
          <Text style={s.muted}>
            Preço base {formatCatalogPrice(product.price, product.saleUnit, product.packSize)} + adicionais
          </Text>
        ) : unitSubtitle(product.saleUnit, product.packSize) ? (
          <Text style={s.muted}>{unitSubtitle(product.saleUnit, product.packSize)}</Text>
        ) : null}
        {storeClosed ? (
          <Text style={{ color: PEDIU.coral, fontWeight: "900" }}>
            Fechado{detail.nextOpenLabel ? ` · ${detail.nextOpenLabel}` : ""}
          </Text>
        ) : (
          <Text style={s.muted}>
            {product.available ? "Disponível agora" : "Indisponível"} · {product.category}
          </Text>
        )}
      </Card>
      {detail.options.map((group) => (
        <Card key={group.id}>
          <Text style={s.sectionTitle}>
            {group.name}
            {group.required ? " · obrigatório" : ""}
          </Text>
          {group.choices.map((choice) => {
            const on = selected[group.id] === choice.id;
            return (
              <Pressable
                key={choice.id}
                onPress={() => setSelected((current) => ({ ...current, [group.id]: choice.id }))}
                style={{
                  borderWidth: 1,
                  borderColor: on ? PEDIU.coral : PEDIU.line,
                  backgroundColor: on ? PEDIU.coralSoft : PEDIU.white,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text style={{ color: PEDIU.ink, fontWeight: "800" }}>
                  {choice.name}
                  {Number(choice.priceDelta) > 0 ? ` · + ${formatMoney(choice.priceDelta)}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      ))}
      <Card>
        <Text style={s.sectionTitle}>Quantidade</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable disabled={quantity <= 1} onPress={() => setQuantity((current) => Math.max(1, current - 1))} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: PEDIU.line, alignItems: "center", justifyContent: "center", opacity: quantity <= 1 ? 0.4 : 1 }}>
            <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>−</Text>
          </Pressable>
          <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>{quantity}</Text>
          <Pressable onPress={() => setQuantity((current) => Math.min(50, current + 1))} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: PEDIU.line, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>+</Text>
          </Pressable>
        </View>
        {notice ? <Text style={s.muted}>{notice}</Text> : null}
        <PrimaryButton
          title={storeClosed ? "Loja fechada" : "Adicionar ao carrinho"}
          onPress={addToCart}
          disabled={storeClosed || !product.available}
        />
      </Card>
    </Page>
  );
}
