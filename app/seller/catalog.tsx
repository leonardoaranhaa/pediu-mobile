import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Card, Field, Page, PrimaryButton, Row, s } from "@/components/pediu-page";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { formatCatalogPrice, SALE_UNITS, SALE_UNIT_LABELS, suggestedSaleUnitForCategory, type SaleUnit } from "@/shared/market-units";

export default function SellerCatalogPage() {
  const { user } = useAuth();
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: user?.role === "merchant" });
  const products = trpc.pediu.products.mine.useQuery({ storeId: store.data?.id ?? 0 }, { enabled: Boolean(store.data?.id), refetchInterval: 15_000 });
  const isMarket = store.data?.kind === "market";
  const [name, setName] = useState("");
  const [category, setCategory] = useState(isMarket ? "Hortifruti" : "Geral");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saleUnit, setSaleUnit] = useState<SaleUnit>("unit");
  const [packSize, setPackSize] = useState("");

  const unitOptions = useMemo(() => SALE_UNITS, []);

  const create = trpc.pediu.products.create.useMutation({
    onSuccess: () => {
      setName("");
      setCategory(isMarket ? "Hortifruti" : "Geral");
      setDescription("");
      setPrice("");
      setSaleUnit(suggestedSaleUnitForCategory(isMarket ? "Hortifruti" : "Geral", store.data?.kind));
      setPackSize("");
      void products.refetch();
    },
  });
  const availability = trpc.pediu.products.availability.useMutation({ onSuccess: () => void products.refetch() });

  const publish = async () => {
    if (!store.data) return;
    const available = (products.data ?? []).filter((product) => product.available);
    const lines = available.length
      ? available.map((product) => `• ${product.name} — ${formatCatalogPrice(product.price, product.saleUnit, product.packSize)}`).join("\n")
      : "Catálogo em atualização.";
    await Share.share({ title: `Catálogo ${store.data.name}`, message: `${store.data.name}\n\nPeça pelo Pediu:\n${lines}` });
  };

  return (
    <Page title="Catálogo" eyebrow="VITRINE" action={<MaterialIcons name="inventory-2" size={22} color="#E20D2A" />}>
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
        <Text style={s.sectionTitle}>Novo produto</Text>
        <Field label="NOME" value={name} onChangeText={setName} placeholder={isMarket ? "Ex.: Banana prata" : "Ex.: Combo X-Bacon"} />
        <Field
          label="CATEGORIA"
          value={category}
          onChangeText={(value) => {
            setCategory(value);
            if (isMarket) setSaleUnit(suggestedSaleUnitForCategory(value, "market"));
          }}
          placeholder={isMarket ? "Ex.: Hortifruti" : "Ex.: Lanches"}
        />
        <Field label="DESCRIÇÃO" value={description} onChangeText={setDescription} placeholder="Detalhes para o cliente" multiline />
        <Field label="PREÇO" value={price} onChangeText={setPrice} placeholder="35.00" keyboardType="decimal-pad" />
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
              label="TAMANHO DO PACOTE (opcional)"
              value={packSize}
              onChangeText={setPackSize}
              placeholder={saleUnit === "pack" ? "Ex.: 12" : saleUnit === "kg" ? "Ex.: 0.5" : "Ex.: 1"}
              keyboardType="decimal-pad"
            />
          </>
        ) : null}
        <PrimaryButton
          title={create.isPending ? "Salvando..." : "Adicionar produto"}
          disabled={create.isPending || !store.data?.id}
          onPress={() => {
            const normalized = price.replace(",", ".").trim();
            const pack = packSize.replace(",", ".").trim();
            if (store.data?.id && name.trim().length >= 2 && category.trim().length >= 2 && /^\d+(\.\d{1,2})?$/.test(normalized)) {
              create.mutate({
                storeId: store.data.id,
                name: name.trim(),
                category: category.trim(),
                description: description.trim() || undefined,
                price: normalized,
                saleUnit: isMarket ? saleUnit : "unit",
                packSize: pack && /^\d+(\.\d{1,3})?$/.test(pack) ? pack : null,
              });
            }
          }}
        />
        {create.error ? <Text style={{ color: "#E20D2A", fontSize: 12 }}>{create.error.message}</Text> : null}
      </Card>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.sectionTitle}>Produtos publicados</Text>
          <Text style={s.muted}>{products.data?.length ?? 0}</Text>
        </View>
        {products.isLoading ? <Text style={s.muted}>Carregando catálogo...</Text> : null}
        {products.isError ? <Text style={{ color: "#E20D2A", fontSize: 12 }}>{products.error.message}</Text> : null}
        {!products.isLoading && !products.data?.length ? (
          <EmptyState
            icon="inventory-2"
            title="Catálogo vazio"
            body={isMarket ? "Adicione o primeiro item com unidade de venda." : "Adicione o primeiro produto da sua vitrine."}
          />
        ) : null}
        {products.data?.map((product) => (
          <Row
            key={product.id}
            icon="inventory-2"
            title={product.name}
            subtitle={`${product.category} · ${formatCatalogPrice(product.price, product.saleUnit, product.packSize)}${product.description ? ` · ${product.description}` : ""}`}
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
