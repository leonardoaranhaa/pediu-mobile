import { ActivityIndicator, Image, Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  OutlineButton,
  Page,
  PEDIU,
  Row,
  s,
} from "@/components/pediu-page";

const statusLabels = {
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Rejeitado",
  suspended: "Suspenso",
} as const;
const vehicleLabels = {
  bike: "Bicicleta",
  moto: "Moto",
  car: "Carro",
} as const;

export default function AdminCouriersPage() {
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const couriers = trpc.admin.couriers.useQuery(
    { limit: 100, offset: 0 },
    { enabled: allowed },
  );
  const review = trpc.admin.courierReview.useMutation({
    onSuccess: () => void couriers.refetch(),
  });
  if (loading)
    return (
      <Page title="Entregadores" eyebrow="ADMINISTRAÇÃO">
        <ActivityIndicator color={PEDIU.coral} />
      </Page>
    );
  if (!allowed)
    return (
      <Page title="Acesso restrito" eyebrow="ADMINISTRAÇÃO">
        <Card>
          <Text style={s.rowTitle}>Área exclusiva para administradores.</Text>
        </Card>
      </Page>
    );
  return (
    <Page title="Entregadores" eyebrow="ADMINISTRAÇÃO">
      <Card>
        <Text style={s.sectionTitle}>Cadastros para revisão</Text>
        <Text style={s.muted}>
          A aprovação libera o motoboy para receber corridas perto das lojas. Confira a CNH, o veículo e a foto antes de aprovar.
        </Text>
        {couriers.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
        {!couriers.isLoading && !couriers.data?.length ? (
          <Text style={s.muted}>Nenhum cadastro encontrado.</Text>
        ) : null}
        {couriers.data?.map((item) => (
          <View
            key={item.profile.id}
            style={{
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: PEDIU.line,
              paddingVertical: 13,
            }}
          >
            <Row
              icon="two-wheeler"
              title={item.user.name ?? "Entregador"}
              subtitle={`${vehicleLabels[item.profile.vehicleType]}${item.profile.vehiclePlate ? ` · ${item.profile.vehiclePlate}` : ""} · CNH ${item.profile.documentNumber ?? "não enviada"} · ${statusLabels[item.profile.status]}`}
              right={
                <Text
                  style={{
                    color:
                      item.profile.status === "approved"
                        ? PEDIU.green
                        : PEDIU.coral,
                    fontWeight: "900",
                    fontSize: 10,
                  }}
                >
                  {statusLabels[item.profile.status]}
                </Text>
              }
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[item.profile.documentPhoto, item.profile.vehiclePhoto, item.profile.selfiePhoto]
                .filter((photo): photo is string => Boolean(photo))
                .map((photo, index) => (
                  <Image key={`${item.profile.id}-${index}`} source={{ uri: photo }} style={{ width: 72, height: 72, borderRadius: 12 }} />
                ))}
            </View>
            {!item.profile.documentPhoto ? <Text style={s.muted}>Documentos ainda não enviados.</Text> : null}
            {item.profile.status === "pending" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <OutlineButton
                  title={review.isPending ? "..." : "Aprovar"}
                  onPress={() =>
                    review.mutate({
                      profileId: item.profile.id,
                      status: "approved",
                    })
                  }
                  disabled={review.isPending}
                />
                <OutlineButton
                  title="Rejeitar"
                  onPress={() =>
                    review.mutate({
                      profileId: item.profile.id,
                      status: "rejected",
                      reason: "Cadastro não aprovado na análise inicial",
                    })
                  }
                  disabled={review.isPending}
                />
              </View>
            ) : item.profile.status === "approved" ? (
              <OutlineButton
                title="Suspender perfil"
                onPress={() =>
                  review.mutate({
                    profileId: item.profile.id,
                    status: "suspended",
                    reason: "Suspensão administrativa",
                  })
                }
                disabled={review.isPending}
              />
            ) : (
              <OutlineButton
                title="Aprovar novamente"
                onPress={() =>
                  review.mutate({
                    profileId: item.profile.id,
                    status: "approved",
                  })
                }
                disabled={review.isPending}
              />
            )}
          </View>
        ))}
        {review.error ? (
          <Text style={{ color: PEDIU.coral }}>{review.error.message}</Text>
        ) : null}
      </Card>
      <Text style={s.muted}>
        A aprovação é uma decisão da equipe do Pediu. Cobrança automática e repasse ainda dependem da abertura do CNPJ.
      </Text>
    </Page>
  );
}
