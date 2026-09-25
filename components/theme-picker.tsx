import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { PediuMascot } from "@/components/pediu-mascot";
import { PEDIU, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { APP_THEMES, useAppPreferences, type AppMascotStyle, type AppTheme } from "@/lib/app-preferences";
import { trpc } from "@/lib/trpc";

function ThemeOption({ theme, selected, onPress }: { theme: AppTheme; selected: boolean; onPress: () => void }) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: selected ? 1 : 0, duration: 230, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, selected]);

  return <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.84 }]}>
    <Animated.View style={{ borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: selected ? theme.primary : theme.line, backgroundColor: theme.canvas, gap: 11, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.ink, alignItems: "center", justifyContent: "center" }}><View style={{ width: 25, height: 25, borderRadius: 13, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}><Text style={{ color: theme.highlight, fontSize: 16, fontWeight: "900" }}>p</Text></View></View>
        <View style={{ flex: 1, gap: 2 }}><Text style={{ color: theme.ink, fontSize: 14, fontWeight: "900" }}>{theme.label}</Text><Text style={{ color: theme.muted, fontSize: 11 }}>{theme.tagline}</Text></View>
        <View style={{ width: 25, height: 25, borderRadius: 13, borderWidth: 2, borderColor: selected ? theme.primary : theme.line, alignItems: "center", justifyContent: "center" }}>{selected ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: theme.primary }} /> : null}</View>
      </View>
      <View style={{ flexDirection: "row", gap: 7 }}><View style={{ flex: 1, height: 9, borderRadius: 5, backgroundColor: theme.primary }} /><View style={{ width: 42, height: 9, borderRadius: 5, backgroundColor: theme.highlight }} /><View style={{ width: 28, height: 9, borderRadius: 5, backgroundColor: theme.ink }} /></View>
    </Animated.View>
  </Pressable>;
}

function MascotStyleOption({ id, selected, theme, onPress }: { id: AppMascotStyle; selected: boolean; theme: AppTheme; onPress: () => void }) {
  const labels: Record<AppMascotStyle, { title: string; subtitle: string; icon: "favorite" | "water-drop" | "wb-sunny" }> = {
    classic: { title: "Pediu original", subtitle: "Coral e acolhedor", icon: "favorite" },
    ocean: { title: "Pediu onda", subtitle: "Fresco e vibrante", icon: "water-drop" },
    sunset: { title: "Pediu pôr do sol", subtitle: "Doce e criativo", icon: "wb-sunny" },
  };
  const option = labels[id];
  return <Pressable onPress={onPress} style={{ flex: 1, minWidth: "30%", borderWidth: 1.5, borderColor: selected ? theme.primary : theme.line, backgroundColor: selected ? theme.primarySoft : theme.card, borderRadius: 16, padding: 10, gap: 7 }}><MaterialIcons name={option.icon} size={18} color={selected ? theme.primary : theme.muted} /><Text style={{ color: theme.ink, fontSize: 11, fontWeight: "900" }}>{option.title}</Text><Text style={{ color: theme.muted, fontSize: 10, lineHeight: 14 }}>{option.subtitle}</Text></Pressable>;
}

function PreferenceToggle({ icon, title, subtitle, value, theme, onChange }: { icon: "auto-awesome" | "animation" | "lightbulb"; title: string; subtitle: string; value: boolean; theme: AppTheme; onChange: (value: boolean) => void }) {
  return <Pressable onPress={() => onChange(!value)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11 }, pressed && { opacity: 0.78 }]}><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: value ? theme.primarySoft : theme.canvas, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={icon} size={19} color={value ? theme.primary : theme.muted} /></View><View style={{ flex: 1, gap: 2 }}><Text style={{ color: theme.ink, fontSize: 13, fontWeight: "900" }}>{title}</Text><Text style={{ color: theme.muted, fontSize: 11, lineHeight: 15 }}>{subtitle}</Text></View><View style={{ width: 45, height: 27, borderRadius: 15, backgroundColor: value ? theme.primary : theme.line, padding: 3, justifyContent: "center" }}><View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: PEDIU.white, alignSelf: value ? "flex-end" : "flex-start" }} /></View></Pressable>;
}

