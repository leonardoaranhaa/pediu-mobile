import { useEffect, type ReactNode } from "react";
import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { PediuMascot } from "@/components/pediu-mascot";
import { APP_THEMES, type AppCustomization, type AppTheme } from "@/lib/app-preferences";
import type { MascotReaction } from "@/lib/mascot-scenes";
import { FOOD_THUMBS, PEDIU_TOKENS } from "@/lib/pediu-tokens";

export type StageId = "peca" | "acompanhe" | "venda" | "seu-pediu";

/** Background and text colours of each story, so the screen can match status bar and copy. */
export const STAGE_PALETTE: Record<StageId, { background: string; onStage: "light" | "dark"; accent: string }> = {
  peca: { background: PEDIU_TOKENS.primary, onStage: "light", accent: PEDIU_TOKENS.primary },
  acompanhe: { background: PEDIU_TOKENS.ink, onStage: "light", accent: PEDIU_TOKENS.ink },
  venda: { background: PEDIU_TOKENS.accent, onStage: "dark", accent: "#B26B00" },
  "seu-pediu": { background: PEDIU_TOKENS.canvasDeep, onStage: "dark", accent: PEDIU_TOKENS.primary },
};

/**
 * Pops a piece of the illustration in. `play` remounts the animation each time the
 * story becomes visible; reduced motion shows everything at once.
 */
