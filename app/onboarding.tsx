import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from "react-native";
import { PediuMascot } from "@/components/pediu-mascot";
import { PrimaryButton, PEDIU } from "@/components/pediu-page";
import { useAppPreferences } from "@/lib/app-preferences";
import type { MascotReaction } from "@/lib/mascot-scenes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  reaction: MascotReaction;
  speech: string;
};

const SLIDES: Slide[] = [
  {
    id: "peca",
    eyebrow: "PEÇA",
    title: "Tudo o que você precisa, em um só lugar.",
    body: "Restaurantes, mercados, farmácias e serviços perto de você. Com um toque, o pedido sai.",
    reaction: "hungry",
    speech: "Snif, snif… já tô com fome! Vamos pedir algo gostoso?",
  },
  {
    id: "acompanhe",
    eyebrow: "ACOMPANHE",
    title: "Seu pedido do começo ao fim.",
    body: "Atualizações em tempo real, mapa ao vivo e chat com o entregador. Sem surpresa na porta.",
    reaction: "curious",
    speech: "Estou de olho no caminho. Já já chega quentinho!",
  },
  {
    id: "venda",
    eyebrow: "VENDA",
    title: "Seu negócio também cabe no Pediu.",
    body: "Catálogo, pedidos, clientes e anúncios com IA. Tudo em uma operação simples e local.",
    reaction: "happy",
    speech: "Obaaa! Hora de vender e brilhar com o seu negócio!",
  },
  {
    id: "seu-pediu",
    eyebrow: "SEU PEDIU",
    title: "O Pediu se adapta a você.",
    body: "Escolha temas, personalize o mascote e descubra vantagens exclusivas. É o seu jeito de pedir.",
    reaction: "celebrate",
    speech: "Estou dançando porque você chegou! Bora começar?",
  },
];

export default function OnboardingScreen() {
  const { theme, customization } = useAppPreferences();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const mascotScale = useRef(new Animated.Value(0.85)).current;
  const progressAnims = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  const isLast = index === SLIDES.length - 1;
  const activeSlide = SLIDES[index];

  useEffect(() => {
    Animated.spring(mascotScale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [mascotScale]);

  const animateProgress = useCallback(
    (nextIndex: number) => {
      progressAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: i === nextIndex ? 1 : 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
    },
    [progressAnims],
  );

  const pulseMascot = useCallback(() => {
    mascotScale.setValue(0.9);
    Animated.spring(mascotScale, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [mascotScale]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= SLIDES.length) return;
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setIndex(nextIndex);
      animateProgress(nextIndex);
      pulseMascot();
    },
    [animateProgress, pulseMascot],
  );

  const finish = useCallback(async () => {
    await AsyncStorage.setItem("pediu:onboarding-complete", "1");
    router.replace("/login");
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      void finish();
      return;
    }
    goToIndex(index + 1);
  }, [finish, goToIndex, index, isLast]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      if (next === index || next < 0 || next >= SLIDES.length) return;
      setIndex(next);
      animateProgress(next);
      pulseMascot();
    },
    [animateProgress, index, pulseMascot],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;
      setIndex(first.index);
      animateProgress(first.index);
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Slide>) => (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <View style={styles.slideInner}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>
            {item.eyebrow}
          </Text>
          <Text style={[styles.title, { color: theme.ink }]}>{item.title}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>{item.body}</Text>
        </View>
      </View>
    ),
    [theme.ink, theme.muted, theme.primary],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <View
        pointerEvents="none"
        style={[styles.orb, styles.orbOne, { backgroundColor: "#FFE4D5" }]}
      />
      <View
        pointerEvents="none"
        style={[styles.orb, styles.orbTwo, { backgroundColor: "#E0F2EA" }]}
      />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.mascotWrap,
            {
              transform: [{ scale: mascotScale }],
            },
          ]}
        >
          <PediuMascot
            theme={theme}
            styleId={customization.mascotStyle}
            reaction={activeSlide.reaction}
            motionEnabled={customization.motionEnabled}
            showSpeech
            speechText={activeSlide.speech}
            speechSide="left"
          />
        </Animated.View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          onMomentumScrollEnd={onMomentumScrollEnd}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, itemIndex) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * itemIndex,
            index: itemIndex,
          })}
          style={styles.pager}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => {
              const width = progressAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [8, 28],
              });
              const backgroundColor = progressAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [PEDIU.line, theme.primary],
              });
              return (
                <Pressable
                  key={i}
                  onPress={() => goToIndex(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ir para etapa ${i + 1}`}
                >
                  <Animated.View
                    style={[styles.dot, { width, backgroundColor }]}
                  />
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton
            title={isLast ? "Começar" : "Continuar"}
            onPress={goNext}
          />

          {!isLast ? (
            <Pressable onPress={() => void finish()} style={styles.skip}>
              <Text style={[styles.skipText, { color: theme.muted }]}>
                Pular
              </Text>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.55,
  },
  orbOne: {
    width: 240,
    height: 240,
    top: -90,
    right: -100,
  },
  orbTwo: {
    width: 190,
    height: 190,
    bottom: 60,
    left: -120,
  },
  content: {
    flex: 1,
    paddingTop: 56,
    paddingBottom: 36,
    justifyContent: "space-between",
  },
  mascotWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    marginBottom: 4,
  },
  pager: {
    flexGrow: 0,
  },
  slide: {
    paddingHorizontal: 24,
  },
  slideInner: {
    gap: 14,
    minHeight: 168,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -1.1,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    gap: 14,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  dot: {
    height: 8,
    borderRadius: 8,
  },
  skip: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  skipPlaceholder: {
    height: 40,
  },
});
