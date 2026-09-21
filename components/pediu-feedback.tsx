import { MaterialIcons } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";
import { Card, PEDIU, PrimaryButton, s } from "./pediu-page";
import { FadeIn, Skeleton } from "./pediu-motion";

export function AsyncFeedback({ state, title, message, onRetry }: { state: "loading" | "success" | "error" | "empty"; title?: string; message?: string; onRetry?: () => void }) {
  if (state === "loading") return <FadeIn><Card><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><ActivityIndicator color={PEDIU.coral} /><Text style={s.muted}>{title ?? "Carregando..."}</Text></View><Skeleton width="88%" height={10} /><Skeleton width="68%" height={10} /></Card></FadeIn>;
  const config = {
    success: { icon: "check-circle" as const, color: PEDIU.green, fallback: "Tudo certo" },
    error: { icon: "error-outline" as const, color: PEDIU.coral, fallback: "Não foi possível concluir" },
    empty: { icon: "inbox" as const, color: PEDIU.muted, fallback: "Nada por aqui ainda" },
  }[state];
  return <FadeIn><Card style={{ alignItems: "center", paddingVertical: 28 }}>
    <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: state === "error" ? PEDIU.coralSoft : PEDIU.canvas, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={config.icon} size={27} color={config.color} /></View>
    <Text style={s.sectionTitle}>{title ?? config.fallback}</Text>
    {message ? <Text style={[s.muted, { textAlign: "center" }]}>{message}</Text> : null}
    {state === "error" && onRetry ? <PrimaryButton title="Tentar novamente" onPress={onRetry} /> : null}
  </Card></FadeIn>;
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) { return <AsyncFeedback state="loading" title={label} />; }
export function EmptyState({ icon = "inbox", title, description }: { icon?: keyof typeof MaterialIcons.glyphMap; title: string; description: string }) { return <AsyncFeedback state="empty" title={title} message={description} />; }
export function ErrorState({ title = "Não foi possível carregar", description = "Tente novamente em alguns instantes.", onRetry }: { title?: string; description?: string; onRetry?: () => void }) { return <AsyncFeedback state="error" title={title} message={description} onRetry={onRetry} />; }
