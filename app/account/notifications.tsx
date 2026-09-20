import { Pressable, Text, View } from "react-native";
import { Page, Card, s, PEDIU } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";

export default function NotificationsPage() {
  const query = trpc.pediu.notifications.mine.useQuery();
  const markRead = trpc.pediu.notifications.markRead.useMutation({
    onSuccess: () => void query.refetch(),
  });

  return (
    <Page title="Notificações" eyebrow="AVISOS">
      <Card>
        {query.data?.length ? query.data.map((notification) => (
          <Pressable
            key={notification.id}
            onPress={() => {
              if (!notification.readAt) markRead.mutate({ notificationId: notification.id });
            }}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F0E9E3",
              opacity: notification.readAt ? 0.65 : 1,
            }}
          >
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: notification.readAt ? "#F0E9E3" : PEDIU.coral, marginTop: 6 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{notification.title}</Text>
                <Text style={s.muted}>{notification.body}</Text>
                <Text style={[s.muted, { marginTop: 4 }]}>
                  {new Date(notification.createdAt).toLocaleString("pt-BR")}
                </Text>
              </View>
            </View>
          </Pressable>
        )) : (
          <Text style={s.muted}>Você não tem notificações novas.</Text>
        )}
      </Card>
    </Page>
  );
}
