import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useAppPreferences } from "@/lib/app-preferences";

export const PEDIU = {
  coral: "#FF5A4F",
  coralSoft: "#FFF0EC",
  orange: "#FF8A3D",
  ink: "#163B48",
  text: "#18252B",
  muted: "#7C8A8F",
  canvas: "#FFF8F1",
  white: "#FFFFFF",
  line: "#F0E9E3",
  green: "#36B878",
  yellow: "#FFD166",
  peach: "#FFF0D7",
};

export function Page({ children, title, eyebrow, back = true, action }: { children: ReactNode; title: string; eyebrow?: string; back?: boolean; action?: ReactNode }) {
  const { theme } = useAppPreferences();
  return (
    <View style={[s.root, { backgroundColor: theme.canvas }]}>
      <View pointerEvents="none" style={[s.backgroundOrb, s.backgroundOrbOne]} />
      <View pointerEvents="none" style={[s.backgroundOrb, s.backgroundOrbTwo]} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          {back ? (
            <Pressable onPress={() => router.back()} style={s.back}>
              <MaterialIcons name="arrow-back" size={21} color={PEDIU.ink} />
            </Pressable>
          ) : (
            <View style={s.backPlaceholder} />
          )}
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={[s.eyebrow, { color: theme.primary }]}>{eyebrow}</Text> : null}
            <Text style={[s.title, { color: theme.ink }]}>{title}</Text>
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const { theme } = useAppPreferences();
  return <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.line }, style]}>{children}</View>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={PEDIU.muted}
        style={[s.input, props.multiline && { minHeight: 86, textAlignVertical: "top" }]}
      />
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) {
  const { theme } = useAppPreferences();
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [s.primary, { backgroundColor: theme.primary, shadowColor: theme.primary }, pressed && s.pressed, disabled && s.disabled]}>
      <Text style={s.primaryText}>{title}</Text>
      <MaterialIcons name="arrow-forward" size={18} color={PEDIU.white} />
    </Pressable>
  );
}

export function OutlineButton({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) {
  const { theme } = useAppPreferences();
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [s.outline, { borderColor: theme.primary }, pressed && s.pressed, disabled && s.disabled]}>
      <Text style={[s.outlineText, { color: theme.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Row({ icon, title, subtitle, onPress, right }: { icon: ComponentProps<typeof MaterialIcons>["name"]; title: string; subtitle?: string; onPress?: () => void; right?: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && s.rowPressed]}>
      <View style={s.icon}><MaterialIcons name={icon} size={20} color={PEDIU.ink} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}
      </View>
      {right ?? <MaterialIcons name="chevron-right" size={21} color={PEDIU.muted} />}
    </Pressable>
  );
}

export function ToggleRow({ icon, title, subtitle, value, onChange }: { icon: ComponentProps<typeof MaterialIcons>["name"]; title: string; subtitle?: string; value: boolean; onChange: (value: boolean) => void }) {
  return <Row icon={icon} title={title} subtitle={subtitle} right={<Pressable onPress={() => onChange(!value)} style={[s.toggle, value && s.toggleOn]}><View style={[s.knob, value && s.knobOn]} /></Pressable>} />;
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PEDIU.canvas },
  backgroundOrb: { position: "absolute", borderRadius: 999, opacity: 0.55 },
  backgroundOrbOne: { width: 230, height: 230, backgroundColor: "#FFE4D5", top: -85, right: -95 },
  backgroundOrbTwo: { width: 180, height: 180, backgroundColor: "#E0F2EA", bottom: 70, left: -115 },
  content: { padding: 20, paddingTop: 24, paddingBottom: 44, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  back: { width: 44, height: 44, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: PEDIU.line, shadowColor: PEDIU.ink, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  backPlaceholder: { width: 42 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3, color: PEDIU.coral },
  title: { fontSize: 28, fontWeight: "900", color: PEDIU.ink, letterSpacing: -0.8, marginTop: 2 },
  card: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 24, padding: 17, borderWidth: 1, borderColor: "rgba(240,233,227,0.9)", gap: 13, shadowColor: PEDIU.ink, shadowOpacity: 0.045, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: PEDIU.ink },
  body: { fontSize: 14, lineHeight: 21, color: PEDIU.text },
  label: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1, color: PEDIU.muted },
  input: { backgroundColor: PEDIU.canvas, borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: PEDIU.ink, fontSize: 14 },
  primary: { minHeight: 54, borderRadius: 18, backgroundColor: PEDIU.coral, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18, shadowColor: PEDIU.coral, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  primaryText: { color: PEDIU.white, fontSize: 14, fontWeight: "900" },
  outline: { minHeight: 44, borderRadius: 14, borderWidth: 1.5, borderColor: PEDIU.coral, alignItems: "center", justifyContent: "center", paddingHorizontal: 15 },
  outlineText: { color: PEDIU.coral, fontSize: 12, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 19, borderWidth: 1, borderColor: PEDIU.line, paddingHorizontal: 14, shadowColor: PEDIU.ink, shadowOpacity: 0.025, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  rowPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 13, fontWeight: "900", color: PEDIU.ink },
  muted: { fontSize: 12, lineHeight: 18, color: PEDIU.muted },
  toggle: { width: 42, height: 25, borderRadius: 13, backgroundColor: PEDIU.line, justifyContent: "center", padding: 3 },
  toggleOn: { backgroundColor: PEDIU.green },
  knob: { width: 19, height: 19, borderRadius: 10, backgroundColor: PEDIU.white },
  knobOn: { alignSelf: "flex-end" },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  disabled: { opacity: 0.45 },
});
