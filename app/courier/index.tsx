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
import {
  OpsBadge,
  OpsButton,
  OpsCard,
  OpsDock,
  OpsHeader,
  OpsMetric,
  OpsOrderLines,
  OpsSectionTitle,
  OpsShell,
} from "@/components/pediu-ops-ui";

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
      await profile.refetch();
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
    if (!profile.data?.locationConsentAt)
      await consent.mutateAsync({ accepted: true });
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

  const submitApplication = () =>
    apply.mutate({
      vehicleType,
      vehiclePlate: vehiclePlate.trim() || undefined,
      phone: phone.trim() || undefined,
    });

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
  const availabilityLabel =
    approvedProfile.availability === "available"
      ? "Online"
      : approvedProfile.availability === "busy"
        ? "Em rota"
        : "Offline";
  const availabilityTone =
    approvedProfile.availability === "available"
      ? "accent"
      : approvedProfile.availability === "busy"
        ? "success"
        : "neutral";

  return (
    <OpsShell
      dock={
        <OpsDock
          items={[
            {
              label: "Radar",
              icon: "two-wheeler",
              to: "/courier",
              active: true,
            },
            { label: "Cliente", icon: "home", to: "/" },
          ]}
        />
      }
    >
      <OpsHeader
        eyebrow="MOTOBOY"
        title={user?.name ?? "Entregador"}
        subtitle={`${vehicleLabels[approvedProfile.vehicleType]} · operação Pediu`}
        status={availabilityLabel}
        statusTone={availabilityTone}
        statusIcon="two-wheeler"
        onStatusPress={() =>
          availability.mutate({
            value:
              approvedProfile.availability === "available"
                ? "offline"
                : "available",
          })
        }
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <OpsMetric value={offers.data?.length ?? 0} label="no radar" dark />
        <OpsMetric value={active.data?.length ?? 0} label="em rota" />
      </View>
      <OpsSectionTitle title="Radar" count={offers.data?.length ?? 0} />
      {offers.isLoading ? (
        <OpsCard>
          <ActivityIndicator color={PEDIU.coral} />
        </OpsCard>
      ) : null}
      {offers.data?.map((offer) => (
        <OpsCard
          key={offer.id}
          style={{ borderColor: "#E20D2A", borderWidth: 1.5 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{
                  fontFamily: "Fredoka",
                  fontSize: 23,
                  fontWeight: "900",
                  color: "#111111",
                }}
              >
                {offer.storeName}
              </Text>
              <Text
                style={{ fontFamily: "Nunito", fontSize: 17, color: "#6E635A" }}
              >
                {offer.deliveryAddress ?? "Destino informado após o aceite"}
              </Text>
            </View>
            <OpsBadge tone="accent">FLASH</OpsBadge>
          </View>
          <Text
            style={{
              fontFamily: "Fredoka",
              fontSize: 22,
              fontWeight: "900",
              color: "#111111",
            }}
          >
            Pedido {money(offer.total)}
          </Text>
          <OpsOrderLines
            lines={[
              offer.etaMinutes
                ? `ETA sugerido: ${offer.etaMinutes} min`
                : "ETA a combinar",
              offer.message ?? "A loja enviou uma nova oportunidade",
            ]}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <OpsButton
              title={accept.isPending ? "Aceitando..." : "Aceitar"}
              onPress={() => accept.mutate({ offerId: offer.id })}
              disabled={accept.isPending || reject.isPending}
              style={{ flex: 1 }}
            />
            <OpsButton
              title="Recusar"
              variant="outline"
              onPress={() => reject.mutate({ offerId: offer.id })}
              disabled={accept.isPending || reject.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </OpsCard>
      ))}
      {!offers.isLoading && !offers.data?.length ? (
        <OpsCard>
          <Text style={s.muted}>
            Nenhuma oferta agora. Fique online para receber novas oportunidades.
          </Text>
        </OpsCard>
      ) : null}
      {offers.isError ? (
        <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>
          {offers.error.message}
        </Text>
      ) : null}

      <OpsSectionTitle title="Entrega ativa" count={active.data?.length ?? 0} />
      {current ? (
        <OpsCard>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <Text
              style={{
                fontFamily: "Fredoka",
                fontSize: 22,
                fontWeight: "900",
                color: "#111111",
              }}
            >
              {current.store.name}
            </Text>
            <OpsBadge tone={current.order.isFlash === 1 ? "primary" : "muted"}>
              {current.order.isFlash === 1 ? "FLASH" : current.order.status}
            </OpsBadge>
          </View>
          <OpsOrderLines
            lines={[
              `Retirada: ${current.store.address ?? "Endereço da loja não informado"}`,
              `Destino: ${current.order.deliveryAddress ?? "Endereço do cliente"}`,
              `${current.order.status} · ${money(current.order.total)}`,
            ]}
          />
          {!tracking && current.assignment.status === "assigned" ? (
            <OpsButton
              title="Iniciar rota e compartilhar GPS"
              onPress={() => void startTracking()}
              disabled={sendLocation.isPending || consent.isPending}
            />
          ) : null}
          {tracking ? (
            <OpsButton
              title="GPS compartilhado durante esta entrega"
              variant="accent"
              onPress={stopTracking}
            />
          ) : null}
          {current.order.status === "A caminho" ? (
            <OpsButton
              title={
                complete.isPending ? "Finalizando..." : "Confirmar entrega"
              }
              onPress={() => complete.mutate({ orderId: current.order.id })}
              disabled={complete.isPending}
            />
          ) : null}
          {locationError ? (
            <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>
              {locationError}
            </Text>
          ) : null}
          {sendLocation.error ? (
            <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>
              {sendLocation.error.message}
            </Text>
          ) : null}
          {complete.error ? (
            <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>
              {complete.error.message}
            </Text>
          ) : null}
          <Text style={s.muted}>
            A localização só é enviada durante uma entrega ativa e com sua
            autorização.
          </Text>
        </OpsCard>
      ) : (
        <OpsCard>
          <Text style={s.muted}>
            Quando você aceitar uma oferta, a rota ativa aparece aqui.
          </Text>
        </OpsCard>
      )}
      <OpsButton
        title="Voltar ao perfil"
        variant="ghost"
        onPress={() => router.back()}
      />
    </OpsShell>
  );
}
