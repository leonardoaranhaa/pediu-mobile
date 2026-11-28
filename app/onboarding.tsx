import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OnboardingStage, Pop, STAGE_PALETTE, type StageId } from "@/components/onboarding-stages";
import { PediuMascot } from "@/components/pediu-mascot";
import { PrimaryButton } from "@/components/pediu-page";
import { useAppPreferences } from "@/lib/app-preferences";
import { routeAfterWelcome, setAuthIntent } from "@/lib/guest-access";
import {
  ONBOARDING_COMPLETE_VALUE,
  ONBOARDING_STORAGE_KEY,
  rememberOnboardingComplete,
} from "@/lib/onboarding-gate";
import { ONBOARDING_SLIDES, type OnboardingSlide } from "@/lib/onboarding-content";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";

const SLIDES = ONBOARDING_SLIDES;

function Segment({
  state,
  onStage,
  onPress,
  label,
}: {
  state: "done" | "active" | "next";
  onStage: "light" | "dark";
  onPress: () => void;
  label: string;
}) {
  const reduced = useReducedMotion();
  const fill = useAnimatedStyle(() => ({
    width: withTiming(state === "next" ? "0%" : "100%", { duration: reduced ? 0 : 320 }),
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 14, bottom: 14 }}
      style={[styles.segment, { backgroundColor: onStage === "light" ? "rgba(255,255,255,0.35)" : "rgba(26,18,12,0.16)" }]}
    >
      <Animated.View style={[styles.segmentFill, { backgroundColor: onStage === "light" ? "#FFFFFF" : PEDIU_TOKENS.text }, fill]} />
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { theme, customization, updateCustomization } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // Fallbacks cover the first static web paint, before the window is measured.
  const width = windowWidth || 375;
  const height = windowHeight || 812;
  // The illustration takes what the copy and buttons leave, between 280 and 470 dp,
  // so small phones keep the text and buttons on screen.
  const stageHeight = Math.round(Math.min(Math.max(height - 400, 280), 470));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"stories" | "where">("stories");
  const [asking, setAsking] = useState(false);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);

  const slide = SLIDES[index];
  const palette = STAGE_PALETTE[slide.id as StageId];
  const isLast = index === SLIDES.length - 1;

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  }, []);

  const finish = useCallback(async (target: string = routeAfterWelcome()) => {
    rememberOnboardingComplete();
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, ONBOARDING_COMPLETE_VALUE).catch(() => undefined);
    router.replace(target as never);
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      setPhase("where");
      return;
    }
    goTo(index + 1);
  }, [goTo, index, isLast]);

  const startSelling = useCallback(() => {
    setAuthIntent({ action: "seller", role: "merchant", returnTo: "/seller" });
    void finish("/register");
  }, [finish]);

  const askForLocation = useCallback(async () => {
    setAsking(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      // The home resolves the address on its own once location is allowed.
      if (permission.granted) updateCustomization({ locationEnabled: true });
    } catch {
      // A refusal or an unavailable GPS just leaves the address for later.
    } finally {
      setAsking(false);
      void finish();
    }
  }, [finish, updateCustomization]);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== index && next >= 0 && next < SLIDES.length) setIndex(next);
    },
    [index, width],
  );

  const renderItem = useCallback(
    ({ item, index: itemIndex }: ListRenderItemInfo<OnboardingSlide>) => (
      <View style={{ width }}>
        <OnboardingStage
          // Remount when the story becomes visible so its pieces pop in again.
          key={itemIndex === index ? `on-${item.id}` : `off-${item.id}`}
          id={item.id as StageId}
          width={width}
          height={stageHeight}
          speech={item.speech}
          reaction={item.reaction}
          theme={theme}
          customization={customization}
        />
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: STAGE_PALETTE[item.id as StageId].accent }]}>{item.eyebrow}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {item.title}
          </Text>
          <Text style={styles.body}>{item.body}</Text>
        </View>
      </View>
    ),
    [customization, index, stageHeight, theme, width],
  );

  if (phase === "where") {
    const web = Platform.OS === "web";
    return (
      <View style={[styles.root, styles.where, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <StatusBar style="dark" />
        <Pressable
          onPress={() => setPhase("stories")}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.back}
        >
          <MaterialIcons name="arrow-back" size={22} color={PEDIU_TOKENS.text} />
        </Pressable>
        <View style={styles.whereArt}>
          <Pop delay={40} from={0.7}>
            <View style={styles.whereCircle}>
              {[0.25, 0.5, 0.75].map((f) => (
                <View key={`h${f}`} style={[styles.whereStreet, { top: `${f * 100}%`, left: 0, right: 0, height: 8 }]} />
              ))}
              {[0.33, 0.66].map((f) => (
                <View key={`v${f}`} style={[styles.whereStreet, { left: `${f * 100}%`, top: 0, bottom: 0, width: 8 }]} />
              ))}
              <View style={styles.whereHalo} />
              <MaterialIcons name="location-on" size={72} color={PEDIU_TOKENS.primary} />
            </View>
          </Pop>
          <Pop delay={220} from={0.8} style={styles.whereMascot}>
            <PediuMascot
              theme={theme}
              styleId={customization.mascotStyle}
              reaction="curious"
              motionEnabled={customization.motionEnabled}
              size={112}
            />
          </Pop>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>QUASE LÁ</Text>
          <Text style={styles.title} accessibilityRole="header">
            Onde você quer receber?
          </Text>
          <Text style={styles.body}>
            {web
              ? "No celular, o Pediu usa a sua localização para mostrar as lojas que entregam aí, com o tempo e a taxa certos."
              : "Com a sua localização, mostramos as lojas que entregam aí, com o tempo e a taxa certos. Dá para trocar o endereço quando quiser."}
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <PrimaryButton
            title={web ? "Continuar" : asking ? "Aguardando permissão…" : "Usar minha localização"}
            onPress={web ? () => void finish() : () => void askForLocation()}
            disabled={asking}
          />
          {!web ? (
            <Pressable onPress={() => void finish()} style={styles.secondary} accessibilityRole="button">
              <Text style={styles.secondaryText}>Agora não</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <StatusBar style={palette.onStage === "light" ? "light" : "dark"} />
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={index}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
        style={{ flexGrow: 0 }}
      />

      <View
        style={[styles.topBar, { top: insets.top + 10 }]}
        accessibilityLabel={`Etapa ${index + 1} de ${SLIDES.length}`}
      >
        <View style={styles.segments}>
          {SLIDES.map((item, i) => (
            <Segment
              key={item.id}
              state={i < index ? "done" : i === index ? "active" : "next"}
              onStage={palette.onStage}
              onPress={() => goTo(i)}
              label={`Ir para etapa ${i + 1}`}
            />
          ))}
        </View>
        {!isLast ? (
          <Pressable onPress={() => void finish()} accessibilityRole="button" hitSlop={10} style={styles.skip}>
            <Text style={[styles.skipText, { color: palette.onStage === "light" ? "#FFFFFF" : PEDIU_TOKENS.text }]}>Pular</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <PrimaryButton title={isLast ? "Começar" : "Continuar"} onPress={goNext} />
        {slide.id === "venda" ? (
          <Pressable onPress={startSelling} style={styles.secondary} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: theme.primary }]}>Quero vender no Pediu</Text>
          </Pressable>
        ) : (
          <View style={styles.secondary} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  topBar: {
    position: "absolute",
    left: 20,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  segments: { flex: 1, flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  segmentFill: { height: 4, borderRadius: 2 },
  skip: { minHeight: 32, justifyContent: "center", paddingHorizontal: 4 },
  skipText: { fontFamily: PEDIU_TOKENS.fontBody, fontSize: 15, fontWeight: "800" },
  copy: { paddingHorizontal: 24, paddingTop: 24, gap: 10 },
  eyebrow: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  title: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "600",
    letterSpacing: -0.4,
    color: PEDIU_TOKENS.text,
  },
  body: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 16,
    lineHeight: 24,
    color: PEDIU_TOKENS.muted,
  },
  footer: { marginTop: "auto", paddingHorizontal: 24, gap: 4 },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontFamily: PEDIU_TOKENS.fontBody, fontSize: 15, fontWeight: "800", color: PEDIU_TOKENS.muted },
  where: { paddingHorizontal: 24, justifyContent: "space-between", backgroundColor: PEDIU_TOKENS.canvas },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: PEDIU_TOKENS.line,
  },
  whereArt: { alignItems: "center", justifyContent: "center", marginTop: 8 },
  whereCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: PEDIU_TOKENS.canvasDeep,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  whereStreet: { position: "absolute", backgroundColor: "#FFFFFF", opacity: 0.7, borderRadius: 4 },
  whereMascot: { position: "absolute", left: "50%", marginLeft: 46, bottom: -22 },
  whereHalo: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: PEDIU_TOKENS.primary,
    opacity: 0.14,
    top: 52,
  },
});
