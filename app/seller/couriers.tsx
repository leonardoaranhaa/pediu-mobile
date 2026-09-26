import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  Field,
  OutlineButton,
  Page,
  PrimaryButton,
  PEDIU,
  Row,
  s,
} from "@/components/pediu-page";

const vehicleLabels = {
  bike: "Bicicleta",
  moto: "Moto",
  car: "Carro",
} as const;

export default function SellerCouriersPage() {
  const { user } = useAuth();
  const [courierUserId, setCourierUserId] = useState("");
  const couriers = trpc.pediu.stores.couriers.useQuery(undefined, {
    enabled: user?.role === "merchant",
    refetchInterval: 15_000,
  });
  const link = trpc.pediu.stores.linkCourier.useMutation({
    onSuccess: async () => {
      setCourierUserId("");
      await couriers.refetch();
    },
  });
  const submit = () => {
    const id = Number(courierUserId);
    if (Number.isInteger(id) && id > 0) link.mutate({ courierUserId: id });
  };
  const allowed = user?.role === "merchant";
  if (!allowed)
    return (
      <Page title="Entregadores" eyebrow="OPERAÇÃO DA LOJA">
        <Card>
          <Text style={s.rowTitle}>Acesso exclusivo para lojistas.</Text>
        </Card>
      </Page>
    );
  return (
    <Page title="Entregadores" eyebrow="OPERAÇÃO DA LOJA">
      <Card>
        <Text style={s.sectionTitle}>Vincular entregador aprovado</Text>
        <Text style={s.muted}>
          O entregador deve concluir o cadastro e ser aprovado pela plataforma
          antes do vínculo. Nesta primeira versão, use o número da conta exibido
          no perfil do entregador.
        </Text>
        <Field
          label="ID DA CONTA DO ENTREGADOR"
          value={courierUserId}
          onChangeText={setCourierUserId}
          placeholder="Ex.: 42"
          keyboardType="numeric"
        />
        {link.error ? (
          <Text style={{ color: PEDIU.coral }}>{link.error.message}</Text>
        ) : null}
        <PrimaryButton
          title={link.isPending ? "Vinculando..." : "Vincular à minha loja"}
          onPress={submit}
          disabled={link.isPending || !courierUserId.trim()}
        />
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Minha equipe de entrega</Text>
        {couriers.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
        {!couriers.data?.length ? (
          <Text style={s.muted}>Nenhum entregador vinculado ainda.</Text>
        ) : null}
        {couriers.data?.map((courier) => (
          <Row
            key={courier.id}
            icon="two-wheeler"
            title={courier.name ?? `Conta #${courier.courierUserId}`}
            subtitle={`${vehicleLabels[courier.vehicleType]} · ${courier.phone ?? "telefone não informado"}`}
            right={
              <View style={{ alignItems: "flex-end", gap: 3 }}>
                <Text
                  style={{
                    color:
                      courier.availability === "available"
                        ? PEDIU.green
                        : courier.availability === "busy"
                          ? PEDIU.coral
                          : PEDIU.muted,
                    fontSize: 10,
                    fontWeight: "900",
                  }}
                >
                  {courier.availability === "available"
                    ? "DISPONÍVEL"
                    : courier.availability === "busy"
                      ? "EM ENTREGA"
                      : "OFFLINE"}
                </Text>
                <Text style={s.muted}>#{courier.courierUserId}</Text>
              </View>
            }
          />
        ))}
      </Card>
      <OutlineButton
        title="Atualizar equipe"
        onPress={() => void couriers.refetch()}
      />
    </Page>
  );
}
