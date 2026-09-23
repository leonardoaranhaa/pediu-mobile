import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { APP_THEMES, useAppPreferences, type AppTheme } from "@/lib/app-preferences";
import { s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

function ThemeOption({ theme, selected, onPress }: { theme: AppTheme; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [{ borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: selected ? theme.primary : theme.line, backgroundColor: theme.canvas, gap: 11 }, pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] }]}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.ink, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 25, height: 25, borderRadius: 13, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}><Text style={{ color: theme.highlight, fontSize: 16, fontWeight: "900" }}>p</Text></View>
      </View>
      <View style={{ flex: 1, gap: 2 }}><Text style={{ color: theme.ink, fontSize: 14, fontWeight: "900" }}>{theme.label}</Text><Text style={{ color: theme.muted, fontSize: 11 }}>{theme.tagline}</Text></View>
      <View style={{ width: 25, height: 25, borderRadius: 13, borderWidth: 2, borderColor: selected ? theme.primary : theme.line, alignItems: "center", justifyContent: "center" }}>{selected ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: theme.primary }} /> : null}</View>
    </View>
    <View style={{ flexDirection: "row", gap: 7 }}><View style={{ flex: 1, height: 9, borderRadius: 5, backgroundColor: theme.primary }} /><View style={{ width: 42, height: 9, borderRadius: 5, backgroundColor: theme.highlight }} /><View style={{ width: 28, height: 9, borderRadius: 5, backgroundColor: theme.ink }} /></View>
  </Pressable>;
}

export function ThemePicker({ title = "Personalize sua experiência", description = "A escolha fica salva no seu perfil e também neste dispositivo." }: { title?: string; description?: string }) {
  const { user, isAuthenticated } = useAuth();
  const { themeId, setTheme, setThemeForUser } = useAppPreferences();
  const profileQuery = trpc.pediu.account.profile.mine.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const updateTheme = trpc.pediu.account.profile.theme.update.useMutation();

  useEffect(() => {
    const remoteTheme = profileQuery.data?.themePreference;
    if (remoteTheme === "classic" || remoteTheme === "ocean" || remoteTheme === "sunset") {
      if (user?.id) setThemeForUser(user.id, remoteTheme);
      else setTheme(remoteTheme);
    }
  }, [profileQuery.data?.themePreference, setTheme, setThemeForUser, user?.id]);

  const chooseTheme = (next: AppTheme["id"]) => {
    if (user?.id) setThemeForUser(user.id, next);
    else setTheme(next);
    if (isAuthenticated) updateTheme.mutate({ themeId: next });
  };

  return <View style={{ gap: 10 }}>
    <Text style={s.sectionTitle}>{title}</Text>
    <Text style={s.muted}>{description}</Text>
    {APP_THEMES.map((theme) => <ThemeOption key={theme.id} theme={theme} selected={theme.id === themeId} onPress={() => chooseTheme(theme.id)} />)}
  </View>;
}
