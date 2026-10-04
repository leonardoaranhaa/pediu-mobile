import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { startOAuthLogin } from "@/constants/oauth";
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

type VehicleType = "bike" | "moto" | "car";
const vehicleLabels: Record<VehicleType, string> = {
  bike: "Bicicleta",
  moto: "Moto",
  car: "Carro",
};

function money(value: unknown) {
  return `R$ ${Number(value ?? 0)
    .toFixed(2)
    .replace(".", ",")}`;
}

export default function CourierHomePage() {
  const { user, isAuthenticated } = useAuth();
  const [vehicleType, setVehicleType] = useState<VehicleType>("bike");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [phone, setPhone] = useState("");
  const [tracking, setTracking] = useState(false);
  const [locationError, setLocationError] = useState("");
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const lastLocationAt = useRef(0);
  const locationSequence = useRef(0);

  const profile = trpc.pediu.courier.profile.mine.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  });
  const offers = trpc.pediu.courier.offers.useQuery(undefined, {
    enabled: profile.data?.status === "approved",
    refetchInterval: 8_000,
  });
  const active = trpc.pediu.courier.active.useQuery(undefined, {
    enabled: profile.data?.status === "approved",
    refetchInterval: 8_000,
  });
  const apply = trpc.pediu.courier.profile.register.useMutation({
    onSuccess: () => void profile.refetch(),
  });
  const consent = trpc.pediu.courier.profile.locationConsent.useMutation({
    onSuccess: () => void profile.refetch(),
  });
  const availability = trpc.pediu.courier.profile.availability.useMutation({
    onSuccess: () => void profile.refetch(),
  });
  const accept = trpc.pediu.courier.acceptOffer.useMutation({
    onSuccess: async () => {
      await offers.refetch();
      await active.refetch();
    },
  });
  const reject = trpc.pediu.courier.rejectOffer.useMutation({
    onSuccess: () => void offers.refetch(),
  });
  const sendLocation = trpc.pediu.experience.delivery.location.useMutation({
    onSuccess: async () => {
      await active.refetch();
    },
  });
  const complete = trpc.pediu.experience.delivery.complete.useMutation({
    onSuccess: async () => {
      stopTracking();
      await active.refetch();
      await profile.refetch();
    },
  });

  const stopTracking = useCallback(() => {
    watcher.current?.remove();
    watcher.current = null;
    setTracking(false);
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const startTracking = async () => {
    const current = active.data?.[0];
    if (!current) return;
    setLocationError("");
    if (!profile.data?.locationConsentAt) {
      await consent.mutateAsync({ accepted: true });
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setLocationError(
        "Permita a localização durante a entrega para compartilhar sua rota com o cliente.",
      );
      return;
    }
    watcher.current?.remove();
    watcher.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25,
        timeInterval: 8_000,
      },
      (position) => {
        const now = Date.now();
        if (now - lastLocationAt.current < 7_000 || sendLocation.isPending)
          return;
        lastLocationAt.current = now;
        locationSequence.current += 1;
        sendLocation.mutate({
          orderId: current.order.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          etaMinutes: current.assignment.etaMinutes ?? undefined,
          idempotencyKey: `courier-${current.order.id}-${now}-${locationSequence.current}`,
        });
      },
    );
    setTracking(true);
  };

  const submitApplication = () => {
    apply.mutate({
      vehicleType,
      vehiclePlate: vehiclePlate.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <Page title="Entregar com o Pediu" eyebrow="CENTRAL DO ENTREGADOR">
        <Card>
          <Text style={s.sectionTitle}>Faça entregas do seu jeito</Text>
          <Text style={s.muted}>
            Crie seu perfil, aguarde a aprovação e receba ofertas de lojas
            parceiras.
          </Text>
          <PrimaryButton
            title="Entrar com login seguro"
            onPress={() => void startOAuthLogin()}
          />
          <OutlineButton title="Voltar" onPress={() => router.back()} />
        </Card>
      </Page>
    );
  }

  if (profile.isLoading)
    return (
      <Page title="Central do entregador" eyebrow="PEDIU LOGÍSTICA">
        <ActivityIndicator color={PEDIU.coral} />
      </Page>
    );

  if (!profile.data) {
    return (
      <Page title="Quero entregar" eyebrow="PRIMEIRO PASSO">
        <Card>
          <Text style={s.sectionTitle}>Crie seu perfil de entregador</Text>
          <Text style={s.muted}>
            Você poderá escolher quando ficar disponível. A plataforma aprova o
            cadastro antes de liberar ofertas.
          </Text>
          <Text style={s.label}>MODAL DE ENTREGA</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(vehicleLabels) as VehicleType[]).map((type) => (
              <OutlineButton
                key={type}
                title={vehicleLabels[type]}
                onPress={() => setVehicleType(type)}
                style={{
                  borderColor: vehicleType === type ? PEDIU.coral : PEDIU.line,
                  backgroundColor:
                    vehicleType === type ? PEDIU.coralSoft : PEDIU.white,
                }}
              />
            ))}
          </View>
          <Field
            label="TELEFONE"
            value={phone}
            onChangeText={setPhone}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
          />
          {vehicleType !== "bike" ? (
            <Field
              label="PLACA DO VEÍCULO"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              placeholder="ABC1D23"
              autoCapitalize="characters"
            />
          ) : null}
          {apply.error ? (
            <Text style={{ color: PEDIU.coral }}>{apply.error.message}</Text>
          ) : null}
          <PrimaryButton
            title={
              apply.isPending ? "Enviando cadastro..." : "Enviar para análise"
            }
            onPress={submitApplication}
            disabled={apply.isPending || !phone.trim()}
          />
        </Card>
        <Card>
          <Text style={s.sectionTitle}>O que acontece depois?</Text>
          <Row
            icon="verified-user"
            title="Análise da plataforma"
            subtitle="Seu perfil fica pendente até a aprovação."
          />
          <Row
            icon="schedule"
            title="Disponibilidade"
            subtitle="Você escolhe quando ficar online."
          />
          <Row
            icon="route"
            title="Ofertas e rota"
            subtitle="Aceite pedidos e compartilhe localização somente durante a entrega."
          />
        </Card>
      </Page>
    );
  }

  if (profile.data.status !== "approved") {
    const statusText =
      profile.data.status === "pending"
        ? "Seu cadastro está em análise."
        : profile.data.status === "rejected"
          ? "Seu cadastro não foi aprovado nesta análise."
          : "Seu perfil está suspenso e não recebe novas ofertas.";
    return (
      <Page title="Central do entregador" eyebrow="STATUS DO CADASTRO">
        <Card>
          <Text style={s.sectionTitle}>{statusText}</Text>
          <Text style={s.muted}>
            {profile.data.statusReason ??
              "A equipe do Pediu atualizará este status quando houver uma decisão."}
          </Text>
          {profile.data.status === "rejected" ? (
            <PrimaryButton
              title="Enviar atualização do cadastro"
              onPress={() =>
                profile.data &&
                apply.mutate({
                  vehicleType: profile.data.vehicleType,
                  vehiclePlate: profile.data.vehiclePlate ?? undefined,
                  phone: profile.data.phone ?? undefined,
                })
              }
              disabled={apply.isPending}
            />
          ) : null}
        </Card>
        <OutlineButton title="Voltar ao perfil" onPress={() => router.back()} />
      </Page>
    );
  }

  const approvedProfile = profile.data;
  const current = active.data?.[0];
  return (
    <Page title="Central do entregador" eyebrow="PEDIU LOGÍSTICA">
      <Card style={{ backgroundColor: PEDIU.ink }}>
        <Text
          style={{
            color: PEDIU.yellow,
            fontSize: 10,
            fontWeight: "900",
            letterSpacing: 1.2,
          }}
        >
          ENTREGADOR APROVADO
        </Text>
        <Text
          style={{
            color: PEDIU.white,
            fontSize: 22,
            fontWeight: "900",
            marginTop: 5,
          }}
        >
          {user?.name ?? "Entregador"}
        </Text>
        <Text style={{ color: "#BCD0D1", marginTop: 3 }}>
          {vehicleLabels[approvedProfile.vehicleType]} ·{" "}
          {approvedProfile.phone ?? "Telefone não informado"}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 14,
          }}
        >
          <OutlineButton
            title={
              approvedProfile.availability === "available"
                ? "Disponível"
                : approvedProfile.availability === "busy"
                  ? "Em entrega"
                  : "Offline"
            }
            onPress={() =>
              availability.mutate({
                value:
                  approvedProfile.availability === "available"
                    ? "offline"
                    : "available",
              })
            }
            disabled={
              availability.isPending || approvedProfile.availability === "busy"
            }
            style={{
              borderColor: PEDIU.yellow,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          />
        </View>
      </Card>

      <Card>
        <Text style={s.sectionTitle}>Ofertas da loja</Text>
        {offers.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
        {!offers.data?.length ? (
          <Text style={s.muted}>
            Nenhuma oferta disponível agora. Fique disponível para receber novas
            oportunidades.
          </Text>
        ) : null}
        {offers.data?.map((offer) => (
          <View
            key={offer.id}
            style={{
              borderTopWidth: 1,
              borderTopColor: PEDIU.line,
              paddingVertical: 12,
              gap: 5,
            }}
          >
            <Text style={s.rowTitle}>
              {offer.storeName} · Pedido #{offer.orderId}
            </Text>
            <Text style={s.muted}>
              {offer.deliveryAddress ?? "Endereço informado após o aceite"} ·{" "}
              {money(offer.total)}
            </Text>
            <Text style={s.muted}>
              {offer.etaMinutes
                ? `ETA sugerido: ${offer.etaMinutes} min`
                : "ETA a combinar"}
              {offer.message ? ` · ${offer.message}` : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <PrimaryButton
                title={accept.isPending ? "Aceitando..." : "Aceitar oferta"}
                onPress={() => accept.mutate({ offerId: offer.id })}
                disabled={accept.isPending || reject.isPending}
              />
              <OutlineButton
                title="Recusar"
                onPress={() => reject.mutate({ offerId: offer.id })}
                disabled={accept.isPending || reject.isPending}
              />
            </View>
          </View>
        ))}
      </Card>

      {current ? (
        <Card>
          <Text style={s.sectionTitle}>
            Entrega ativa · Pedido #{current.order.id}
          </Text>
          <Text style={s.rowTitle}>{current.store.name}</Text>
          <Text style={s.muted}>
            Retirada:{" "}
            {current.store.address ?? "Endereço da loja não informado"}
          </Text>
          <Text style={s.muted}>
            Destino: {current.order.deliveryAddress ?? "Endereço do cliente"}
          </Text>
          <Text
            style={[
              s.muted,
              {
                color:
                  current.order.status === "A caminho"
                    ? PEDIU.coral
                    : PEDIU.ink,
                fontWeight: "800",
              },
            ]}
          >
            {current.order.status} · {money(current.order.total)}
          </Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {!tracking && current.assignment.status === "assigned" ? (
              <PrimaryButton
                title="Iniciar rota e compartilhar GPS"
                onPress={() => void startTracking()}
                disabled={sendLocation.isPending || consent.isPending}
              />
            ) : null}
            {tracking ? (
              <OutlineButton
                title="GPS compartilhado durante esta entrega"
                onPress={() => stopTracking()}
              />
            ) : null}
            {current.order.status === "A caminho" ? (
              <PrimaryButton
                title={
                  complete.isPending ? "Finalizando..." : "Confirmar entrega"
                }
                onPress={() => complete.mutate({ orderId: current.order.id })}
                disabled={complete.isPending}
              />
            ) : null}
          </View>
          {locationError ? (
            <Text style={{ color: PEDIU.coral, marginTop: 8 }}>
              {locationError}
            </Text>
          ) : null}
          {sendLocation.error ? (
            <Text style={{ color: PEDIU.coral, marginTop: 8 }}>
              {sendLocation.error.message}
            </Text>
          ) : null}
          {complete.error ? (
            <Text style={{ color: PEDIU.coral, marginTop: 8 }}>
              {complete.error.message}
            </Text>
          ) : null}
          <Text style={s.muted}>
            A localização só é enviada durante uma entrega ativa e com sua
            autorização.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={s.sectionTitle}>Extrato informativo</Text>
        <Text style={s.muted}>
          Nesta fase, o Pediu registra o valor do pedido e a operação da
          entrega, mas não processa pagamento, saque ou repasse. O PSP e as
          regras de taxa serão ativados somente após a configuração empresarial.
        </Text>
      </Card>
      <OutlineButton title="Voltar ao perfil" onPress={() => router.back()} />
    </Page>
  );
}
