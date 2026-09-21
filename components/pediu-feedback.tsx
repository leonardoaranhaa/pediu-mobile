import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Card, PEDIU, PrimaryButton, s } from "./pediu-page";
import { FadeIn, Skeleton } from "./pediu-motion";

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return <FadeIn><Card><Skeleton width="42%" height={18} /><Skeleton width="88%" height={12} /><Skeleton width="70%" height={12} /><Text style={s.muted}>{label}</Text></Card></FadeIn>;
}

export function EmptyState({ icon = "inbox", title, description }: { icon?: keyof typeof MaterialIcons.glyphMap; title: string; description: string }) {
  return <FadeIn><Card style={{ alignItems: "center", paddingVertical: 28 }}><View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: PEDIU.coralSoft, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={icon} size={25} color={PEDIU.coral} /></View><Text style={s.sectionTitle}>{title}</Text><Text style={[s.muted, { textAlign: "center" }]}>{description}</Text></Card></FadeIn>;
}

export function ErrorState({ title = "Não foi possível carregar", description = "Tente novamente em alguns instantes.", onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return <FadeIn><Card><Text style={s.sectionTitle}>{title}</Text><Text style={s.muted}>{description}</Text>{onRetry ? <PrimaryButton title="Tentar novamente" onPress={onRetry} /> : null}</Card></FadeIn>;
}
