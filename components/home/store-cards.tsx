import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { PediuPressable } from "@/components/pediu-motion";
import {
  filterHomeStores,
  type HomeStoreCard,
  type HomeStoreFilter,
} from "@/lib/home-stores";
import { cardElevation, PEDIU_TOKENS } from "@/lib/pediu-tokens";

export { groupHomeStores, type HomeStoreCard } from "@/lib/home-stores";

const FILTERS: { id: HomeStoreFilter; label: string }[] = [
  { id: "abertas", label: "Abertas agora" },
  { id: "gratis", label: "Entrega grátis" },
  { id: "rapidas", label: "Mais rápidas" },
];

function feeLabel(fee?: string | null) {
  const amount = Number(fee ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Grátis";
  return `R$ ${amount.toFixed(2).replace(".", ",")}`;
}

function Cover({ store }: { store: HomeStoreCard }) {
  if (store.imageUrl) {
    return <Image source={{ uri: store.imageUrl }} style={{ width: 92, height: 92 }} />;
  }
  return (
    <View
      style={{
        width: 92,
        height: 92,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: store.open ? "#E20D2A" : "#8C8178",
      }}
    >
      <Text style={{ color: "#FFF7F5", fontSize: 34, fontWeight: "800" }}>
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
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: PEDIU_TOKENS.inkDeep }}>
        Lojas perto de você
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <PediuPressable
              key={item.id}
              onPress={() => setFilter(selected ? null : item.id)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: selected ? PEDIU_TOKENS.inkDeep : PEDIU_TOKENS.white,
                borderWidth: 1,
                borderColor: selected ? PEDIU_TOKENS.inkDeep : PEDIU_TOKENS.line,
              }}
            >
              <Text style={{ color: selected ? "#fff" : PEDIU_TOKENS.text, fontWeight: "700", fontSize: 13 }}>
                {item.label}
              </Text>
            </PediuPressable>
          );
        })}
      </View>
      {!visible.length ? (
        <Text style={{ color: PEDIU_TOKENS.muted, fontSize: 14 }}>
          Nenhuma loja com esse filtro agora.
        </Text>
      ) : null}
      {visible.map((store) => (
        <PediuPressable
          key={store.key}
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${store.name}`}
          onPress={() => onOpen(store)}
          style={[
            {
              flexDirection: "row",
              backgroundColor: PEDIU_TOKENS.white,
              borderRadius: 20,
              overflow: "hidden",
              opacity: store.open ? 1 : 0.55,
            },
            cardElevation("raised"),
          ]}
        >
          <Cover store={store} />
          <View style={{ flex: 1, padding: 12, gap: 4 }}>
            <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "800", color: PEDIU_TOKENS.inkDeep }}>
              {store.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons name="schedule" size={14} color={PEDIU_TOKENS.muted} />
              <Text style={{ color: PEDIU_TOKENS.muted, fontSize: 13 }}>
                {store.fast ? "Mais rápida" : "Perto de você"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons name="two-wheeler" size={14} color={PEDIU_TOKENS.muted} />
              <Text style={{ color: PEDIU_TOKENS.muted, fontSize: 13 }}>{feeLabel(store.fee)}</Text>
            </View>
            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 4,
                backgroundColor: store.open ? "#E5F6EE" : "#E7E1DA",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 12, color: store.open ? PEDIU_TOKENS.success : PEDIU_TOKENS.muted }}>
                {store.open ? "Aberta" : "Fechada agora"}
              </Text>
            </View>
            {!store.open && store.nextOpenLabel ? (
              <Text style={{ color: PEDIU_TOKENS.muted, fontSize: 12 }}>{store.nextOpenLabel}</Text>
            ) : null}
          </View>
        </PediuPressable>
      ))}
    </View>
  );
}
