import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SellerDock } from "@/components/seller-dock";
import { OpeningHoursEditor } from "@/components/opening-hours-editor";
import { PinMap } from "@/components/pin-map";
import { useAuth } from "@/hooks/use-auth";
import { geocodeTypedAddress } from "@/lib/location";
import { trpc } from "@/lib/trpc";
import { Card, Page, PrimaryButton, Row, s } from "@/components/pediu-page";
import { ThemePicker } from "@/components/theme-picker";

export default function SellerSettingsPage() {
  const { user, logout } = useAuth();
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: Boolean(user) });
  const [saved, setSaved] = useState("");
  const update = trpc.pediu.stores.update.useMutation();
  const deliverySettings = trpc.pediu.stores.deliverySettings.useMutation();
  const pauseStore = trpc.pediu.stores.pause.useMutation({
    onSuccess: () => void store.refetch(),
  });
  const resumeStore = trpc.pediu.stores.resume.useMutation({
    onSuccess: () => void store.refetch(),
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0,00");
  const [feePerKm, setFeePerKm] = useState("0,00");
  const [radiusKm, setRadiusKm] = useState("10,00");
  const [feeMode, setFeeMode] = useState<"fixed" | "distance">("fixed");
  const [cardCredit, setCardCredit] = useState(false);
  const [cardDebit, setCardDebit] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pinKey, setPinKey] = useState(0);
  const [hoursJson, setHoursJson] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapMessage, setMapMessage] = useState("");

  useEffect(() => {
    setName(store.data?.name ?? "");
    setPhone(store.data?.phone ?? "");
    setAddress(store.data?.address ?? "");
    setPixKey(store.data?.pixKey ?? "");
    setDeliveryFee((store.data?.deliveryFee ?? "0,00").replace(".", ","));
    setFeePerKm((store.data?.feePerKm ?? "0,00").replace(".", ","));
    setRadiusKm((store.data?.deliveryRadiusKm ?? "10,00").replace(".", ","));
    setFeeMode(store.data?.feeMode === "distance" ? "distance" : "fixed");
    setCardCredit(Boolean(store.data?.cardCreditEnabled));
    setCardDebit(Boolean(store.data?.cardDebitEnabled));
    setIsOpen(Boolean(store.data?.isOpen));
    const latitude = store.data?.latitude == null ? Number.NaN : Number(store.data.latitude);
    const longitude = store.data?.longitude == null ? Number.NaN : Number(store.data.longitude);
    setPin(
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null,
    );
  }, [
    store.data?.id,
    store.data?.name,
    store.data?.phone,
    store.data?.address,
    store.data?.pixKey,
    store.data?.deliveryFee,
    store.data?.deliveryRadiusKm,
    store.data?.feeMode,
    store.data?.feePerKm,
    store.data?.cardCreditEnabled,
    store.data?.cardDebitEnabled,
    store.data?.isOpen,
    store.data?.latitude,
    store.data?.longitude,
  ]);

  if (!store.data) {
    return <Page title="Configurações da loja" eyebrow="MINHA OPERAÇÃO" dock={<SellerDock active="settings" />}><Card><Text style={s.sectionTitle}>Cadastre sua loja primeiro</Text><Text style={s.muted}>As configurações comerciais ficam disponíveis depois do onboarding.</Text></Card></Page>;
  }

  const locate = async () => {
    setMapMessage("");
    setLocating(true);
    try {
      const point = await geocodeTypedAddress(`${address}, Brasil`);
      if (!point) {
        setMapMessage("Não achamos esse endereço. Confira rua, número e cidade.");
        return;
      }
      setPin(point);
      setPinKey((value) => value + 1);
    } catch {
      setMapMessage("Não foi possível consultar o mapa agora.");
    } finally {
      setLocating(false);
    }
  };

  const save = () => {
    const fee = deliveryFee.replace(",", ".").trim();
    const perKm = feePerKm.replace(",", ".").trim();
    const radius = radiusKm.replace(",", ".").trim();
    if (
      name.trim().length < 2 ||
      !/^\d+(\.\d{1,2})?$/.test(fee) ||
      !/^\d+(\.\d{1,2})?$/.test(perKm) ||
      !/^\d+(\.\d{1,2})?$/.test(radius) ||
      Number(radius) <= 0
    ) {
      setSaved("Confira o nome, a taxa e o raio de entrega.");
      return;
    }
    if (feeMode === "distance" && perKm === "") {
      setSaved("Informe o valor por quilômetro.");
      return;
    }
    setSaved("");
    update.mutate(
      {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        pixKey: pixKey.trim() || undefined,
        deliveryFee: fee,
        deliveryRadiusKm: Number(radius).toFixed(2),
        isOpen,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
        ...(hoursJson ? { openingHours: hoursJson } : {}),
      },
      {
        onSuccess: () => {
          deliverySettings.mutate(
            {
              cardCreditEnabled: cardCredit,
              cardDebitEnabled: cardDebit,
              feeMode,
              feePerKm: Number(perKm).toFixed(2),
            },
            {
              onSuccess: () => {
                setSaved("Salvo");
                void store.refetch();
              },
              onError: (error) => setSaved(error.message),
            },
          );
        },
        onError: (error) => setSaved(error.message),
      },
    );
  };

  return <Page title="Configurações da loja" eyebrow="MINHA OPERAÇÃO" dock={<SellerDock active="settings" />}>
    <Card>
      <Text style={s.sectionTitle}>Dados publicados</Text>
      <Field label="NOME DA LOJA" value={name} onChangeText={setName} placeholder="Nome do seu negócio" />
      <Field label="WHATSAPP / TELEFONE" value={phone} onChangeText={setPhone} placeholder="(11) 99999-9999" keyboardType="phone-pad" />
      <Field label="ENDEREÇO" value={address} onChangeText={setAddress} placeholder="Rua, número e bairro" />
      <Pressable onPress={() => void locate()}><Text style={{ color: PEDIU.coral, fontWeight: "900" }}>{locating ? "Procurando no mapa..." : "Ver endereço no mapa"}</Text></Pressable>
      {pin ? <PinMap latitude={pin.latitude} longitude={pin.longitude} anchorKey={`${store.data.id}-${pinKey}`} label="Loja" onChange={setPin} /> : null}
      {mapMessage ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{mapMessage}</Text> : null}
      <Text style={s.muted}>Arraste o ponto até a porta da loja. Não precisa digitar latitude nem longitude.</Text>
      <OpeningHoursEditor key={store.data.id} initial={store.data.openingHours} onChange={setHoursJson} />
      <Field label="CHAVE PIX" value={pixKey} onChangeText={setPixKey} placeholder="CPF, telefone ou e-mail" />
      <Text style={s.label}>COMO COBRAR A ENTREGA</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => setFeeMode("fixed")} style={{ flex: 1, borderWidth: 1, borderColor: feeMode === "fixed" ? PEDIU.coral : PEDIU.line, backgroundColor: feeMode === "fixed" ? "#FFE8E4" : PEDIU.white, borderRadius: 12, padding: 10 }}>
          <Text style={{ color: feeMode === "fixed" ? PEDIU.coral : PEDIU.muted, fontWeight: "900", textAlign: "center" }}>Taxa fixa</Text>
        </Pressable>
        <Pressable onPress={() => setFeeMode("distance")} style={{ flex: 1, borderWidth: 1, borderColor: feeMode === "distance" ? PEDIU.coral : PEDIU.line, backgroundColor: feeMode === "distance" ? "#FFE8E4" : PEDIU.white, borderRadius: 12, padding: 10 }}>
          <Text style={{ color: feeMode === "distance" ? PEDIU.coral : PEDIU.muted, fontWeight: "900", textAlign: "center" }}>Por distância</Text>
        </Pressable>
      </View>
      <Field label="VALOR FIXO" value={deliveryFee} onChangeText={setDeliveryFee} placeholder="0,00" keyboardType="decimal-pad" />
      {feeMode === "distance" ? <Field label="VALOR POR KM" value={feePerKm} onChangeText={setFeePerKm} placeholder="2,00" keyboardType="decimal-pad" /> : null}
      <Field label="RAIO MÁXIMO (KM)" value={radiusKm} onChangeText={setRadiusKm} placeholder="10,00" keyboardType="decimal-pad" />
      <Text style={s.muted}>{feeMode === "distance" ? "O cliente paga o valor fixo mais o quilômetro até o endereço, dentro do raio." : "O mesmo valor para qualquer endereço dentro do raio."}</Text>
      <ToggleRow title={cardCredit ? "Crédito na entrega ligado" : "Crédito na entrega"} subtitle="A maquininha cobra no crédito quando o pedido chega" on={cardCredit} onPress={() => setCardCredit((value) => !value)} />
      <ToggleRow title={cardDebit ? "Débito na entrega ligado" : "Débito na entrega"} subtitle="A maquininha cobra no débito quando o pedido chega" on={cardDebit} onPress={() => setCardDebit((value) => !value)} />
      <ToggleRow title={isOpen ? "Loja aberta" : "Loja fechada"} subtitle="Define se a loja aparece para quem pede" on={isOpen} onPress={() => setIsOpen((value) => !value)} />
      <Text style={s.sectionTitle}>Pausar por um tempo</Text>
      <Text style={s.muted}>{store.data.paused ? (store.data.pauseMessage ?? "Fechada no momento") : "A loja continua no ar, mas ninguém consegue pedir até voltar."}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {store.data.paused ? (
          <Pressable onPress={() => resumeStore.mutate()} style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: PEDIU.green }}>
            <Text style={{ color: PEDIU.white, fontWeight: "900" }}>{resumeStore.isPending ? "Reabrindo..." : "Reabrir agora"}</Text>
          </Pressable>
        ) : (
          <>
            {([15, 30, 60] as const).map((minutes) => (
              <Pressable key={minutes} onPress={() => pauseStore.mutate({ minutes })} style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: PEDIU.canvas }}>
                <Text style={{ color: PEDIU.ink, fontWeight: "900" }}>{minutes} min</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => pauseStore.mutate({ manual: true })} style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: PEDIU.canvas }}>
              <Text style={{ color: PEDIU.ink, fontWeight: "900" }}>Até eu reabrir</Text>
            </Pressable>
          </>
        )}
      </View>
      {pauseStore.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{pauseStore.error.message}</Text> : null}
      {saved ? <Text style={{ color: saved === "Salvo" ? "#0B8A5C" : PEDIU.coral, fontSize: 13, fontWeight: "800" }}>{saved}</Text> : null}
      {update.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{update.error.message}</Text> : null}
      <PrimaryButton title={update.isPending ? "Salvando..." : "Salvar configurações"} disabled={update.isPending} onPress={save} />
    </Card>
    <Card><ThemePicker title="Personalize o painel da loja" description="A mesma identidade visual do Pediu fica disponível para cliente e lojista." /></Card>
    <Card>
      <Row icon="auto-awesome" title="Assistente do Pediu" subtitle="Atalhos para vendas, fiado, catálogo e divulgação" onPress={() => router.replace({ pathname: "/(tabs)", params: { assistant: "seller" } } as never)} />
      <Row icon="inventory-2" title="Catálogo" subtitle="Produtos, preços e disponibilidade" onPress={() => router.push("/seller/catalog")} />
      <Row icon="people" title="Clientes e fiado" subtitle="Crédito e histórico por cliente" onPress={() => router.push("/seller/clients")} />
      <Row icon="receipt-long" title="Vendas" subtitle="Histórico e formas de pagamento" onPress={() => router.push("/seller/sales")} />
    </Card>
    <Card>
      <Row icon="person" title="Minha conta" subtitle="Perfil, senha e sair" onPress={() => router.push("/account/profile")} />
      <Row icon="tune" title="Configurações avançadas" subtitle="Diagnóstico e preferências" onPress={() => router.push("/account/settings/advanced")} />
      <Row
        icon="logout"
        title="Sair da conta"
        subtitle="Volta para a tela de entrada"
        onPress={() =>
          Alert.alert("Sair da conta?", "Você volta para a tela de entrada.", [
            { text: "Continuar conectado", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: () => void logout() },
          ])
        }
      />
    </Card>
  </Page>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "phone-pad" | "decimal-pad" }) {
  return <View style={{ gap: 7 }}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={PEDIU.muted} keyboardType={keyboardType} style={s.input} /></View>;
}

function ToggleRow({ title, subtitle, on, onPress }: { title: string; subtitle: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 }}>
      <View style={{ flex: 1 }}><Text style={s.rowTitle}>{title}</Text><Text style={s.muted}>{subtitle}</Text></View>
      <View style={{ width: 42, height: 25, borderRadius: 13, backgroundColor: on ? PEDIU.green : PEDIU.line, justifyContent: "center", padding: 3 }}><View style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: PEDIU.white, alignSelf: on ? "flex-end" : "flex-start" }} /></View>
    </Pressable>
  );
}

const PEDIU = { coral: "#FF5A4F", muted: "#7C8A8F", line: "#F0E9E3", green: "#36B878", white: "#FFFFFF", ink: "#1C140F", canvas: "#F6F1EC" };
