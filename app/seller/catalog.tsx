import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductExtrasFields, type ProductExtras } from "@/components/product-extras-fields";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SellerDock } from "@/components/seller-dock";
import { EmptyState } from "@/components/pediu/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Card, Field, Page, PrimaryButton, Row, s } from "@/components/pediu-page";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import {
  MARKET_CATEGORY_SUGGESTIONS,
  MERCHANT_CATEGORY_SUGGESTIONS,
  catalogPlaceholder,
} from "@/lib/catalog-copy";
import { formatCatalogPrice, SALE_UNITS, SALE_UNIT_LABELS, suggestedSaleUnitForCategory, type SaleUnit } from "@/shared/market-units";

export default function SellerCatalogPage() {
  const { user } = useAuth();
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: Boolean(user) });
  const products = trpc.pediu.products.mine.useQuery({ storeId: store.data?.id ?? 0 }, { enabled: Boolean(store.data?.id), refetchInterval: 15_000 });
  const isMarket = store.data?.kind === "market";
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saleUnit, setSaleUnit] = useState<SaleUnit>("unit");
  const [packSize, setPackSize] = useState("");
  const [extras, setExtras] = useState<ProductExtras>({});
  const [seed, setSeed] = useState(0);
  const [initialExtras, setInitialExtras] = useState<ProductExtras | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inventoryTracked, setInventoryTracked] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [formError, setFormError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const loadedId = useRef<number | null>(null);
  const detail = trpc.pediu.products.detail.useQuery(
    { productId: editingId ?? 0 },
    { enabled: Boolean(editingId) },
  );

  const unitOptions = useMemo(() => SALE_UNITS, []);
  const categorySuggestions = isMarket ? MARKET_CATEGORY_SUGGESTIONS : MERCHANT_CATEGORY_SUGGESTIONS;
  const defaultCategory = categorySuggestions[0];

  useEffect(() => {
    if (store.data?.id && !category.trim() && !editingId) setCategory(defaultCategory);
  }, [category, defaultCategory, editingId, store.data?.id]);

  useEffect(() => {
    if (!editingId || !detail.data || detail.data.id !== editingId) return;
    if (loadedId.current === editingId) return;
    loadedId.current = editingId;
    const group = detail.data.options[0];
    setName(detail.data.name);
    setCategory(detail.data.category);
    setDescription(detail.data.description ?? "");
    setPrice(String(detail.data.price).replace(".", ","));
    setSaleUnit(detail.data.saleUnit);
    setPackSize(detail.data.packSize ? String(detail.data.packSize) : "");
    setInventoryTracked(detail.data.inventoryTracked === 1);
    setStockQuantity(detail.data.stockQuantity);
    setInitialExtras({
      imageData: detail.data.imageData ?? undefined,
      optionGroups: group
        ? [{
            name: group.name,
            required: group.required === 1,
            choices: group.choices.map((choice) => ({
              name: choice.name,
              priceDelta: String(choice.priceDelta),
            })),
          }]
        : undefined,
    });
    setSeed((value) => value + 1);
    setSavedNotice("");
    setFormError("");
  }, [detail.data, editingId]);

  const resetForm = () => {
    setName("");
    setCategory(defaultCategory);
    setDescription("");
    setPrice("");
    setSaleUnit(suggestedSaleUnitForCategory(isMarket ? "Hortifruti" : "Geral", store.data?.kind));
    setPackSize("");
    setExtras({});
    setInitialExtras(null);
    setEditingId(null);
    setInventoryTracked(false);
    setStockQuantity(0);
    loadedId.current = null;
    setSeed((value) => value + 1);
    setFormError("");
    setSavedNotice("Produto salvo.");
    void products.refetch();
  };
  const create = trpc.pediu.products.create.useMutation({ onSuccess: resetForm });
  const update = trpc.pediu.products.update.useMutation({ onSuccess: resetForm });
  const availability = trpc.pediu.products.availability.useMutation({ onSuccess: () => void products.refetch() });

  const publish = async () => {
    if (!store.data) return;
    const available = (products.data ?? []).filter((product) => product.available);
    const lines = available.length
      ? available.map((product) => `• ${product.name} — ${formatCatalogPrice(product.price, product.saleUnit, product.packSize)}`).join("\n")
      : "Catálogo em atualização.";
    await Share.share({ title: `Catálogo ${store.data.name}`, message: `${store.data.name}\n\nPeça pelo Pediu:\n${lines}` });
  };

  const dirty = Boolean(
    name.trim() || description.trim() || price.trim() || extras.imageData || extras.optionGroups?.length,
  );
  const leave = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert("Sair sem salvar?", "O que você preencheu neste produto será perdido.", [
      { text: "Continuar editando", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => router.back() },
    ]);
  };
  const saveProduct = () => {
    const normalized = price.replace(",", ".").trim();
    const pack = packSize.replace(",", ".").trim();
    if (name.trim().length < 2) {
      setFormError("Diga o nome do produto.");
      return;
    }
    if (category.trim().length < 2) {
      setFormError("Escolha uma categoria.");
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      setFormError("Informe o preço, como 25,00.");
      return;
    }
    if (!store.data?.id) return;
    setFormError("");
    const payload = {
      name: name.trim(),
      category: category.trim(),
      description: description.trim() || undefined,
      price: normalized,
      saleUnit: isMarket ? saleUnit : "unit" as const,
      packSize: pack && /^\d+(\.\d{1,3})?$/.test(pack) ? pack : null,
      imageData: extras.imageData ?? (editingId ? initialExtras?.imageData ?? null : undefined),
      optionGroups: extras.optionGroups ?? [],
      inventoryTracked,
      stockQuantity,
    };
    if (editingId) update.mutate({ productId: editingId, ...payload });
    else create.mutate({ storeId: store.data.id, ...payload, imageData: extras.imageData });
  };

  return (
    <Page
      title="Catálogo"
      eyebrow="VITRINE"
      onBack={leave}
      dock={<SellerDock active="catalog" />}
      action={<MaterialIcons name="inventory-2" size={22} color="#E20D2A" />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>{isMarket ? "MERCADO · UNIDADES" : "VITRINE DA LOJA"}</Text>
        <Text style={styles.heroTitle}>{store.data?.name ?? "Catálogo"}</Text>
        <Text style={styles.heroBody}>
          {isMarket
            ? "Publique itens com unidade (kg, cx, un). O preço unitário aparece igual para o cliente."
            : "Publique produtos e controle disponibilidade. Divulgue o catálogo ativo em um toque."}
        </Text>
      </View>
      <Card>
        <Text style={s.sectionTitle}>{editingId ? "Editar produto" : "Novo produto"}</Text>
        <Field label="NOME DO PRODUTO" value={name} onChangeText={setName} placeholder={isMarket ? catalogPlaceholder.marketName : catalogPlaceholder.productName} />
        <Field
          label="CATEGORIA"
          value={category}
          onChangeText={(value) => {
            setCategory(value);
            if (isMarket) setSaleUnit(suggestedSaleUnitForCategory(value, "market"));
          }}
          placeholder={catalogPlaceholder.category}
        />
        <View style={{ gap: 8 }}>
          <Text style={s.label}>CATEGORIAS LOCAIS</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {categorySuggestions.map((suggestion) => {
              const selected = category.trim().toLowerCase() === suggestion.toLowerCase();
              return (
                <Pressable
                  key={suggestion}
                  onPress={() => {
                    setCategory(suggestion);
                    if (isMarket) setSaleUnit(suggestedSaleUnitForCategory(suggestion, "market"));
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? PEDIU_TOKENS.primary : PEDIU_TOKENS.line,
                    backgroundColor: selected ? PEDIU_TOKENS.primary : PEDIU_TOKENS.surface,
                    borderRadius: 999,
                    paddingHorizontal: 11,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: selected ? PEDIU_TOKENS.white : PEDIU_TOKENS.muted, fontSize: 11, fontWeight: "800" }}>
                    {suggestion}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.muted}>Você também pode digitar uma categoria própria.</Text>
        </View>
        <Field label="DESCRIÇÃO" value={description} onChangeText={setDescription} placeholder={catalogPlaceholder.description} multiline />
        <Field label="PREÇO (R$)" value={price} onChangeText={setPrice} placeholder={catalogPlaceholder.price} keyboardType="decimal-pad" />
        <ProductExtrasFields key={seed} seed={seed} initial={initialExtras} onChange={setExtras} />
        {isMarket ? (
          <>
            <Text style={s.label}>UNIDADE DE VENDA</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {unitOptions.map((unit) => {
                const on = saleUnit === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() => setSaleUnit(unit)}
                    style={{
                      height: 34,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: on ? "#E20D2A" : "#F0E4D8",
                      backgroundColor: on ? "#E20D2A" : "#FFFDF9",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: on ? "#fff" : "#6E635A", fontWeight: "700", fontSize: 12 }}>
                      {SALE_UNIT_LABELS[unit]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Field
              label="TAMANHO DO PACOTE (OPCIONAL)"
              value={packSize}
              onChangeText={setPackSize}
              placeholder={saleUnit === "pack" ? "Ex.: 12 unidades" : saleUnit === "kg" ? "Ex.: 0,5 kg" : "Ex.: 1 unidade"}
              keyboardType="decimal-pad"
            />
          </>
        ) : null}
        <PrimaryButton
          title={create.isPending || update.isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar produto"}
          disabled={create.isPending || update.isPending || !store.data?.id}
          onPress={saveProduct}
        />
        {formError ? <Text style={{ color: "#E20D2A", fontSize: 12 }}>{formError}</Text> : null}
        {savedNotice ? <Text style={{ color: "#0B8A5C", fontSize: 12, fontWeight: "800" }}>{savedNotice}</Text> : null}
        {create.error ? <Text style={{ color: "#E20D2A", fontSize: 12 }}>{create.error.message}</Text> : null}
        {update.error ? <Text style={{ color: "#E20D2A", fontSize: 12 }}>{update.error.message}</Text> : null}
      </Card>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.sectionTitle}>Produtos publicados</Text>
          <Text style={s.muted}>{products.data?.length ?? 0} {(products.data?.length ?? 0) === 1 ? "item" : "itens"}</Text>
        </View>
        {products.isLoading ? <Text style={s.muted}>Carregando catálogo...</Text> : null}
        {products.isError ? <Text style={{ color: "#E20D2A", fontSize: 12 }}>{products.error.message}</Text> : null}
        {!products.isLoading && !products.data?.length ? (
          <EmptyState
            icon="inventory-2"
            title="Sua vitrine ainda está vazia"
            body={isMarket ? "Cadastre o primeiro item e informe se a venda é por unidade, quilo ou pacote." : "Cadastre o primeiro produto para começar a receber pedidos."}
          />
        ) : null}
        {products.data?.map((product) => (
          <Row
            key={product.id}
            icon="inventory-2"
            title={product.name}
            subtitle={`${product.category} · ${formatCatalogPrice(product.price, product.saleUnit, product.packSize)}${product.description ? ` · ${product.description}` : ""} · toque para editar`}
            onPress={() => {
              loadedId.current = null;
              setEditingId(product.id);
            }}
            right={
              <Pressable onPress={() => availability.mutate({ productId: product.id, available: !product.available })} style={{ padding: 4 }}>
                <Text style={{ color: product.available ? "#0B8A5C" : "#7C8A8F", fontWeight: "900", fontSize: 11 }}>
                  {product.available ? "ATIVO" : "PAUSADO"}
                </Text>
              </Pressable>
            }
          />
        ))}
      </Card>
      <Card>
        <Row icon="campaign" title="Divulgar catálogo" subtitle="Compartilhe os produtos ativos da sua loja" onPress={() => void publish()} />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: PEDIU_TOKENS.ink,
    borderRadius: 24,
    padding: 18,
    gap: 6,
  },
  heroEyebrow: {
    color: PEDIU_TOKENS.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: PEDIU_TOKENS.white,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroBody: {
    color: "rgba(255,244,232,0.72)",
    fontSize: 12,
    lineHeight: 18,
  },
});
