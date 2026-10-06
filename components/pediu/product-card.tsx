import { MaterialIcons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  PediuPressable,
  PediuPulse,
  PediuReveal,
} from "@/components/pediu-motion";
import { assetForCategory, PEDIU_TOKENS } from "@/lib/pediu-tokens";

export type ProductCardItem = {
  id: number;
  name: string;
  store: string;
  price: string;
  distance: string;
  category: string;
  description?: string | null;
  imageUrl?: string | null;
  emoji?: string;
  available: boolean;
  flash?: boolean;
};

type Props = {
  product: ProductCardItem;
  onPress: () => void;
  featured?: boolean;
  delay?: number;
};

export function ProductCard({
  product,
  onPress,
  featured = false,
  delay = 0,
}: Props) {
  const fallbackPhoto = assetForCategory(product.category, product.id);
  return (
    <PediuReveal delay={delay}>
      <PediuPressable onPress={onPress} style={styles.pressable}>
        <View style={[styles.card, featured && styles.featured]}>
          <View style={[styles.imageWrap, featured && styles.imageFeatured]}>
            <Image
              source={
                product.imageUrl ? { uri: product.imageUrl } : fallbackPhoto
              }
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.imageScrim} pointerEvents="none" />
            {product.flash ? (
              <PediuPulse style={styles.flashPulse}>
                <View style={styles.flashBadge}>
                  <MaterialIcons
                    name="bolt"
                    size={14}
                    color={PEDIU_TOKENS.accentFg}
                  />
                  <Text style={styles.flashText}>Flash</Text>
                </View>
              </PediuPulse>
            ) : (
              <View style={styles.availablePill}>
                <View style={styles.dot} />
                <Text style={styles.availableText}>
                  {product.available ? "DISPONÍVEL" : "INDISPONÍVEL"}
                </Text>
              </View>
            )}
            <View style={styles.imageCopy}>
              <Text style={styles.name} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {product.store} · {product.distance}
              </Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.desc} numberOfLines={1}>
              {product.description || product.category}
            </Text>
            <Text style={styles.price}>{product.price}</Text>
          </View>
        </View>
      </PediuPressable>
    </PediuReveal>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: PEDIU_TOKENS.radius.xxl, overflow: "hidden" },
  card: {
    backgroundColor: PEDIU_TOKENS.surface,
    borderRadius: PEDIU_TOKENS.radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    shadowColor: PEDIU_TOKENS.inkDeep,
    shadowOpacity: PEDIU_TOKENS.shadow.card.shadowOpacity,
    shadowRadius: PEDIU_TOKENS.shadow.card.shadowRadius,
    shadowOffset: { width: 0, height: PEDIU_TOKENS.shadow.card.y },
    elevation: 3,
  },
  featured: { borderRadius: PEDIU_TOKENS.radius.xxl },
  imageWrap: { height: 148, position: "relative" },
  imageFeatured: { height: 176 },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,17,17,0.13)",
    borderBottomWidth: 0,
  },
  flashPulse: { position: "absolute", top: 10, left: 10 },
  flashBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PEDIU_TOKENS.accent,
    borderRadius: PEDIU_TOKENS.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  flashText: {
    color: PEDIU_TOKENS.accentFg,
    fontSize: 11,
    fontWeight: "800",
  },
  availablePill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,253,249,0.95)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PEDIU_TOKENS.success,
  },
  availableText: {
    color: PEDIU_TOKENS.success,
    fontSize: 9,
    fontWeight: "800",
  },
  imageCopy: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(17,17,17,0.66)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  name: {
    color: PEDIU_TOKENS.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  meta: { color: "rgba(255,244,232,0.85)", fontSize: 11, marginTop: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  desc: { flex: 1, color: PEDIU_TOKENS.muted, fontSize: 12 },
  price: { color: PEDIU_TOKENS.inkDeep, fontSize: 15, fontWeight: "900" },
});
