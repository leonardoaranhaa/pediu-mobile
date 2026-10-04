import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AppTheme } from "@/lib/app-preferences";

type DiscoveryProduct = {
  id: number;
  name: string;
  store: string;
  price: string;
  distance: string;
  category: string;
  available: boolean;
  imageUrl?: string | null;
  adHeadline?: string | null;
  adDescription?: string | null;
  adOfferLabel?: string | null;
  emoji: string;
};

type DiscoveryNotification = {
  id: number;
  title: string;
  body: string;
  readAt: Date | string | null;
  actionPath?: string | null;
};

const STORY_GRADIENTS = ["#E20D2A", "#FFC400", "#111111", "#0B8A5C"];

export function PediuV2Discovery({
  theme,
  products,
  notifications,
  onProductPress,
  onReadNotification,
  onSearch,
  onAssistant,
  onOrders,
  onBenefits,
}: {
  theme: AppTheme;
  products: DiscoveryProduct[];
  notifications: DiscoveryNotification[];
  onProductPress: (product: DiscoveryProduct) => void;
  onReadNotification: (notificationId: number) => void;
  onSearch: () => void;
  onAssistant: () => void;
  onOrders: () => void;
  onBenefits: () => void;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const stories = useMemo(() => products.slice(0, 6), [products]);
  const flashProducts = useMemo(
    () =>
      products.filter((product) => Boolean(product.adOfferLabel)).slice(0, 4),
    [products],
  );

  return (
    <View style={styles.root}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.kicker, { color: theme.primary }]}>
            PARA VOCÊ
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>
            Escolha o seu próximo pedido
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Abrir avisos"
          onPress={() => setNotificationsOpen(true)}
          style={({ pressed }) => [
            styles.notificationButton,
            { backgroundColor: theme.card, borderColor: theme.line },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            name="notifications-none"
            size={21}
            color={theme.ink}
          />
          {notifications.some((notification) => !notification.readAt) ? (
            <View
              style={[
                styles.notificationDot,
                { backgroundColor: theme.primary },
              ]}
            />
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storyRail}
      >
        {stories.length ? (
          stories.map((product, index) => (
            <Pressable
              key={product.id}
              onPress={() => onProductPress(product)}
              style={({ pressed }) => [
                styles.storyItem,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.storyRing,
                  {
                    backgroundColor:
                      STORY_GRADIENTS[index % STORY_GRADIENTS.length],
                  },
                ]}
              >
                <View
                  style={[styles.storyImage, { backgroundColor: theme.canvas }]}
                >
                  {product.imageUrl ? (
                    <Image
                      source={{ uri: product.imageUrl }}
                      style={styles.storyImageAsset}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.storyEmoji}>{product.emoji}</Text>
                  )}
                </View>
              </View>
              <Text
                numberOfLines={1}
                style={[styles.storyLabel, { color: theme.text }]}
              >
                {product.store}
              </Text>
            </Pressable>
          ))
        ) : (
          <View
            style={[
              styles.emptyStory,
              { backgroundColor: theme.card, borderColor: theme.line },
            ]}
          >
            <MaterialIcons
              name="auto-awesome"
              size={18}
              color={theme.primary}
            />
            <Text style={[styles.emptyStoryText, { color: theme.muted }]}>
              As novidades da sua região aparecem aqui.
            </Text>
          </View>
        )}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.promoRail}
      >
        <PromoCard
          theme={theme}
          tone="primary"
          icon="auto-awesome"
          title="Sabor do momento"
          subtitle="Fale ou digite e encontre uma boa ideia."
          action={onAssistant}
        />
        <PromoCard
          theme={theme}
          tone="ink"
          icon="local-offer"
          title="Pediu Vantagens"
          subtitle="Cupons reais e condições dos lojistas."
          action={onBenefits}
        />
        <PromoCard
          theme={theme}
          tone="accent"
          icon="receipt-long"
          title="Acompanhe de perto"
          subtitle="Veja seus pedidos e o status atualizado."
          action={onOrders}
        />
      </ScrollView>

      <FlashRadar
        theme={theme}
        count={flashProducts.length}
        onPress={
          flashProducts.length
            ? onProductPress.bind(null, flashProducts[0])
            : onSearch
        }
      />

      <Pressable
        onPress={onSearch}
        style={({ pressed }) => [
          styles.searchAction,
          { backgroundColor: theme.ink, borderColor: theme.ink },
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons name="search" size={19} color={theme.highlight} />
        <Text style={[styles.searchActionText, { color: theme.highlight }]}>
          Ver todos os sabores e serviços
        </Text>
        <MaterialIcons name="arrow-forward" size={18} color={theme.highlight} />
      </Pressable>

      <NotificationSheet
        open={notificationsOpen}
        notifications={notifications}
        theme={theme}
        onClose={() => setNotificationsOpen(false)}
        onRead={onReadNotification}
      />
    </View>
  );
}

function PromoCard({
  theme,
  tone,
  icon,
  title,
  subtitle,
  action,
}: {
  theme: AppTheme;
  tone: "primary" | "ink" | "accent";
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  subtitle: string;
  action: () => void;
}) {
  const backgroundColor =
    tone === "primary"
      ? theme.primary
      : tone === "ink"
        ? theme.ink
        : theme.highlight;
  const foreground = tone === "accent" ? theme.highlightText : "#FFF7F5";
  return (
    <Pressable
      onPress={action}
      style={({ pressed }) => [
        styles.promoCard,
        { backgroundColor, shadowColor: backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.promoIcon,
          {
            backgroundColor:
              tone === "accent"
                ? "rgba(17,17,17,0.12)"
                : "rgba(255,255,255,0.16)",
          },
        ]}
      >
        <MaterialIcons name={icon} size={18} color={foreground} />
      </View>
      <Text style={[styles.promoKicker, { color: foreground, opacity: 0.76 }]}>
        PEDIU AGORA
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.promoTitle, { color: foreground }]}
      >
        {title}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.promoSubtitle, { color: foreground, opacity: 0.76 }]}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function FlashRadar({
  theme,
  count,
  onPress,
}: {
  theme: AppTheme;
  count: number;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.radar,
        { backgroundColor: theme.ink },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.radarGrid} pointerEvents="none">
        <View style={styles.radarGridHorizontal} />
        <View style={styles.radarGridVertical} />
        <Animated.View
          style={[
            styles.radarRing,
            {
              borderColor: theme.highlight,
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 0],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1.25],
                  }),
                },
              ],
            },
          ]}
        />
        <View
          style={[styles.radarCore, { backgroundColor: theme.highlight }]}
        />
        <View
          style={[
            styles.radarPin,
            styles.radarPinOne,
            { backgroundColor: theme.primary },
          ]}
        />
        <View
          style={[
            styles.radarPin,
            styles.radarPinTwo,
            { backgroundColor: theme.highlight },
          ]}
        />
      </View>
      <View style={styles.radarCopy}>
        <View style={styles.radarKickerRow}>
          <MaterialIcons name="bolt" size={15} color={theme.highlight} />
          <Text style={[styles.radarKicker, { color: theme.highlight }]}>
            RADAR FLASH
          </Text>
        </View>
        <Text style={styles.radarTitle}>
          {count ? `${count} oferta(s) ativa(s) agora` : "Ofertas em movimento"}
        </Text>
        <Text style={styles.radarSubtitle}>
          Toque para descobrir o que pode chegar mais rápido.
        </Text>
      </View>
      <MaterialIcons name="arrow-forward" size={20} color={theme.highlight} />
    </Pressable>
  );
}