export function ThemePicker({ title = "Personalize sua experiência", description = "Escolha cores, movimento e o jeitinho do mascote Pediu." }: { title?: string; description?: string }) {
  const { user, isAuthenticated } = useAuth();
  const { themeId, theme, setTheme, setThemeForUser, customization, updateCustomization, resetCustomization } = useAppPreferences();
  const profileQuery = trpc.pediu.account.profile.mine.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const updateTheme = trpc.pediu.account.profile.theme.update.useMutation();
  const [visible, setVisible] = useState(false);
  const modalProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const remoteTheme = profileQuery.data?.themePreference;
    if (remoteTheme === "classic" || remoteTheme === "ocean" || remoteTheme === "sunset") {
      if (user?.id) setThemeForUser(user.id, remoteTheme);
      else setTheme(remoteTheme);
    }
  }, [profileQuery.data?.themePreference, setTheme, setThemeForUser, user?.id]);

  useEffect(() => {
    if (!visible) return;
    modalProgress.setValue(0);
    Animated.timing(modalProgress, { toValue: 1, duration: 290, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [modalProgress, visible]);

  const chooseTheme = (next: AppTheme["id"]) => {
    if (user?.id) setThemeForUser(user.id, next);
    else setTheme(next);
    if (isAuthenticated) updateTheme.mutate({ themeId: next });
  };

  const close = () => {
    Animated.timing(modalProgress, { toValue: 0, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setVisible(false));
  };

  return <View style={{ gap: 11 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}><View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="tune" size={22} color={theme.primary} /></View><View style={{ flex: 1, gap: 2 }}><Text style={s.sectionTitle}>{title}</Text><Text style={s.muted}>{description}</Text></View><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} /></View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.canvas, borderRadius: 16, padding: 10 }}><PediuMascot theme={theme} styleId={customization.mascotStyle} motionEnabled={customization.motionEnabled} compact /><View style={{ flex: 1, gap: 3 }}><Text style={{ color: theme.ink, fontSize: 13, fontWeight: "900" }}>{theme.label}</Text><Text style={s.muted}>{customization.mascotEnabled ? "Mascote ativo" : "Mascote discreto"} · toque para ajustar</Text></View><Pressable onPress={() => setVisible(true)} style={{ backgroundColor: theme.ink, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 }}><Text style={{ color: PEDIU.white, fontSize: 11, fontWeight: "900" }}>Abrir</Text></Pressable></View>
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(11,28,34,0.58)" }}>
        <Animated.View style={{ width: "100%", maxHeight: "92%", flexShrink: 1, overflow: "hidden", backgroundColor: theme.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 11, paddingBottom: 24, transform: [{ translateY: modalProgress.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] }}>
          <View style={{ alignItems: "center", paddingBottom: 9 }}><View style={{ width: 48, height: 5, borderRadius: 4, backgroundColor: theme.line }} /></View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}><View><Text style={{ color: theme.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>ESTÚDIO DO PEDIU</Text><Text style={{ color: theme.ink, fontSize: 23, fontWeight: "900", marginTop: 2 }}>Do seu jeito.</Text></View><Pressable onPress={close} style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: theme.canvas, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="close" size={20} color={theme.ink} /></Pressable></View>
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingTop: 10, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.ink, borderRadius: 21, padding: 13, gap: 10, minHeight: 136, overflow: "visible" }}><PediuMascot theme={theme} styleId={customization.mascotStyle} reaction={customization.mascotEnabled ? "happy" : "idle"} motionEnabled={customization.motionEnabled} showSpeech speechText={customization.mascotEnabled ? "Obaaa! Escolha sua vibe." : "Fico quietinho por aqui."} /><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={{ color: theme.highlight, fontSize: 10, fontWeight: "900", letterSpacing: 1 }}>PREVIEW VIVO</Text><Text numberOfLines={3} style={{ color: PEDIU.white, fontSize: 16, lineHeight: 20, fontWeight: "900", flexShrink: 1 }}>{customization.mascotEnabled ? "Seu Pediu está pronto para acompanhar você." : "O Pediu fica mais discreto, mas continua funcionando."}</Text><Text numberOfLines={3} style={{ color: "#BCD0D1", fontSize: 11, lineHeight: 16 }}>{customization.mascotEnabled ? "Ele reage quando você escolhe seus itens." : "Você pode reativar o mascote quando quiser."}</Text></View></View>
            <View style={{ gap: 9 }}><Text style={s.sectionTitle}>Paleta do aplicativo</Text>{APP_THEMES.map((item) => <ThemeOption key={item.id} theme={item} selected={item.id === themeId} onPress={() => chooseTheme(item.id)} />)}</View>
            <View style={{ gap: 9 }}><Text style={s.sectionTitle}>Personalidade do mascote</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["classic", "ocean", "sunset"] as AppMascotStyle[]).map((id) => <MascotStyleOption key={id} id={id} theme={theme} selected={customization.mascotStyle === id} onPress={() => updateCustomization({ mascotStyle: id })} />)}</View></View>
            <View style={{ borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 5 }}><PreferenceToggle icon="auto-awesome" title="Mascote do Pediu" subtitle="Uma carinha que acompanha suas escolhas." value={customization.mascotEnabled} theme={theme} onChange={(value) => updateCustomization({ mascotEnabled: value })} /><PreferenceToggle icon="animation" title="Movimento suave" subtitle="Flutuação e reações animadas, sem exagero." value={customization.motionEnabled} theme={theme} onChange={(value) => updateCustomization({ motionEnabled: value })} /><PreferenceToggle icon="lightbulb" title="Dicas contextuais" subtitle="Pequenos lembretes para aproveitar melhor o app." value={customization.showHints} theme={theme} onChange={(value) => updateCustomization({ showHints: value })} /></View>
            <Pressable onPress={resetCustomization} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10 }}><MaterialIcons name="restart-alt" size={17} color={theme.primary} /><Text style={{ color: theme.primary, fontSize: 12, fontWeight: "900" }}>Restaurar personalização do Pediu</Text></Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  </View>;
}
