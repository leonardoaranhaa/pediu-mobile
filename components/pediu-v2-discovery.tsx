import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  PediuFloating,
  PediuPressable,
  PediuPulse,
  PediuReveal,
} from "@/components/pediu-motion";
import type { AppTheme } from "@/lib/app-preferences";

type DiscoveryProduct = {
  id: number;
  name: string;
  store: string;
  price: string;
  distance: string;
  category: string;
  available: boolean;
  description?: string | null;
  imageUrl?: string | null;
  adHeadline?: string | null;
  adDescription?: string | null;
  adOfferLabel?: string | null;
  emoji: string;
  flash?: boolean;
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
  onMarket,
  activeOrder,
  onActiveOrder,
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
  onMarket: () => void;
  activeOrder?: { id: number; status: string };
  onActiveOrder: () => void;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const stories = useMemo(() => products.slice(0, 6), [products]);
  const flashProducts = useMemo(
    () =>
      products
        .filter((product) => product.flash || Boolean(product.adOfferLabel))
        .slice(0, 4),
    [products],
  );

  return (
    <View style={styles.root}>
      <LiveTicker
        theme={theme}
        locationLabel={"perto de você"}
        flashCount={flashProducts.length}
        onPress={onSearch}
      />
      {activeOrder ? (
        <LiveBanner order={activeOrder} theme={theme} onPress={onActiveOrder} />
      ) : null}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.kicker, { color: theme.primary }]}>
            PARA VOCÊ
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>
            Escolha o seu próximo pedido
          </Text>
        </View>
        <PediuPressable
          accessibilityLabel="Abrir avisos"
          onPress={() => setNotificationsOpen(true)}
          style={[
            styles.notificationButton,
            { backgroundColor: theme.card, borderColor: theme.line },
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
        </PediuPressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storyRail}
      >
        {stories.length ? (
          stories.map((product, index) => (
            <PediuReveal key={product.id} delay={index * 55}>
              <PediuPressable
                onPress={() => setStoryIndex(index)}
                style={styles.storyItem}
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
                    style={[
                      styles.storyImage,
                      { backgroundColor: theme.canvas },
                    ]}
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
              </PediuPressable>
            </PediuReveal>
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

      <PromoReel
        theme={theme}
        products={flashProducts}
        index={promoIndex}
        onIndexChange={setPromoIndex}
        onAssistant={onAssistant}
        onBenefits={onBenefits}
        onOrders={onOrders}
        onMarket={onMarket}
        onSearch={onSearch}
      />

      <DealsStrip
        theme={theme}
        products={flashProducts}
        onProductPress={onProductPress}
      />

      <FlashRadar
        theme={theme}
        count={flashProducts.length}
        onPress={
          flashProducts.length
            ? onProductPress.bind(null, flashProducts[0])
            : onSearch
        }
      />

      <PediuPressable
        onPress={onSearch}
        style={[
          styles.searchAction,
          { backgroundColor: theme.ink, borderColor: theme.ink },
        ]}
      >
        <MaterialIcons name="search" size={19} color={theme.highlight} />
        <Text style={[styles.searchActionText, { color: theme.highlight }]}>
          Ver todos os sabores e serviços
        </Text>
        <MaterialIcons name="arrow-forward" size={18} color={theme.highlight} />
      </PediuPressable>

      <NotificationSheet
        open={notificationsOpen}
        notifications={notifications}
        theme={theme}
        onClose={() => setNotificationsOpen(false)}
        onRead={onReadNotification}
      />
      {storyIndex !== null && stories[storyIndex] ? (
        <StoryViewer
          stories={stories}
          index={storyIndex}
          onClose={() => setStoryIndex(null)}
          onNext={() =>
            setStoryIndex((current) =>
              current === null || current + 1 >= stories.length
                ? null
                : current + 1,
            )
          }
          onPrevious={() =>
            setStoryIndex((current) =>
              current === null ? null : Math.max(0, current - 1),
            )
          }
          onProductPress={onProductPress}
        />
      ) : null}
    </View>
  );
}

function LiveTicker({
  theme,
  locationLabel,
  flashCount,
  onPress,
}: {
  theme: AppTheme;
  locationLabel: string;
  flashCount: number;
  onPress: () => void;
}) {
  return (
    <PediuPressable
      accessibilityLabel="Abrir ofertas Flash"
      onPress={onPress}
      style={[styles.liveTicker, { backgroundColor: theme.highlight }]}
    >
      <Text style={[styles.liveTickerText, { color: theme.highlightText }]}>
        {flashCount
          ? `Flash ativo · ${flashCount} oferta(s) · ${locationLabel}`
          : `Catálogo atualizado · ${locationLabel}`}
      </Text>
      <MaterialIcons
        name="arrow-forward"
        size={16}
        color={theme.highlightText}
      />
    </PediuPressable>
  );
}

function LiveBanner({
  order,
  theme,
  onPress,
}: {
  order: { id: number; status: string };
  theme: AppTheme;
  onPress: () => void;
}) {
  return (
    <PediuPressable
      onPress={onPress}
      style={[styles.liveBanner, { backgroundColor: theme.ink }]}
    >
      <View style={styles.liveBannerDotWrap}>
        <PediuPulse style={styles.liveBannerPulse}>
          <View
            style={[styles.liveBannerDot, { backgroundColor: theme.primary }]}
          />
        </PediuPulse>
      </View>
      <View style={styles.liveBannerCopy}>
        <Text style={styles.liveBannerTitle}>
          {order.status} · pedido #{order.id}
        </Text>
        <Text style={styles.liveBannerSubtitle}>
          Acompanhe o status atualizado
        </Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={20}
        color="rgba(255,244,232,0.52)"
      />
    </PediuPressable>
  );
}

function PromoReel({
  theme,
  products,
  index,
  onIndexChange,
  onAssistant,
  onBenefits,
  onOrders,
  onMarket,
  onSearch,
}: {
  theme: AppTheme;
  products: DiscoveryProduct[];
  index: number;
  onIndexChange: (index: number) => void;
  onAssistant: () => void;
  onBenefits: () => void;
  onOrders: () => void;
  onMarket: () => void;
  onSearch: () => void;
}) {
  const railRef = useRef<ScrollView>(null);
  const firstProduct = products[0];
  const cards = [
    {
      tone: "accent" as const,
      icon: "bolt" as const,
      title: firstProduct?.name || "Chega mais rápido",
      subtitle:
        firstProduct?.adOfferLabel || "Lojas Flash ligadas no servidor.",
      action: onSearch,
    },
    {
      tone: "primary" as const,
      icon: "auto-awesome" as const,
      title: "Sabor do momento",
      subtitle: "Fale ou digite e encontre uma boa ideia.",
      action: onAssistant,
    },
    {
      tone: "ink" as const,
      icon: "local-offer" as const,
      title: "Pediu Vantagens",
      subtitle: "Cupons reais e condições dos lojistas.",
      action: onBenefits,
    },
    {
      tone: "primary" as const,
      icon: "store" as const,
      title: "Mercado Pediu",
      subtitle: "Hortifruti e mercearia por unidade.",
      action: onMarket,
    },
    {
      tone: "accent" as const,
      icon: "receipt-long" as const,
      title: "Acompanhe de perto",
      subtitle: "Veja seus pedidos e o status atualizado.",
      action: onOrders,
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (index + 1) % cards.length;
      railRef.current?.scrollTo({ x: next * 212, animated: true });
      onIndexChange(next);
    }, 4200);
    return () => clearInterval(timer);
  }, [cards.length, index, onIndexChange]);

  return (
    <View style={styles.promoWrap}>
      <ScrollView
        ref={railRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.promoRail}
        snapToInterval={212}
        decelerationRate="fast"
      >
        {cards.map((card, cardIndex) => (
          <View key={`${card.title}-${cardIndex}`} style={styles.promoSlot}>
            <PromoCard
              theme={theme}
              tone={card.tone}
              icon={card.icon}
              title={card.title}
              subtitle={card.subtitle}
              action={card.action}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.promoDots}>
        {cards.map((card, cardIndex) => (
          <View
            key={`${card.title}-dot`}
            style={[
              styles.promoDot,
              cardIndex === index && styles.promoDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function DealsStrip({
  theme,
  products,
  onProductPress,
}: {
  theme: AppTheme;
  products: DiscoveryProduct[];
  onProductPress: (product: DiscoveryProduct) => void;
}) {
  if (!products.length) return null;
  return (
    <View style={styles.dealsSection}>
      <View style={styles.dealsHeader}>
        <View>
          <View style={styles.dealsKickerRow}>
            <MaterialIcons name="bolt" size={15} color={theme.primary} />
            <Text style={[styles.dealsKicker, { color: theme.primary }]}>
              RELÂMPAGO
            </Text>
          </View>
          <Text style={[styles.dealsTitle, { color: theme.ink }]}>
            Ofertas que correm
          </Text>
        </View>
        <View style={[styles.dealsStatus, { backgroundColor: theme.ink }]}>
          <MaterialIcons name="timer" size={14} color={theme.highlight} />
          <Text style={styles.dealsStatusText}>AGORA</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dealsRail}
      >
        {products.map((product, index) => (
          <PediuReveal key={product.id} delay={index * 50}>
            <PediuPressable
              onPress={() => onProductPress(product)}
              style={[styles.dealCard, { backgroundColor: theme.card }]}
            >
              <View style={styles.dealImageWrap}>
                {product.imageUrl ? (
                  <Image
                    source={{ uri: product.imageUrl }}
                    style={styles.dealImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.dealEmoji}>{product.emoji}</Text>
                )}
                <View
                  style={[styles.dealBadge, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.dealBadgeText}>FLASH</Text>
                </View>
              </View>
              <View style={styles.dealCopy}>
                <Text
                  style={[styles.dealName, { color: theme.ink }]}
                  numberOfLines={1}
                >
                  {product.name}
                </Text>
                <Text
                  style={[styles.dealSubtitle, { color: theme.muted }]}
                  numberOfLines={1}
                >
                  {product.adOfferLabel || product.category}
                </Text>
                <Text style={[styles.dealFooter, { color: theme.primary }]}>
                  {product.price} · entrega Flash
                </Text>
              </View>
            </PediuPressable>
          </PediuReveal>
        ))}
      </ScrollView>
    </View>
  );
}

function StoryViewer({
  stories,
  index,
  onClose,
  onNext,
  onPrevious,
  onProductPress,
}: {
  stories: DiscoveryProduct[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onProductPress: (product: DiscoveryProduct) => void;
}) {
  const product = stories[index];

  useEffect(() => {
    const timer = setTimeout(onNext, 4200);
    return () => clearTimeout(timer);
  }, [index, onNext]);

  if (!product) return null;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.storyViewer}>
        <View style={styles.storyProgressRow}>
          {stories.map((story, storyNumber) => (
            <View key={story.id} style={styles.storyProgressTrack}>
              {storyNumber < index ? (
                <View style={styles.storyProgressFill} />
              ) : storyNumber === index ? (
                <View
                  style={[styles.storyProgressFill, styles.storyProgressActive]}
                />
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.storyViewerHeader}>
          <Text style={styles.storyViewerTitle}>{product.store}</Text>
          <PediuPressable
            onPress={onClose}
            accessibilityLabel="Fechar story"
            style={styles.storyClose}
          >
            <MaterialIcons name="close" size={22} color="#FFFDF9" />
          </PediuPressable>
        </View>
        <View style={styles.storyViewerMedia}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.storyViewerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.storyViewerFallback}>
              <Text style={styles.storyViewerEmoji}>{product.emoji}</Text>
            </View>
          )}
          <View style={styles.storyViewerScrim} pointerEvents="none" />
          <View style={styles.storyViewerCopy} pointerEvents="box-none">
            <Text style={styles.storyViewerKicker}>PEDIU AGORA</Text>
            <Text style={styles.storyViewerHeadline}>
              {product.adHeadline || product.name}
            </Text>
            <Text style={styles.storyViewerDescription}>
              {product.adDescription ||
                product.description ||
                "Uma boa escolha do catálogo do Pediu, perto de você."}
            </Text>
            <PediuPressable
              style={styles.storyViewerCta}
              onPress={() => {
                onClose();
                onProductPress(product);
              }}
            >
              <Text style={styles.storyViewerCtaText}>Pedir agora</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFDF9" />
            </PediuPressable>
          </View>
          <PediuPressable
            style={styles.storyTapPrevious}
            onPress={onPrevious}
            accessibilityLabel="Story anterior"
          >
            <View />
          </PediuPressable>
          <PediuPressable
            style={styles.storyTapNext}
            onPress={onNext}
            accessibilityLabel="Próximo story"
          >
            <View />
          </PediuPressable>
        </View>
      </View>
    </Modal>
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
    <PediuPressable
      onPress={action}
      style={[
        styles.promoCard,
        { backgroundColor, shadowColor: backgroundColor },
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
    </PediuPressable>
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
  return (
    <PediuPressable
      onPress={onPress}
      style={[styles.radar, { backgroundColor: theme.ink }]}
    >
      <View style={styles.radarGrid} pointerEvents="none">
        <View style={styles.radarGridHorizontal} />
        <View style={styles.radarGridVertical} />
        <PediuPulse style={styles.radarRing}>
          <View
            style={[styles.radarRingInner, { borderColor: theme.highlight }]}
          />
        </PediuPulse>
        <PediuFloating
          distance={3}
          duration={1600}
          style={styles.radarCoreWrap}
        >
          <View
            style={[styles.radarCore, { backgroundColor: theme.highlight }]}
          />
        </PediuFloating>
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
    </PediuPressable>
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
            <PediuPressable
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: theme.card, borderColor: theme.line },
              ]}
            >
              <MaterialIcons name="close" size={19} color={theme.ink} />
            </PediuPressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.notificationList}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length ? (
              notifications.map((notification) => (
                <PediuPressable
                  key={notification.id}
                  onPress={() => onRead(notification.id)}
                  style={[
                    styles.notificationItem,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.line,
                      opacity: notification.readAt ? 0.66 : 1,
                    },
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
                </PediuPressable>
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
  liveTicker: {
    minHeight: 34,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(26,18,12,0.08)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  liveTickerText: { flex: 1, fontSize: 11, fontWeight: "800" },
  liveBanner: {
    minHeight: 66,
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liveBannerDotWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  liveBannerPulse: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  liveBannerDot: { width: 10, height: 10, borderRadius: 5 },
  liveBannerCopy: { flex: 1, gap: 3 },
  liveBannerTitle: { color: "#FFF4E8", fontSize: 13, fontWeight: "900" },
  liveBannerSubtitle: { color: "rgba(255,244,232,0.65)", fontSize: 11 },
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
  promoWrap: { gap: 9 },
  promoRail: { gap: 10, paddingRight: 12 },
  promoSlot: { width: 202 },
  promoDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  promoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E9DED3",
  },
  promoDotActive: { width: 20, backgroundColor: "#E20D2A" },
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
  dealsSection: { gap: 10 },
  dealsHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  dealsKickerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dealsKicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  dealsTitle: { fontSize: 19, fontWeight: "900", marginTop: 2 },
  dealsStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dealsStatusText: { color: "#FFF4E8", fontSize: 10, fontWeight: "900" },
  dealsRail: { gap: 10, paddingRight: 12 },
  dealCard: {
    width: 184,
    overflow: "hidden",
    borderRadius: 22,
    shadowColor: "#1A120C",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dealImageWrap: {
    height: 96,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE2C4",
  },
  dealImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  dealEmoji: { fontSize: 42 },
  dealBadge: {
    position: "absolute",
    left: 9,
    top: 9,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dealBadgeText: { color: "#FFF7F5", fontSize: 10, fontWeight: "900" },
  dealCopy: { padding: 11, gap: 3 },
  dealName: { fontSize: 14, fontWeight: "900" },
  dealSubtitle: { fontSize: 11 },
  dealFooter: { fontSize: 11, fontWeight: "800", marginTop: 3 },
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
    left: 24,
    top: 20,
  },
  radarRingInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  radarCoreWrap: {
    position: "absolute",
    width: 8,
    height: 8,
    left: 52,
    top: 48,
  },
  radarCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  storyViewer: { flex: 1, backgroundColor: "#111111" },
  storyProgressRow: {
    position: "absolute",
    zIndex: 4,
    top: 14,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
  },
  storyProgressTrack: {
    height: 4,
    flex: 1,
    overflow: "hidden",
    borderRadius: 2,
    backgroundColor: "rgba(255,253,249,0.22)",
  },
  storyProgressFill: {
    height: "100%",
    width: "100%",
    backgroundColor: "#FFFDF9",
  },
  storyProgressActive: { backgroundColor: "#E20D2A" },
  storyViewerHeader: {
    position: "absolute",
    zIndex: 4,
    top: 28,
    left: 16,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storyViewerTitle: {
    color: "#FFFDF9",
    fontSize: 15,
    fontWeight: "900",
  },
  storyClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,17,17,0.42)",
  },
  storyViewerMedia: { flex: 1, position: "relative" },
  storyViewerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  storyViewerFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#163B48",
  },
  storyViewerEmoji: { fontSize: 92 },
  storyViewerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,17,17,0.34)",
  },
  storyViewerCopy: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 32,
    gap: 8,
  },
  storyViewerKicker: {
    color: "#FFC400",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  storyViewerHeadline: {
    color: "#FFFDF9",
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "900",
  },
  storyViewerDescription: {
    color: "rgba(255,253,249,0.82)",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 340,
  },
  storyViewerCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 7,
    borderRadius: 24,
    backgroundColor: "#E20D2A",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  storyViewerCtaText: { color: "#FFF7F5", fontSize: 13, fontWeight: "900" },
  storyTapPrevious: {
    position: "absolute",
    left: 0,
    top: 72,
    bottom: 120,
    width: "32%",
  },
  storyTapNext: {
    position: "absolute",
    right: 0,
    top: 72,
    bottom: 120,
    width: "68%",
  },
});
