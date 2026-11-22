import { MaterialIcons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";
import { PediuPressable, PediuReveal } from "@/components/pediu-motion";
import { cardElevation, PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { type HomeStoreCard } from "@/lib/home-stores";

export { groupHomeStores, type HomeStoreCard } from "@/lib/home-stores";

function feeLabel(fee?: string | null) {
  const amount = Number(fee ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Entrega grátis";
  return `Entrega R$ ${amount.toFixed(2).replace(".", ",")}`;
}

export function HomeStoreCards({
  stores,
  motionEnabled,
  onOpen,
}: {
  stores: HomeStoreCard[];
  motionEnabled: boolean;
  onOpen: (store: HomeStoreCard) => void;
}) {
  if (!stores.length) return null;
  return (
    <View style={{ gap: PEDIU_TOKENS.space.md }}>
      <Text
        style={{
          fontFamily: "Fredoka",
          fontSize: PEDIU_TOKENS.type.section,
          fontWeight: "800",
          color: PEDIU_TOKENS.inkDeep,
        }}
      >
        Lojas perto de você
      </Text>
      {stores.map((store, index) => (
        <PediuReveal key={store.key} delay={index * PEDIU_TOKENS.motion.stagger} enabled={motionEnabled}>
          <PediuPressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${store.name}`}
            onPress={() => onOpen(store)}
            style={[
              {
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
                backgroundColor: PEDIU_TOKENS.surfaceElevated,
                borderRadius: PEDIU_TOKENS.radius.xl,
                padding: 12,
                opacity: store.open ? 1 : 0.62,
              },
              cardElevation("rest"),
            ]}
          >
            {store.imageUrl ? (
              <Image source={{ uri: store.imageUrl }} style={{ width: 72, height: 72, borderRadius: 18 }} />
            ) : (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  backgroundColor: PEDIU_TOKENS.canvasDeep,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: "900", color: PEDIU_TOKENS.ink }}>
                  {store.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={1} style={{ fontFamily: "Fredoka", fontSize: 18, fontWeight: "800", color: PEDIU_TOKENS.inkDeep }}>
                {store.name}
              </Text>
              <Text style={{ color: PEDIU_TOKENS.muted, fontFamily: "Nunito", fontSize: 13 }}>
                {[feeLabel(store.fee), store.distance].filter(Boolean).join(" · ")}
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
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
            <MaterialIcons name="chevron-right" size={22} color={PEDIU_TOKENS.subtle} />
          </PediuPressable>
        </PediuReveal>
      ))}
    </View>
  );
}