export function Pop({
  delay = 0,
  from = 0.6,
  style,
  children,
}: {
  delay?: number;
  from?: number;
  style?: ViewStyle | ViewStyle[];
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    progress.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.6)) }));
  }, [delay, progress, reduced]);
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.6),
    transform: [{ scale: from + (1 - from) * progress.value }, { translateY: (1 - progress.value) * 10 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

function Photo({ source, size, ring = "#FFF7F5" }: { source: number; size: number; ring?: string }) {
  return (
    <View
      style={[
        styles.photo,
        { width: size, height: size, borderRadius: size / 2, borderColor: ring, borderWidth: Math.max(3, size * 0.035) },
      ]}
    >
      <Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </View>
  );
}

function Bubble({ text, style, tail = "left" }: { text: string; style?: ViewStyle; tail?: "left" | "right" }) {
  return (
    <View style={[styles.bubble, style]}>
      <Text style={styles.bubbleText} numberOfLines={3}>
        {text}
      </Text>
      <View style={[styles.bubbleTail, tail === "left" ? { left: 18 } : { right: 18 }]} />
    </View>
  );
}

function Chip({ icon, label, tint, style }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; tint: string; style?: ViewStyle }) {
  return (
    <View style={[styles.chip, style]}>
      <View style={[styles.chipIcon, { backgroundColor: tint }]}>
        <MaterialIcons name={icon} size={14} color="#FFFFFF" />
      </View>
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Mascot({
  theme,
  customization,
  reaction,
  size,
}: {
  theme: AppTheme;
  customization: AppCustomization;
  reaction: MascotReaction;
  size: number;
}) {
  return (
    <PediuMascot
      theme={theme}
      styleId={customization.mascotStyle}
      reaction={reaction}
      motionEnabled={customization.motionEnabled}
      size={size}
    />
  );
}

type StageProps = {
  id: StageId;
  width: number;
  height: number;
  speech: string;
  reaction: MascotReaction;
  theme: AppTheme;
  customization: AppCustomization;
};

/** Illustration for one onboarding story, drawn from real food photos, app cards and the mascot. */
export function OnboardingStage(props: StageProps) {
  const { id, width, height } = props;
  const palette = STAGE_PALETTE[id];
  return (
    <View style={[styles.stage, { width, height, backgroundColor: palette.background }]}>
      <View pointerEvents="none" style={[styles.glow, { width: width * 0.9, height: width * 0.9, borderRadius: width, right: -width * 0.35, top: -width * 0.3 }]} />
      <View pointerEvents="none" style={[styles.glow, { width: width * 0.6, height: width * 0.6, borderRadius: width, left: -width * 0.25, bottom: -width * 0.2 }]} />
      {id === "peca" ? <OrderStage {...props} /> : null}
      {id === "acompanhe" ? <TrackStage {...props} /> : null}
      {id === "venda" ? <SellStage {...props} /> : null}
      {id === "seu-pediu" ? <YoursStage {...props} /> : null}
    </View>
  );
}

function OrderStage({ width, height, speech, reaction, theme, customization }: StageProps) {
  const main = Math.min(width * 0.5, height * 0.48);
  return (
    <>
      <Pop delay={60} style={{ position: "absolute", left: width * 0.4, top: height * 0.17 }}>
        <Photo source={FOOD_THUMBS.burger} size={main} />
      </Pop>
      <Pop delay={140} style={{ position: "absolute", left: width * 0.08, top: height * 0.15 }}>
        <Photo source={FOOD_THUMBS.pizza} size={main * 0.5} />
      </Pop>
      <Pop delay={200} style={{ position: "absolute", left: width * 0.78, top: height * 0.1 }}>
        <Photo source={FOOD_THUMBS.sushi} size={main * 0.36} />
      </Pop>
      <Pop delay={260} style={{ position: "absolute", left: width * 0.3, top: height * 0.44 }}>
        <Photo source={FOOD_THUMBS.acai} size={main * 0.4} />
      </Pop>
      <Pop delay={320} from={0.9} style={{ position: "absolute", right: width * 0.05, bottom: height * 0.07 }}>
        <Chip icon="delivery-dining" label="Perto de você" tint={PEDIU_TOKENS.primary} />
      </Pop>
      <Pop delay={340} from={0.5} style={{ position: "absolute", left: -width * 0.08, bottom: -height * 0.1 }}>
        {/* Cream spotlight so the red mascot reads on the red stage. */}
        <View style={{ width: width * 0.5, height: width * 0.5, borderRadius: width, backgroundColor: PEDIU_TOKENS.canvas, opacity: 0.95 }} />
      </Pop>
      <Pop delay={380} from={0.8} style={{ position: "absolute", left: width * 0.04, bottom: 6 }}>
        <Mascot theme={theme} customization={customization} reaction={reaction} size={Math.min(132, height * 0.33)} />
      </Pop>
      <Pop delay={520} from={0.9} style={{ position: "absolute", left: width * 0.3, bottom: height * 0.21, maxWidth: width * 0.42 }}>
        <Bubble text={speech} />
      </Pop>
    </>
  );
}

const ROUTE = Array.from({ length: 13 }, (_, i) => i / 12);

function TrackStage({ width, height, speech, reaction, theme, customization }: StageProps) {
  // A dotted route over a faint street grid, ending at the customer's door.
  const start = { x: width * 0.12, y: height * 0.86 };
  const control = { x: width * 0.2, y: height * 0.12 };
  const end = { x: width * 0.86, y: height * 0.16 };
  const at = (t: number) => ({
    x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
    y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y,
  });
  const moto = at(0.55);
  const cardWidth = Math.min(width * 0.64, 260);
  const steps: { label: string; state: "done" | "now" | "next"; note?: string }[] = [
    { label: "Pedido aceito", state: "done" },
    { label: "Em preparo", state: "done" },
    { label: "A caminho", state: "now", note: "chega em poucos minutos" },
    { label: "Entregue", state: "next" },
  ];
  return (
    <>
      {[0.22, 0.5, 0.78].map((f) => (
        <View key={`h${f}`} pointerEvents="none" style={[styles.street, { top: height * f, left: 0, right: 0, height: 10 }]} />
      ))}
      {[0.3, 0.66].map((f) => (
        <View key={`v${f}`} pointerEvents="none" style={[styles.street, { left: width * f, top: 0, bottom: 0, width: 10 }]} />
      ))}
      {ROUTE.map((t) => {
        const p = at(t);
        return <View key={t} pointerEvents="none" style={[styles.routeDot, { left: p.x - 3, top: p.y - 3 }]} />;
      })}
      <Pop delay={80} style={{ position: "absolute", left: end.x - 20, top: end.y - 20 }}>
        <View style={[styles.pin, { backgroundColor: "#FFFFFF" }]}>
          <MaterialIcons name="home" size={20} color={PEDIU_TOKENS.ink} />
        </View>
      </Pop>
      <Pop delay={160} style={{ position: "absolute", left: moto.x - 22, top: moto.y - 22 }}>
        <View style={[styles.pin, { width: 44, height: 44, borderRadius: 22, backgroundColor: PEDIU_TOKENS.primary }]}>
          <MaterialIcons name="delivery-dining" size={24} color="#FFFFFF" />
        </View>
      </Pop>
      <Pop delay={240} from={0.92} style={{ position: "absolute", left: width * 0.06, bottom: height * 0.07, width: cardWidth }}>
        <View style={styles.card}>
          <Text style={styles.cardKicker}>SEU PEDIDO</Text>
          {steps.map((step) => (
            <View key={step.label} style={styles.stepRow}>
              <MaterialIcons
                name={step.state === "done" ? "check-circle" : step.state === "now" ? "radio-button-checked" : "radio-button-unchecked"}
                size={18}
                color={step.state === "done" ? PEDIU_TOKENS.success : step.state === "now" ? PEDIU_TOKENS.primary : "#C9BFB5"}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.stepLabel, step.state === "next" && { color: "#9A8E84" }, step.state === "now" && { color: PEDIU_TOKENS.primary }]}>
                  {step.label}
                </Text>
                {step.note ? <Text style={styles.stepNote}>{step.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </Pop>
      <Pop delay={380} from={0.8} style={{ position: "absolute", right: width * 0.02, bottom: 4 }}>
        <Mascot theme={theme} customization={customization} reaction={reaction} size={Math.min(118, height * 0.3)} />
      </Pop>
      <Pop delay={520} from={0.9} style={{ position: "absolute", right: width * 0.05, bottom: height * 0.36, maxWidth: width * 0.4 }}>
        <Bubble text={speech} tail="right" />
      </Pop>
    </>
  );
}

function SellStage({ width, height, speech, reaction, theme, customization }: StageProps) {
  const rows = [
    { photo: FOOD_THUMBS.burger, name: "Hambúrguer da Casa", price: "R$ 29,90" },
    { photo: FOOD_THUMBS.pizza, name: "Pizza margherita", price: "R$ 49,00" },
  ];
  return (
    <>
      <Pop delay={60} from={0.9} style={{ position: "absolute", left: width * 0.06, right: width * 0.06, top: height * 0.13 }}>
        <View style={[styles.card, styles.notice]}>
          <View style={[styles.pin, { width: 40, height: 40, borderRadius: 20, backgroundColor: PEDIU_TOKENS.primary }]}>
            <MaterialIcons name="notifications-active" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.noticeTitle}>Novo pedido!</Text>
            <Text style={styles.stepNote} numberOfLines={1}>
              2× Hambúrguer da Casa · R$ 59,80
            </Text>
          </View>
          <View style={styles.acceptPill}>
            <Text style={styles.acceptText}>Aceitar</Text>
          </View>
        </View>
      </Pop>
      <Pop delay={180} from={0.9} style={{ position: "absolute", left: width * 0.06, top: height * 0.37, width: Math.min(width * 0.64, 260) }}>
        <View style={styles.card}>
          <Text style={styles.cardKicker}>CARDÁPIO</Text>
          {rows.map((row) => (
            <View key={row.name} style={styles.menuRow}>
              <Image source={row.photo} style={styles.menuThumb} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.stepLabel} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.stepNote}>{row.price}</Text>
              </View>
              <View style={styles.toggle}>
                <View style={styles.toggleKnob} />
              </View>
            </View>
          ))}
        </View>
      </Pop>
      <Pop delay={360} from={0.8} style={{ position: "absolute", right: width * 0.02, bottom: 4 }}>
        <Mascot theme={theme} customization={customization} reaction={reaction} size={Math.min(124, height * 0.31)} />
      </Pop>
      <Pop delay={500} from={0.9} style={{ position: "absolute", right: width * 0.32, bottom: height * 0.05, maxWidth: width * 0.5 }}>
        <Bubble text={speech} tail="right" />
      </Pop>
    </>
  );
}

const CONFETTI = [
  [0.08, 0.2, "#E20D2A", 10], [0.2, 0.08, "#FFC400", 8], [0.33, 0.24, "#008C95", 7], [0.62, 0.07, "#E64980", 9],
  [0.82, 0.2, "#FFC400", 11], [0.9, 0.42, "#E20D2A", 7], [0.12, 0.55, "#E64980", 8], [0.78, 0.62, "#008C95", 10],
  [0.06, 0.8, "#FFC400", 9], [0.92, 0.84, "#E20D2A", 8], [0.45, 0.04, "#163B48", 6], [0.55, 0.3, "#FFC400", 6],
] as const;

function YoursStage({ width, height, speech, reaction, theme, customization }: StageProps) {
  const size = Math.min(150, height * 0.38);
  const swatches = APP_THEMES.map((item) => item.primary);
  return (
    <>
      {CONFETTI.map(([x, y, color, s], i) => (
        <Pop key={i} delay={40 + i * 30} style={{ position: "absolute", left: width * x, top: height * y }}>
          <View style={{ width: s, height: i % 3 === 0 ? s * 1.8 : s, borderRadius: s, backgroundColor: color, transform: [{ rotate: `${i * 37}deg` }] }} />
        </Pop>
      ))}
      <Pop delay={120} from={0.9} style={{ position: "absolute", left: width * 0.06, top: height * 0.1 }}>
        <Chip icon="star" label="Clube Pediu: pontos em cada pedido" tint="#E0A100" />
      </Pop>
      <View style={{ position: "absolute", left: 0, right: 0, top: height * 0.3, flexDirection: "row", justifyContent: "center", gap: 14 }}>
        {swatches.map((color, i) => (
          <Pop key={color} delay={220 + i * 90}>
            <View style={[styles.swatch, { backgroundColor: color }]}>
              {i === 0 ? <MaterialIcons name="check" size={20} color="#FFFFFF" /> : null}
            </View>
          </Pop>
        ))}
      </View>
      <Pop delay={420} from={0.7} style={{ position: "absolute", left: (width - size * 0.85) / 2, bottom: 4 }}>
        <Mascot theme={theme} customization={customization} reaction={reaction} size={size} />
      </Pop>
      <Pop delay={600} from={0.9} style={{ position: "absolute", left: width * 0.56, bottom: height * 0.3, maxWidth: width * 0.4 }}>
        <Bubble text={speech} />
      </Pop>
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    overflow: "hidden",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  glow: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    opacity: 0.08,
  },
  photo: {
    overflow: "hidden",
    backgroundColor: "#F3E6D8",
    shadowColor: "#1A120C",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  bubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#1A120C",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bubbleText: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    color: PEDIU_TOKENS.text,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    shadowColor: "#1A120C",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 13,
    fontWeight: "800",
    color: PEDIU_TOKENS.text,
  },
  street: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    opacity: 0.06,
    borderRadius: 5,
  },
  routeDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    opacity: 0.55,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    gap: 8,
    shadowColor: "#1A120C",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardKicker: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: PEDIU_TOKENS.muted,
  },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  stepLabel: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 14,
    fontWeight: "800",
    color: PEDIU_TOKENS.text,
  },
  stepNote: {
    fontFamily: PEDIU_TOKENS.fontBody,
    fontSize: 12,
    color: PEDIU_TOKENS.muted,
  },
  notice: { flexDirection: "row", alignItems: "center", gap: 10 },
  noticeTitle: {
    fontFamily: PEDIU_TOKENS.fontDisplay,
    fontSize: 17,
    fontWeight: "600",
    color: PEDIU_TOKENS.text,
  },
  acceptPill: {
    backgroundColor: PEDIU_TOKENS.success,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  acceptText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12, fontFamily: PEDIU_TOKENS.fontBody },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuThumb: { width: 40, height: 40, borderRadius: 10 },
  toggle: {
    width: 34,
    height: 20,
    borderRadius: 10,
    backgroundColor: PEDIU_TOKENS.success,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 2,
  },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF" },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A120C",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
