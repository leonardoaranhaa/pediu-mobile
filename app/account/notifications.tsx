import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Page, Card, ToggleRow, s, PEDIU } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const query = trpc.pediu.notifications.mine.useQuery(undefined, { enabled: isAuthenticated });
  const preferences = trpc.pediu.notifications.preferences.mine.useQuery(undefined, { enabled: isAuthenticated });
  const markRead = trpc.pediu.notifications.markRead.useMutation({ onSuccess: () => void query.refetch() });
  const updatePreferences = trpc.pediu.notifications.preferences.update.useMutation({ onSuccess: () => void preferences.refetch() });

  const openNotification = (notification: NonNullable<typeof query.data>[number]) => {
    if (!notification.readAt) markRead.mutate({ notificationId: notification.id });
    if (notification.actionPath) router.push(notification.actionPath as never);
  };

  if (!isAuthenticated) return <Page title="Notificações" eyebrow="AVISOS" back><Card><Text style={s.sectionTitle}>Entre para consultar seus avisos</Text><Text style={s.muted}>As notificações e preferências ficam associadas à sua sessão.</Text></Card></Page>;

  const pref = preferences.data;
  return <Page title="Notificações" eyebrow="AVISOS">
    <Card>
      <Text style={s.sectionTitle}>Preferências</Text>
      {preferences.isLoading ? <Text style={s.muted}>Carregando preferências...</Text> : null}
      {pref ? <View style={{ gap: 4 }}>
        <ToggleRow icon="notifications-active" title="Atualizações de pedidos" subtitle="Status, pagamentos e entregas" value={pref.orderUpdates === 1} onChange={(value) => updatePreferences.mutate({ orderUpdates: value })} />
        <ToggleRow icon="support-agent" title="Mensagens de suporte" subtitle="Chamados e conversas do pedido" value={pref.supportMessages === 1} onChange={(value) => updatePreferences.mutate({ supportMessages: value })} />
        <ToggleRow icon="local-offer" title="Ofertas e novidades" subtitle="Comunicações promocionais" value={pref.promotions === 1} onChange={(value) => updatePreferences.mutate({ promotions: value })} />
        <ToggleRow icon="phonelink-ring" title="Push no dispositivo" subtitle="Permitir avisos fora do app" value={pref.pushEnabled === 1} onChange={(value) => updatePreferences.mutate({ pushEnabled: value })} />
      </View> : null}
      {updatePreferences.error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{updatePreferences.error.message}</Text> : null}
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Histórico</Text>
      {query.isLoading ? <Text style={s.muted}>Carregando avisos...</Text> : null}
      {query.isError ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>Não foi possível carregar suas notificações.</Text> : null}
      {!query.isLoading && !query.isError && !query.data?.length ? <Text style={s.muted}>Você não tem notificações novas.</Text> : null}
      {query.data?.map((notification) => <Pressable key={notification.id} onPress={() => openNotification(notification)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: PEDIU.line, opacity: notification.readAt ? 0.65 : 1 }}><View style={{ flexDirection: "row", gap: 10 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: notification.readAt ? PEDIU.line : PEDIU.coral, marginTop: 6 }} /><View style={{ flex: 1 }}><Text style={s.rowTitle}>{notification.title}</Text><Text style={s.muted}>{notification.body}</Text><Text style={[s.muted, { marginTop: 4 }]}>{new Date(notification.createdAt).toLocaleString("pt-BR")}{notification.actionPath ? " · Abrir" : ""}</Text></View></View></Pressable>)}
    </Card>
  </Page>;
}
