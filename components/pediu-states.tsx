import { MaterialIcons } from "@expo/vector-icons";
import { View, Text, ActivityIndicator } from "react-native";
import { PEDIU, s } from "./pediu-page";

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return <View accessible accessibilityLabel={label} style={{ alignItems: "center", justifyContent: "center", padding: 28, gap: 10 }}><ActivityIndicator color={PEDIU.coral} /><Text style={s.muted}>{label}</Text></View>;
}
export function EmptyState({ icon = "search-off", title, description }: { icon?: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; description?: string }) {
  return <View style={{ alignItems: "center", justifyContent: "center", padding: 30, gap: 9 }}><MaterialIcons name={icon} size={34} color={PEDIU.muted} /><Text style={s.sectionTitle}>{title}</Text>{description ? <Text style={[s.muted, { textAlign: "center" }]}>{description}</Text> : null}</View>;
}
export function ErrorState({ title = "Algo deu errado", description = "Tente novamente em instantes." }: { title?: string; description?: string }) {
  return <View accessible accessibilityRole="alert" style={{ alignItems: "center", justifyContent: "center", padding: 30, gap: 9 }}><MaterialIcons name="error-outline" size={34} color={PEDIU.coral} /><Text style={s.sectionTitle}>{title}</Text><Text style={[s.muted, { textAlign: "center" }]}>{description}</Text></View>;
}
