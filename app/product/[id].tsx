import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  Page,
  Card,
  PrimaryButton,
  OutlineButton,
  PEDIU,
  s,
} from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/providers/cart-provider";
import type { CartProduct } from "@/lib/cart";

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id);
  const query = trpc.pediu.marketplace.products.useQuery(undefined, {
    enabled: Number.isInteger(productId) && productId > 0,
    staleTime: 30_000,
  });
  const product = useMemo(
    () => (query.data ?? []).find((item) => item.id === productId),
    [query.data, productId],
  );
  const { addItem, itemCount, updateNote } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [storeConflict, setStoreConflict] = useState<{
    currentStoreName: string;
    nextStoreName: string;
    product: CartProduct;
    quantity: number;
  } | null>(null);

  if (!Number.isInteger(productId) || productId <= 0) {
    return (
      <Page title="Produto" eyebrow="CATÁLOGO">
        <Card>
          <Text style={s.sectionTitle}>Produto inválido</Text>
          <Text style={s.muted}>
            Não foi possível identificar o produto solicitado.
          </Text>
        </Card>
      </Page>
    );
  }

  if (query.isLoading) {
    return (
      <Page title="Produto" eyebrow="CATÁLOGO">
        <Card>
          <Text style={s.sectionTitle}>Carregando produto...</Text>
          <Text style={s.muted}>
            Buscando disponibilidade e preço atuais.
          </Text>
        </Card>
      </Page>
    );
  }

  if (query.isError || !product) {
    return (
      <Page title="Produto" eyebrow="CATÁLOGO">
        <Card>
          <Text style={s.sectionTitle}>Produto indisponível</Text>
          <Text style={s.muted}>
            O produto pode ter sido removido, estar indisponível ou a loja
            estar fechada.
          </Text>
        </Card>
      </Page>
    );
  }

  const toCartProduct = (): CartProduct => ({
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    storeName: product.storeName,
    category: product.category,
    description: product.description,
    price: String(product.price),
    deliveryFee: String(product.deliveryFee ?? "0.00"),
    emoji:
      product.category === "Lanches"
        ? "🍔"
        : product.category === "Doces"
          ? "🍰"
          : "🛠️",
  });

  const finishAdd = (mode: "reject" | "replace") => {
    const cartProduct = toCartProduct();
    const result = addItem(cartProduct, quantity, mode);
    if (!result.ok) {
      if (result.conflictStore && mode === "reject") {
        setStoreConflict({
          currentStoreName: result.conflictStore.currentStoreName,
          nextStoreName: result.conflictStore.nextStoreName,
          product: cartProduct,
          quantity,
        });
        setNotice(result.error ?? "");
        return;
      }
      setNotice(result.error ?? "Não foi possível adicionar o produto.");
      return;
    }
    if (note.trim()) {
      updateNote(product.id, note.trim());
    }
    setStoreConflict(null);
    setNotice(`${quantity} item(ns) adicionado(s) ao carrinho.`);
  };

  return (
    <Page
      title={product.name}
      eyebrow={product.storeName}
      back
      action={
        <Pressable onPress={() => router.push("/cart")}>
          <Text style={{ color: PEDIU.coral, fontWeight: "900" }}>
            Carrinho ({itemCount})
          </Text>
        </Pressable>
      }
    >
      <Card>
        <View
          style={{
            width: "100%",
            height: 180,
            borderRadius: 18,
            backgroundColor: PEDIU.coralSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 58 }}>
            {product.category === "Lanches"
              ? "🍔"
              : product.category === "Doces"
                ? "🍰"
                : "🛠️"}
          </Text>
        </View>
        <Text style={s.sectionTitle}>{product.name}</Text>
        <Text style={s.muted}>
          {product.description || "Produto disponível para pedido."}
        </Text>
        <Text style={{ color: PEDIU.coral, fontSize: 22, fontWeight: "900" }}>
          R$ {Number(product.price).toFixed(2).replace(".", ",")}
        </Text>
        <Text style={s.muted}>
          {product.available ? "Disponível agora" : "Indisponível"} ·{" "}
          {product.category}
        </Text>
        <Text style={s.muted}>
          Entrega estimada da loja: R${" "}
          {Number(product.deliveryFee ?? 0).toFixed(2).replace(".", ",")}{" "}
          (recalculada no checkout)
        </Text>
      </Card>

      <Card>
        <Text style={s.sectionTitle}>Quantidade</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            disabled={quantity <= 1}
            onPress={() => setQuantity((current) => Math.max(1, current - 1))}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: PEDIU.line,
              alignItems: "center",
              justifyContent: "center",
              opacity: quantity <= 1 ? 0.4 : 1,
            }}
          >
            <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>
              −
            </Text>
          </Pressable>
          <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>
            {quantity}
          </Text>
          <Pressable
            onPress={() => setQuantity((current) => Math.min(50, current + 1))}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: PEDIU.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: PEDIU.ink, fontSize: 22, fontWeight: "900" }}>
              +
            </Text>
          </Pressable>
        </View>

        <Text style={[s.sectionTitle, { marginTop: 8 }]}>Observação</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Ex.: sem cebola, ponto da carne..."
          placeholderTextColor={PEDIU.muted}
          multiline
          style={{
            borderWidth: 1,
            borderColor: PEDIU.line,
            borderRadius: 12,
            padding: 12,
            minHeight: 72,
            color: PEDIU.ink,
            backgroundColor: PEDIU.canvas,
            textAlignVertical: "top",
          }}
        />

        {storeConflict ? (
          <View
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 14,
              backgroundColor: PEDIU.peach,
              gap: 8,
            }}
          >
            <Text style={s.sectionTitle}>Trocar de loja?</Text>
            <Text style={s.muted}>
              Seu carrinho tem itens de{" "}
              <Text style={{ fontWeight: "900" }}>
                {storeConflict.currentStoreName}
              </Text>
              . Para pedir em{" "}
              <Text style={{ fontWeight: "900" }}>
                {storeConflict.nextStoreName}
              </Text>
              , o carrinho atual será substituído. Cada pedido é de uma única
              loja.
            </Text>
            <PrimaryButton
              title="Substituir carrinho e adicionar"
              onPress={() => finishAdd("replace")}
            />
            <OutlineButton
              title="Manter carrinho atual"
              onPress={() => {
                setStoreConflict(null);
                setNotice("Carrinho mantido. Nenhuma alteração foi feita.");
              }}
            />
          </View>
        ) : null}

        {notice && !storeConflict ? (
          <Text
            style={{
              color: notice.includes("adicionado")
                ? PEDIU.green
                : PEDIU.coral,
              fontSize: 12,
              marginTop: 6,
            }}
          >
            {notice}
          </Text>
        ) : null}

        <PrimaryButton
          title={
            product.available ? "Adicionar ao carrinho" : "Produto indisponível"
          }
          disabled={!product.available}
          onPress={() => finishAdd("reject")}
        />
        {itemCount > 0 ? (
          <Pressable onPress={() => router.push("/cart")}>
            <Text
              style={{
                color: PEDIU.ink,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              Ver carrinho
            </Text>
          </Pressable>
        ) : null}
      </Card>

      <Card>
        <Text style={s.muted}>
          Adicionais estruturados (modificadores com preço), horário de
          funcionamento da loja e frete por zona serão calculados no servidor
          quando o catálogo da loja expuser esses dados. O total do checkout
          sempre prevalece sobre a estimativa local.
        </Text>
      </Card>
    </Page>
  );
}
