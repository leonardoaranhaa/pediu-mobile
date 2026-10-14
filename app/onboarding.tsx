import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type ViewToken,
} from "react-native";
import { PediuMascot } from "@/components/pediu-mascot";
import { PrimaryButton } from "@/components/pediu-page";
import { useAppPreferences } from "@/lib/app-preferences";
import { ONBOARDING_COMPLETE_VALUE, ONBOARDING_STORAGE_KEY } from "@/lib/onboarding-gate";
import {
  ONBOARDING_SLIDES,
  type OnboardingSlide,
} from "@/lib/onboarding-content";
import { useReducedMotion } from "react-native-reanimated";

const SLIDES = ONBOARDING_SLIDES;

export default function OnboardingScreen() {
  const { theme, customization } = useAppPreferences();
  const { width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = customization.motionEnabled && !reducedMotion;
  const effectiveWidth = screenWidth || 375;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const mascotScale = useRef(new Animated.Value(0.85)).current;
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const slideOffset = useRef(new Animated.Value(0)).current;
  const progressAnims = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  const isLast = index === SLIDES.length - 1;
  const activeSlide = SLIDES[index];

  useEffect(() => {
    Animated.timing(mascotScale, {
      toValue: 1,
      duration: shouldAnimate ? 280 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mascotScale, shouldAnimate]);

  const animateProgress = useCallback(
    (nextIndex: number) => {
      progressAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: i === nextIndex ? 1 : 0,
          duration: shouldAnimate ? 280 : 0,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
    },
    [progressAnims, shouldAnimate],
  );

  const pulseMascot = useCallback(() => {
    mascotScale.stopAnimation();
    mascotScale.setValue(shouldAnimate ? 0.94 : 1);
    Animated.timing(mascotScale, {
      toValue: 1,
      duration: shouldAnimate ? 220 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mascotScale, shouldAnimate]);

  const transitionSlideContent = useCallback(() => {
    slideOpacity.stopAnimation();
    slideOffset.stopAnimation();

    if (!shouldAnimate) {
      slideOpacity.setValue(1);
      slideOffset.setValue(0);
      return;
    }

    slideOpacity.setValue(0);
    slideOffset.setValue(14);
    Animated.parallel([
      Animated.timing(slideOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideOffset, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [shouldAnimate, slideOffset, slideOpacity]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= SLIDES.length) return;
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setIndex(nextIndex);
      animateProgress(nextIndex);
      transitionSlideContent();
      pulseMascot();
    },
    [animateProgress, pulseMascot, transitionSlideContent],
  );

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, ONBOARDING_COMPLETE_VALUE);
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
        event.nativeEvent.contentOffset.x / effectiveWidth,
      );
      if (next === index || next < 0 || next >= SLIDES.length) return;
      setIndex(next);
      animateProgress(next);
      transitionSlideContent();
      pulseMascot();
    },
    [
      animateProgress,
      effectiveWidth,
      index,
      pulseMascot,
      transitionSlideContent,
    ],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;
      setIndex(first.index);
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const renderItem = useCallback(
      ({ item }: ListRenderItemInfo<OnboardingSlide>) => (
      <View style={[styles.slide, { width: effectiveWidth }]}>
        <View style={styles.slideInner}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>
            {item.eyebrow}
          </Text>
          <Text style={[styles.title, { color: theme.ink }]}>{item.title}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>{item.body}</Text>
        </View>
      </View>
    ),
    [effectiveWidth, theme.ink, theme.muted, theme.primary],
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

        <Animated.View
          style={[
            styles.pagerTransition,
            {
              opacity: slideOpacity,
              transform: [{ translateX: slideOffset }],
            },
          ]}
        >
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
              length: effectiveWidth,
              offset: effectiveWidth * itemIndex,
              index: itemIndex,
            })}
            style={styles.pager}
          />
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => {
              const width = progressAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [8, 28],
              });
              const backgroundColor = progressAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [theme.line, theme.primary],
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
  pagerTransition: {
    width: "100%",
    overflow: "hidden",
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
