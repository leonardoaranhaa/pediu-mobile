import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <View style={{ gap: 8 }}><Text style={s.label}>{label}</Text><View style={{ flexDirection: "row", gap: 8 }}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => onChange(n)}><Text style={{ fontSize: 30, color: n <= value ? PEDIU.coral : PEDIU.line }}>★</Text></Pressable>)}</View></View>;
}

export default function FeedbackScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const id = Number(orderId);
  const { user } = useAuth();
  const [store, setStore] = useState(0);
  const [product, setProduct] = useState(0);
  const [driver, setDriver] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const submit = trpc.pediu.experience.reviews.create.useMutation();

  const send = async () => {
    if (!store || !product || !Number.isInteger(id) || id <= 0) return;
    const note = comment.trim() || undefined;
    await submit.mutateAsync({ orderId: id, target: "store", rating: store, comment: note, idempotencyKey: `review-${id}-store` });
    await submit.mutateAsync({ orderId: id, target: "product", rating: product, comment: note, idempotencyKey: `review-${id}-product` });
    if (driver) await submit.mutateAsync({ orderId: id, target: "courier", rating: driver, comment: note, idempotencyKey: `review-${id}-courier` });
    setSent(true);
  };

  if (!user) return <Page title="Avaliação" eyebrow={`PEDIDO #${orderId}`}><Card><Text style={s.sectionTitle}>Entre para avaliar seu pedido</Text><Text style={s.muted}>A avaliação fica vinculada ao cliente autenticado e só pode ser enviada após a entrega.</Text></Card></Page>;

  if (sent) return <Page title="Avaliação enviada" eyebrow={`PEDIDO #${orderId}`}><Card><Text style={{ fontSize: 38, color: PEDIU.green }}>★</Text><Text style={s.sectionTitle}>Obrigado pelo feedback</Text><Text style={s.body}>Sua avaliação ajuda a melhorar a experiência no Pediu.</Text></Card><PrimaryButton title="Acompanhar pedido" onPress={() => router.replace(`/order/${orderId}/tracking-map` as never)} /><OutlineButton title="Voltar para descobrir" onPress={() => router.replace("/(tabs)" as never)} /></Page>;

  return <Page title="Como foi seu pedido?" eyebrow={`PEDIDO #${orderId}`} back>
    <Card><Rating label="Estabelecimento" value={store} onChange={setStore} /><Rating label="Produtos" value={product} onChange={setProduct} /><Rating label="Entregador (opcional)" value={driver} onChange={setDriver} /><TextInput value={comment} onChangeText={setComment} placeholder="Conte como foi sua experiência (opcional)" multiline style={{ minHeight: 100, borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, textAlignVertical: "top", color: PEDIU.text }} />{submit.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{submit.error.message}</Text> : null}<PrimaryButton title={submit.isPending ? "Enviando..." : "Enviar avaliação"} onPress={() => void send()} disabled={!store || !product || submit.isPending} /></Card>
  </Page>;
}
