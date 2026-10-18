import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STEPS = [
  { title: "Sua loja já está no mapa.", body: "O nome fantasia é o que o cliente vê." },
  { title: "O cardápio mora aqui.", body: "Cadastre o primeiro produto na aba Cardápio." },
  { title: "Pedido novo cai aqui e o celular avisa.", body: "A fila de pedidos avisa enquanto o aplicativo estiver aberto." },
  { title: "Anúncio fica aqui e gasta créditos da loja.", body: "Cada imagem usa um crédito. Publicar no Explorar não gasta outro." },
  { title: "Horário, raio, motoboy e PIX ficam em Ajustes.", body: "É lá que a entrega e o repasse se acertam." },
];

export function StoreTour({
  userId,
  storeName,
}: {
  userId: number;
  storeName: string;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<number | null>(null);
  const key = `pediu:store-tour:${userId}`;

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key).then((value) => {
      if (active && value !== "done") setStep(0);
    });
    return () => {
      active = false;
    };
  }, [key]);

  const finish = () => {
    setStep(null);
    void AsyncStorage.setItem(key, "done");
  };

  if (step === null) return null;
  const current = STEPS[step];
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 12) + 88,
        backgroundColor: "#1C140F",
        borderRadius: 20,
        padding: 16,
        gap: 8,
        zIndex: 40,
      }}
    >
      <Text style={{ color: "#F6C445", fontWeight: "800", fontSize: 12 }}>
        PASSO {step + 1} DE 5 · {storeName}
      </Text>
      <Text style={{ color: "#FFF8F2", fontSize: 18, fontWeight: "900" }}>{current.title}</Text>
      <Text style={{ color: "#F3E6D8", fontSize: 14 }}>{current.body}</Text>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
        <Pressable onPress={finish}>
          <Text style={{ color: "#F3E6D8", fontWeight: "700" }}>Pular</Text>
        </Pressable>
        <Pressable onPress={() => (step === STEPS.length - 1 ? finish() : setStep(step + 1))}>
          <Text style={{ color: "#F6C445", fontWeight: "800" }}>
            {step === STEPS.length - 1 ? "Concluir" : "Próximo"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
