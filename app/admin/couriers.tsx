import { ActivityIndicator, Text, View } from "react-native";
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
          A aprovação libera o perfil para ficar disponível e receber ofertas.
          Nenhum documento sensível é exibido neste painel.
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
              title={item.user.name ?? `Conta #${item.profile.userId}`}
              subtitle={`#${item.profile.userId} · ${vehicleLabels[item.profile.vehicleType]} · ${statusLabels[item.profile.status]}`}
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
        A aprovação é uma decisão operacional da plataforma. A configuração de
        PSP, cobrança e repasse permanece pendente até a abertura do CNPJ.
      </Text>
    </Page>
  );
}
