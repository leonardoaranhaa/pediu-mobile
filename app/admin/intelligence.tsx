import { useState } from "react";
import { Text } from "react-native";
import { Card, Field, OutlineButton, Page, PrimaryButton, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

export default function AdminIntelligencePage() {
  const status = trpc.admin.intelligence.useQuery();
  const update = trpc.admin.intelligenceUpdate.useMutation({
    onSuccess: () => void status.refetch(),
  });
  const review = trpc.admin.adsReview.useQuery();
  const resolve = trpc.admin.adResolve.useMutation({
    onSuccess: () => void review.refetch(),
  });
  const [textModel, setTextModel] = useState("");
  const [imageModel, setImageModel] = useState("");
  const [speechModel, setSpeechModel] = useState("");
  const [creditPrice, setCreditPrice] = useState("");
  const [dailyCap, setDailyCap] = useState("");

  const data = status.data;
  const ready =
    textModel.trim() &&
    imageModel.trim() &&
    speechModel.trim() &&
    creditPrice.trim() &&
    dailyCap.trim();

  return (
    <Page title="Inteligência e créditos" eyebrow="OPERAÇÃO" back>
      <Card>
        <Text style={s.sectionTitle}>O que está ligado</Text>
        <Text style={s.body}>
          Inteligência artificial: {data?.ai ?? "carregando"}
        </Text>
        <Text style={s.body}>
          PIX dos créditos: {data?.payments ?? "carregando"}
        </Text>
        {data ? (
          <Text style={s.muted}>
            Texto {data.textModel}. Imagem {data.imageModel}, qualidade {data.imageQuality}. Voz {data.speechModel}. Cada crédito custa R$ {String(data.creditPrice).replace(".", ",")}. Limite de {data.dailyCap} anúncios por loja a cada 24 horas.
          </Text>
        ) : null}
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Ajustar modelos e preço</Text>
        <Text style={s.muted}>A chave não aparece aqui. Dá para ajustar o modelo, o preço do crédito e o limite do dia.</Text>
        <Field label="Modelo de texto" value={textModel} onChangeText={setTextModel} placeholder={data?.textModel ?? "gpt-5-mini"} autoCapitalize="none" />
        <Field label="Modelo de imagem" value={imageModel} onChangeText={setImageModel} placeholder={data?.imageModel ?? "gpt-image-2"} autoCapitalize="none" />
        <Field label="Modelo de voz" value={speechModel} onChangeText={setSpeechModel} placeholder={data?.speechModel ?? "whisper-1"} autoCapitalize="none" />
        <Field label="Preço de 1 crédito em reais" value={creditPrice} onChangeText={setCreditPrice} placeholder={data ? String(data.creditPrice) : "1.00"} keyboardType="decimal-pad" />
        <Field label="Limite diário por loja" value={dailyCap} onChangeText={setDailyCap} placeholder={data ? String(data.dailyCap) : "40"} keyboardType="number-pad" />
        {update.error ? <Text style={s.muted}>{update.error.message}</Text> : null}
        <PrimaryButton
          title={update.isPending ? "Salvando..." : "Salvar"}
          disabled={!ready || update.isPending}
          onPress={() =>
            update.mutate({
              textModel: textModel.trim(),
              imageModel: imageModel.trim(),
              imageQuality: "medium",
              speechModel: speechModel.trim(),
              creditPrice: creditPrice.replace(",", "."),
              dailyCap: Number(dailyCap),
            })
          }
        />
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Anúncios em análise</Text>
        {(review.data ?? []).length === 0 ? <Text style={s.muted}>Nenhum anúncio esperando.</Text> : null}
        {(review.data ?? []).map((ad) => (
          <Card key={ad.id}>
            <Text style={s.sectionTitle}>{ad.headline}</Text>
            <Text style={s.muted}>{ad.moderationNote || "Aguardando decisão."}</Text>
            <PrimaryButton title="Publicar" onPress={() => resolve.mutate({ adId: ad.id, storeId: ad.storeId, decision: "publish" })} />
            <OutlineButton title="Tirar do ar" onPress={() => resolve.mutate({ adId: ad.id, storeId: ad.storeId, decision: "archive" })} />
          </Card>
        ))}
      </Card>
    </Page>
  );
}
