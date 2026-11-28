import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { askToJoin } from "@/components/auth-prompt";
import { Page, Card, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/providers/cart-provider";
import {
  missingOptionChoice,
  selectedOptionChoices,
  toggleOptionChoice,
  type OptionSelection,
} from "@/lib/option-selection";
import { OptionGroupPicker } from "@/components/option-group-picker";
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
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  // Nothing starts selected: the customer picks every add-on themselves.
  const [selected, setSelected] = useState<OptionSelection>({});

  const detail = query.data;
  const product = detail?.product;
  const extra = useMemo(() => {
    if (!detail) return 0;
    return selectedOptionChoices(detail.options, selected).reduce(
      (sum, { choice }) => sum + Number(choice.priceDelta ?? 0),
      0,
    );
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
  const chosen = selectedOptionChoices(detail.options, selected).map(({ group, choice }) => ({
    id: choice.id,
    groupId: group.id,
    groupName: group.name,
    name: choice.name,
    priceDelta: String(choice.priceDelta),
  }));

  const addToCart = () => {
    if (storeClosed) {
      setNotice(detail.nextOpenLabel ?? "Esta loja está fechada agora.");
      return;
    }
    const missing = missingOptionChoice(detail.options, selected);
    if (missing) {
      setNotice(missing.message);
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
        options: chosen,
        emoji: product.category === "Lanches" ? "🍔" : product.category === "Doces" ? "🍰" : detail.storeKind === "market" ? "🛒" : "🍽️",
      },
      quantity,
    );
    if (!result.ok) {
      setNotice(result.error ?? "Não foi possível adicionar o produto.");
      return;
    }
    const label = quantity === 1 ? "1 item foi para a sacola." : `${quantity} itens foram para a sacola.`;
    setNotice(label);
    router.back();
  };

  return (
    <Page
      title={detail.storeName}
      eyebrow="PRODUTO"
      back
      dock={
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <PrimaryButton
            title={storeClosed ? "Loja fechada" : product.available ? "Adicionar" : "Esgotado"}
            onPress={addToCart}
            disabled={storeClosed || !product.available}
          />
        </View>
      }
    >
      <Card>
        {product.imageData ? (
          <Image source={{ uri: product.imageData }} style={{ width: "100%", height: 180, borderRadius: 18 }} />
        ) : (
          <View style={{ width: "100%", height: 180, borderRadius: 18, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="restaurant" size={42} color={PEDIU.coral} />
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
            {detail.nextOpenLabel ?? "Fechada no momento"}
          </Text>
        ) : (
          <Text style={s.muted}>
            {product.available ? "Disponível agora" : "Esgotado"} · {product.category}
          </Text>
        )}
      </Card>
      {detail.options.map((group) => (
        <Card key={group.id}>
          <OptionGroupPicker
            group={group}
            selection={selected}
            titleStyle={s.sectionTitle}
            palette={{
              accent: PEDIU.coral,
              accentSoft: PEDIU.coralSoft,
              line: PEDIU.line,
              surface: PEDIU.white,
              ink: PEDIU.ink,
              muted: PEDIU.muted,
            }}
            onToggle={(choiceId) => {
              const result = toggleOptionChoice(selected, group, choiceId);
              setSelected(result.selection);
              setNotice(result.notice ?? "");
            }}
          />
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
      </Card>
    </Page>
  );
}
