import { useState } from "react";
import { Image, Text, View } from "react-native";
import { PediuPressable } from "@/components/pediu-motion";
import {
  filterHomeStores,
  prepEstimateLabel,
  type HomeStoreCard,
  type HomeStoreFilter,
} from "@/lib/home-stores";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

export { groupHomeStores, type HomeStoreCard } from "@/lib/home-stores";

const FILTERS: { id: HomeStoreFilter; label: string }[] = [
  { id: "abertas", label: "Abertas agora" },
  { id: "gratis", label: "Entrega grátis" },
  { id: "rapidas", label: "Mais rápidas" },
];

export function feeLabel(fee?: string | null) {
  const amount = Number(fee ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Entrega grátis";
  return `Entrega R$ ${amount.toFixed(2).replace(".", ",")}`;
}

function StoreLogo({ store }: { store: HomeStoreCard }) {
  if (store.logoData) {
    return <Image source={{ uri: store.logoData }} style={{ width: 56, height: 56, borderRadius: 14 }} />;
  }
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: store.open ? PEDIU_TOKENS.primary : "#B7ADA4",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: PEDIU_TOKENS.white, fontFamily: PEDIU_TOKENS.fontDisplay, fontWeight: "600", fontSize: 24 }}>
        {store.name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function HomeStoreCards({
  stores,
  onOpen,
}: {
  stores: HomeStoreCard[];
  motionEnabled?: boolean;
  onOpen: (store: HomeStoreCard) => void;
}) {
  const [filter, setFilter] = useState<HomeStoreFilter | null>(null);
  const visible = filterHomeStores(stores, filter);
  const openCount = stores.filter((store) => store.open).length;
  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: PEDIU_TOKENS.fontDisplay, fontWeight: "600", fontSize: 22, color: PEDIU_TOKENS.text }}>
          Lojas
        </Text>
        <Text style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "600", fontSize: 14, color: PEDIU_TOKENS.muted }}>
          {openCount === 1 ? "1 aberta agora" : `${openCount} abertas agora`}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <PediuPressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(selected ? null : item.id)}
              style={{
                minHeight: 36,
                justifyContent: "center",
                borderRadius: PEDIU_TOKENS.radius.pill,
                paddingHorizontal: 12,
                backgroundColor: selected ? PEDIU_TOKENS.text : PEDIU_TOKENS.white,
                borderWidth: 1,
                borderColor: selected ? PEDIU_TOKENS.text : PEDIU_TOKENS.line,
              }}
            >
              <Text style={{ color: selected ? PEDIU_TOKENS.white : PEDIU_TOKENS.text, fontWeight: "700", fontSize: 13, fontFamily: PEDIU_TOKENS.fontBody }}>
                {item.label}
              </Text>
            </PediuPressable>
          );
        })}
      </View>
      {!visible.length ? (
        <Text style={{ color: PEDIU_TOKENS.muted, fontSize: 14, fontFamily: PEDIU_TOKENS.fontBody }}>
          Nenhuma loja com esse filtro agora.
        </Text>
      ) : null}
      <View>
        {visible.map((store, index) => {
          const details = [prepEstimateLabel(store.prepMinutes), feeLabel(store.fee)].filter(Boolean).join(" · ");
          return (
            <PediuPressable
              key={store.key}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${store.name}. ${store.open ? "Aberta" : "Fechada agora"}. ${details}`}
              onPress={() => onOpen(store)}
              style={{
                minHeight: 80,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: PEDIU_TOKENS.line,
              }}
            >
              <StoreLogo store={store} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontWeight: "800", fontSize: 16, color: store.open ? PEDIU_TOKENS.text : PEDIU_TOKENS.muted }}>
                  {store.name}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontSize: 13, color: PEDIU_TOKENS.muted }}>
                  {details}
                </Text>
                {!store.open && store.nextOpenLabel ? (
                  <Text numberOfLines={1} style={{ fontFamily: PEDIU_TOKENS.fontBody, fontSize: 12, color: PEDIU_TOKENS.muted }}>
                    {store.nextOpenLabel}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  backgroundColor: store.open ? "#E3F4EC" : "#EFE9E3",
                  borderRadius: PEDIU_TOKENS.radius.pill,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontWeight: "800", fontSize: 12, fontFamily: PEDIU_TOKENS.fontBody, color: store.open ? "#0B7A51" : PEDIU_TOKENS.muted }}>
                  {store.open ? "Aberta" : "Fechada"}
                </Text>
              </View>
            </PediuPressable>
          );
        })}
      </View>
    </View>
  );
}
