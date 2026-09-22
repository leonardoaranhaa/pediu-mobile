import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { Page, Card, Row, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { useAppPreferences } from "@/lib/app-preferences";

export default function SellerHomePage() {
  const { user } = useAuth();
  const { theme } = useAppPreferences();
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: user?.role === "merchant" });
  const orders = trpc.pediu.orders.storeMine.useQuery(undefined, { enabled: user?.role === "merchant" });

  return <Page title="Minha loja" eyebrow="PAINEL DA LOJA">
    <View style={{ backgroundColor: theme.ink, borderRadius: 24, padding: 20, gap: 4 }}>
      <Text style={{ color: theme.highlight, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>PAINEL DA LOJA</Text>
      <Text style={{ color: PEDIU.white, fontSize: 23, fontWeight: "800" }}>{store.data?.name ?? "Sua loja"}</Text>
      <Text style={{ color: "#BCD0D1", fontSize: 12 }}>{store.data?.isOpen ? "Loja aberta para receber pedidos" : "Loja fechada ou ainda não configurada"}</Text>
      <View style={{ marginTop: 12 }}>
        <PrimaryButton title="Abrir pedidos" onPress={() => router.push("/seller/orders")} />
      </View>
    </View>
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Card style={{ flex: 1 }}><Text style={{ color: theme.ink, fontSize: 22, fontWeight: "900" }}>{orders.data?.length ?? 0}</Text><Text style={s.muted}>Pedidos</Text></Card>
      <Card style={{ flex: 1 }}><MaterialIcons name="storefront" size={22} color={theme.primary} /><Text style={s.muted}>{store.data?.isOpen ? "Recebendo" : "Pausada"}</Text></Card>
    </View>
    <Card>
      <Row icon="inventory-2" title="Catálogo" subtitle="Produtos, preços e disponibilidade" onPress={() => router.push("/seller/catalog")} />
      <Row icon="two-wheeler" title="Entregas" subtitle="Atribuição, posição, ETA e encerramento" onPress={() => router.push("/seller/delivery")} />
      <Row icon="people" title="Clientes e fiado" subtitle="Crédito e histórico por cliente" onPress={() => router.push("/seller/clients")} />
      <Row icon="receipt-long" title="Vendas" subtitle="Histórico e formas de pagamento" onPress={() => router.push("/seller/sales")} />
      <Row icon="settings" title="Configurações da loja" onPress={() => router.push("/seller/settings")} />
    </Card>
  </Page>;
}
