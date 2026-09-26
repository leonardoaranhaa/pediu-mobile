import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { Page, Card, Field, Row, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { useAppPreferences } from "@/lib/app-preferences";
export default function SellerHomePage() {
  const { user, isAuthenticated, refresh } = useAuth();
  const { theme } = useAppPreferences();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pixKey, setPixKey] = useState("");
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: isAuthenticated });
  const orders = trpc.pediu.orders.storeMine.useQuery(undefined, { enabled: Boolean(store.data?.id) });
  const createStore = trpc.pediu.stores.create.useMutation({
    onSuccess: async () => {
      await refresh();
      await store.refetch();
    },
  });

  if (!isAuthenticated) {
    return <Page title="Minha loja" eyebrow="PAINEL DA LOJA">
      <Card>
        <MaterialIcons name="lock" size={24} color={theme.primary} />
        <Text style={s.sectionTitle}>Entre para começar a vender</Text>
        <Text style={s.muted}>A criação da loja e os pedidos ficam vinculados à sua conta segura.</Text>
        <PrimaryButton title="Entrar com login seguro" onPress={() => void startOAuthLogin()} />
        <OutlineButton title="Criar uma conta" onPress={() => router.push("/register")} />
      </Card>
    </Page>;
  }

  if (!store.data) {
    return <Page title="Criar minha loja" eyebrow="COMECE A VENDER">
      <Card>
        <Text style={s.sectionTitle}>Cadastre seu negócio local</Text>
        <Text style={s.muted}>Depois de salvar, sua conta será habilitada como prestador e você poderá publicar produtos e receber pedidos.</Text>
        <Field label="NOME DA LOJA" value={name} onChangeText={setName} placeholder="Nome do seu negócio" />
        <Field label="WHATSAPP / TELEFONE" value={phone} onChangeText={setPhone} placeholder="(11) 99999-9999" keyboardType="phone-pad" />
        <Field label="ENDEREÇO" value={address} onChangeText={setAddress} placeholder="Rua, número e bairro" />
        <Field label="CHAVE PIX" value={pixKey} onChangeText={setPixKey} placeholder="CPF, telefone ou e-mail" />
        <PrimaryButton title={createStore.isPending ? "Salvando..." : "Criar minha loja"} disabled={createStore.isPending || name.trim().length < 2} onPress={() => createStore.mutate({ name: name.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined, pixKey: pixKey.trim() || undefined, deliveryFee: "0.00" })} />
        {createStore.error ? <Text style={{ color: theme.primary, fontSize: 12 }}>{createStore.error.message}</Text> : null}
      </Card>
    </Page>;
  }

  return <Page title="Minha loja" eyebrow="PAINEL DA LOJA">
    <View style={{ backgroundColor: theme.ink, borderRadius: 24, padding: 20, gap: 4 }}>
      <Text style={{ color: theme.highlight, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>PAINEL DA LOJA</Text>
      <Text style={{ color: PEDIU.white, fontSize: 23, fontWeight: "800" }}>{store.data.name}</Text>
      <Text style={{ color: "#BCD0D1", fontSize: 12 }}>{store.data.isOpen ? "Loja aberta para receber pedidos" : "Loja fechada ou pausada"}</Text>
      <View style={{ marginTop: 12 }}><PrimaryButton title="Abrir pedidos" onPress={() => router.push("/seller/orders")} /></View>
    </View>
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Card style={{ flex: 1 }}><Text style={{ color: theme.ink, fontSize: 22, fontWeight: "900" }}>{orders.data?.length ?? 0}</Text><Text style={s.muted}>Pedidos</Text></Card>
      <Card style={{ flex: 1 }}><MaterialIcons name="storefront" size={22} color={theme.primary} /><Text style={s.muted}>{store.data.isOpen ? "Recebendo" : "Pausada"}</Text></Card>
    </View>
    <Card>
      <Row icon="inventory-2" title="Catálogo" subtitle="Produtos, preços e disponibilidade" onPress={() => router.push("/seller/catalog")} />
      <Row icon="people" title="Clientes e fiado" subtitle="Crédito e histórico por cliente" onPress={() => router.push("/seller/clients")} />
      <Row icon="receipt-long" title="Vendas" subtitle="Histórico e formas de pagamento" onPress={() => router.push("/seller/sales")} />
      <Row icon="two-wheeler" title="Entregas" subtitle="Atribuição, GPS, ETA e conclusão" onPress={() => router.push("/seller/delivery")} />
      <Row icon="groups" title="Equipe de entregadores" subtitle="Vincular e acompanhar couriers aprovados" onPress={() => router.push("/seller/couriers")} />
      <Row icon="settings" title="Configurações da loja" onPress={() => router.push("/seller/settings")} />
    </Card>
    {user?.role !== "merchant" ? <Text style={s.muted}>Atualizando permissões da conta...</Text> : null}
  </Page>;
}
