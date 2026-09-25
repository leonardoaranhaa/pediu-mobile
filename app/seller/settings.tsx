import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Card, Page, PrimaryButton, Row, s } from "@/components/pediu-page";
import { ThemePicker } from "@/components/theme-picker";

export default function SellerSettingsPage() {
  const { user } = useAuth();
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: user?.role === "merchant" });
  const update = trpc.pediu.stores.update.useMutation({ onSuccess: () => void store.refetch() });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0.00");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setName(store.data?.name ?? "");
    setPhone(store.data?.phone ?? "");
    setAddress(store.data?.address ?? "");
    setPixKey(store.data?.pixKey ?? "");
    setDeliveryFee(store.data?.deliveryFee ?? "0.00");
    setIsOpen(Boolean(store.data?.isOpen));
  }, [store.data?.id, store.data?.name, store.data?.phone, store.data?.address, store.data?.pixKey, store.data?.deliveryFee, store.data?.isOpen]);

  if (!store.data) {
    return <Page title="Configurações da loja" eyebrow="MINHA OPERAÇÃO"><Card><Text style={s.sectionTitle}>Cadastre sua loja primeiro</Text><Text style={s.muted}>As configurações comerciais ficam disponíveis depois do onboarding.</Text></Card></Page>;
  }

  const save = () => {
    const fee = deliveryFee.replace(",", ".").trim();
    if (name.trim().length < 2 || !/^\d+(\.\d{1,2})?$/.test(fee)) return;
    update.mutate({ name: name.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined, pixKey: pixKey.trim() || undefined, deliveryFee: fee, isOpen });
  };

  return <Page title="Configurações da loja" eyebrow="MINHA OPERAÇÃO">
    <Card>
      <Text style={s.sectionTitle}>Dados publicados</Text>
      <Field label="NOME DA LOJA" value={name} onChangeText={setName} placeholder="Nome do seu negócio" />
      <Field label="WHATSAPP / TELEFONE" value={phone} onChangeText={setPhone} placeholder="(11) 99999-9999" keyboardType="phone-pad" />
      <Field label="ENDEREÇO" value={address} onChangeText={setAddress} placeholder="Rua, número e bairro" />
      <Field label="CHAVE PIX" value={pixKey} onChangeText={setPixKey} placeholder="CPF, telefone ou e-mail" />
      <Field label="TAXA DE ENTREGA" value={deliveryFee} onChangeText={setDeliveryFee} placeholder="0.00" keyboardType="decimal-pad" />
      <Pressable onPress={() => setIsOpen((value) => !value)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 }}>
        <View style={{ flex: 1 }}><Text style={s.rowTitle}>{isOpen ? "Loja aberta" : "Loja fechada"}</Text><Text style={s.muted}>Controla a disponibilidade no marketplace</Text></View>
        <View style={{ width: 42, height: 25, borderRadius: 13, backgroundColor: isOpen ? PEDIU.green : PEDIU.line, justifyContent: "center", padding: 3 }}><View style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: PEDIU.white, alignSelf: isOpen ? "flex-end" : "flex-start" }} /></View>
      </Pressable>
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
    <Card><Row icon="tune" title="Configurações avançadas" subtitle="Diagnóstico e preferências" onPress={() => router.push("/account/settings/advanced")} /></Card>
  </Page>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "phone-pad" | "decimal-pad" }) {
  return <View style={{ gap: 7 }}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={PEDIU.muted} keyboardType={keyboardType} style={s.input} /></View>;
}

const PEDIU = { coral: "#FF5A4F", muted: "#7C8A8F", line: "#F0E9E3", green: "#36B878", white: "#FFFFFF" };