function NotificationSheet({
  open,
  notifications,
  theme,
  onClose,
  onRead,
}: {
  open: boolean;
  notifications: DiscoveryNotification[];
  theme: AppTheme;
  onClose: () => void;
  onRead: (notificationId: number) => void;
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[styles.notificationSheet, { backgroundColor: theme.canvas }]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: theme.line }]} />
          <View style={styles.notificationHeader}>
            <View>
              <Text style={[styles.kicker, { color: theme.primary }]}>
                CENTRAL DO PEDIU
              </Text>
              <Text style={[styles.notificationTitle, { color: theme.ink }]}>
                Avisos
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: theme.card, borderColor: theme.line },
              ]}
            >
              <MaterialIcons name="close" size={19} color={theme.ink} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.notificationList}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length ? (
              notifications.map((notification) => (
                <Pressable
                  key={notification.id}
                  onPress={() => onRead(notification.id)}
                  style={({ pressed }) => [
                    styles.notificationItem,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.line,
                      opacity: notification.readAt ? 0.66 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.notificationIcon,
                      {
                        backgroundColor: notification.readAt
                          ? theme.canvas
                          : theme.primarySoft,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        notification.readAt ? "done" : "notifications-active"
                      }
                      size={18}
                      color={notification.readAt ? theme.muted : theme.primary}
                    />
                  </View>
                  <View style={styles.notificationBody}>
                    <Text
                      style={[
                        styles.notificationItemTitle,
                        { color: theme.ink },
                      ]}
                    >
                      {notification.title}
                    </Text>
                    <Text
                      style={[
                        styles.notificationItemText,
                        { color: theme.muted },
                      ]}
                    >
                      {notification.body}
                    </Text>
                    {!notification.readAt ? (
                      <Text
                        style={[
                          styles.notificationHint,
                          { color: theme.primary },
                        ]}
                      >
                        Toque para marcar como lido
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))
            ) : (
              <View
                style={[
                  styles.emptyNotifications,
                  { backgroundColor: theme.card, borderColor: theme.line },
                ]}
              >
                <MaterialIcons
                  name="notifications-none"
                  size={28}
                  color={theme.muted}
                />
                <Text
                  style={[styles.notificationItemTitle, { color: theme.ink }]}
                >
                  Nada por agora
                </Text>
                <Text
                  style={[styles.notificationItemText, { color: theme.muted }]}
                >
                  Confirmações, pedidos e novidades aparecerão aqui.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14, marginTop: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  kicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.35,
    marginTop: 3,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  notificationDot: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  storyRail: { gap: 13, paddingVertical: 2, paddingRight: 12 },
  storyItem: { width: 65, alignItems: "center", gap: 6 },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  storyImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  storyImageAsset: { width: "100%", height: "100%" },
  storyEmoji: { fontSize: 25 },
  storyLabel: {
    width: 65,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyStory: {
    minHeight: 60,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  emptyStoryText: { flex: 1, fontSize: 12, lineHeight: 17 },
  promoRail: { gap: 10, paddingRight: 12 },
  promoCard: {
    width: 202,
    minHeight: 138,
    borderRadius: 26,
    padding: 15,
    gap: 5,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  promoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  promoKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  promoTitle: { fontSize: 17, fontWeight: "900", lineHeight: 21 },
  promoSubtitle: { fontSize: 11, lineHeight: 15 },
  radar: {
    minHeight: 134,
    borderRadius: 26,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    overflow: "hidden",
  },
  radarGrid: {
    width: 112,
    height: 104,
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#171717",
  },
  radarGridHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 34,
    height: 1,
    backgroundColor: "#2B2B2B",
    shadowColor: "#2B2B2B",
    shadowOffset: { width: 0, height: 34 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  radarGridVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 55,
    width: 1,
    backgroundColor: "#2B2B2B",
    shadowColor: "#2B2B2B",
    shadowOffset: { width: 28, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  radarRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    left: 24,
    top: 20,
  },
  radarCore: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    left: 52,
    top: 48,
  },
  radarPin: { position: "absolute", width: 9, height: 9, borderRadius: 5 },
  radarPinOne: { left: 19, top: 22 },
  radarPinTwo: { right: 15, bottom: 19 },
  radarCopy: { flex: 1, gap: 4 },
  radarKickerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  radarKicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  radarTitle: {
    color: "#FFF4E8",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  radarSubtitle: {
    color: "rgba(255,244,232,0.68)",
    fontSize: 11,
    lineHeight: 15,
  },
  searchAction: {
    minHeight: 48,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchActionText: { flex: 1, fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,0.52)",
    justifyContent: "flex-end",
  },
  notificationSheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  notificationTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginTop: 3,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationList: { gap: 9, paddingTop: 18, paddingBottom: 18 },
  notificationItem: {
    flexDirection: "row",
    gap: 11,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBody: { flex: 1, gap: 3 },
  notificationItemTitle: { fontSize: 13, fontWeight: "900" },
  notificationItemText: { fontSize: 12, lineHeight: 17 },
  notificationHint: { fontSize: 10, fontWeight: "900", marginTop: 4 },
  emptyNotifications: {
    borderWidth: 1,
    borderRadius: 20,
    alignItems: "center",
    gap: 7,
    padding: 24,
  },
});
