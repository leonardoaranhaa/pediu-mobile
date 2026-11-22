import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { PediuPressable } from "@/components/pediu-motion";
import {
  filterHomeStores,
  prepEstimateLabel,
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
  const logo = store.logoData;
  return (
    <View style={{ height: 90, overflow: "hidden", backgroundColor: "#FDE8EA" }}>
      {logo ? (
        <Image source={{ uri: logo }} style={{ width: "100%", height: 90 }} />
      ) : (
        <>
          <View style={{ position: "absolute", right: -24, top: -36, width: 120, height: 120, borderRadius: 60, backgroundColor: "#E20D2A", opacity: 0.22 }} />
          <View style={{ position: "absolute", left: -28, bottom: -46, width: 110, height: 110, borderRadius: 55, backgroundColor: "#FF8A3D", opacity: 0.28 }} />
        </>
      )}
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
        Lojas
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
              backgroundColor: PEDIU_TOKENS.white,
              borderRadius: 20,
              overflow: "hidden",
              opacity: store.open ? 1 : 0.55,
            },
            cardElevation("raised"),
          ]}
        >
          <Cover store={store} />
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>
            <View
              style={{
                marginTop: -18,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                borderWidth: 2,
                borderColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: PEDIU_TOKENS.primary, fontFamily: PEDIU_TOKENS.fontDisplay, fontWeight: "700" }}>
                {store.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "800", color: PEDIU_TOKENS.inkDeep, fontFamily: PEDIU_TOKENS.fontDisplay }}>
              {store.name}
            </Text>
            {prepEstimateLabel(store.prepMinutes) ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons name="schedule" size={14} color="#5F6368" />
                <Text style={{ color: "#5F6368", fontSize: 14, fontWeight: "400", fontFamily: PEDIU_TOKENS.fontDisplay }}>
                  {prepEstimateLabel(store.prepMinutes)}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons name="two-wheeler" size={14} color="#5F6368" />
              <Text style={{ color: "#5F6368", fontSize: 14, fontWeight: "400", fontFamily: PEDIU_TOKENS.fontDisplay }}>{feeLabel(store.fee)}</Text>
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
