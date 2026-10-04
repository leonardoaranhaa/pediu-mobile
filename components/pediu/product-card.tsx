import { MaterialIcons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { assetForCategory, PEDIU_TOKENS } from "@/lib/pediu-tokens";

export type ProductCardItem = {
  id: number;
  name: string;
  store: string;
  price: string;
  distance: string;
  category: string;
  description?: string | null;
  emoji?: string;
  available: boolean;
  flash?: boolean;
};

type Props = {
  product: ProductCardItem;
  onPress: () => void;
  featured?: boolean;
};

export function ProductCard({ product, onPress, featured = false }: Props) {
  const photo = assetForCategory(product.category, product.id);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, featured && styles.featured, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.imageWrap, featured && styles.imageFeatured]}>
        <Image source={photo} style={styles.image} resizeMode="cover" />
        <View style={styles.imageScrim} />
        {product.flash ? (
          <View style={styles.flashBadge}>
            <MaterialIcons name="bolt" size={14} color={PEDIU_TOKENS.accentFg} />
            <Text style={styles.flashText}>Flash</Text>
          </View>
        ) : (
          <View style={styles.availablePill}>
            <View style={styles.dot} />
            <Text style={styles.availableText}>DISPONÍVEL</Text>
          </View>
        )}
        <View style={styles.imageCopy}>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{product.store} · {product.distance}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.desc} numberOfLines={1}>{product.description || product.category}</Text>
        <Text style={styles.price}>{product.price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PEDIU_TOKENS.surface,
    borderRadius: PEDIU_TOKENS.radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
    shadowColor: "#1A120C",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  featured: { borderRadius: 28 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  imageWrap: { height: 148, position: "relative" },
  imageFeatured: { height: 168 },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    // gradient approximation via stacked overlays
  },
  flashBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PEDIU_TOKENS.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  flashText: { color: PEDIU_TOKENS.accentFg, fontSize: 11, fontWeight: "800" },
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PEDIU_TOKENS.success },
  availableText: { color: PEDIU_TOKENS.success, fontSize: 9, fontWeight: "800" },
  imageCopy: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(17,17,17,0.45)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  name: { color: PEDIU_TOKENS.white, fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  meta: { color: "rgba(255,244,232,0.85)", fontSize: 11, marginTop: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  desc: { flex: 1, color: PEDIU_TOKENS.muted, fontSize: 12 },
  price: { color: PEDIU_TOKENS.ink, fontSize: 15, fontWeight: "900" },
});
