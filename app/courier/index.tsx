import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, Text, TextInput, View } from "react-native";
import { askToJoin } from "@/components/auth-prompt";
import { useAuth } from "@/hooks/use-auth";
import { pickPhotoDataUrl } from "@/lib/pick-photo";
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
import { RouteMap } from "@/components/pin-map";
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
import {
  countdownLabel,
  courierEarning,
  formatKm,
  formatMoney,
  mapsNavigationUrl,
  wazeNavigationUrl,
} from "@/shared/pilot-ops";

type VehicleType = "bike" | "moto" | "car";
const vehicleLabels: Record<VehicleType, string> = {
  bike: "Bicicleta",
  moto: "Moto",
  car: "Carro",
};

function pointOf(latitude: unknown, longitude: unknown) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function PhotoButton({
  title,
  value,
  onPick,
}: {
  title: string;
  value?: string;
  onPick: (data: string) => void;
}) {
  const [message, setMessage] = useState("");
  return (
    <View style={{ gap: 6 }}>
      <OutlineButton
        title={value ? `${title} adicionada` : title}
        onPress={() => {
          setMessage("");
          void pickPhotoDataUrl()
            .then((data) => {
              if (data) onPick(data);
            })
            .catch((error: unknown) => {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Não foi possível usar essa foto.",
              );
            });
        }}
      />
      {value ? (
        <Image source={{ uri: value }} style={{ width: 72, height: 72, borderRadius: 12 }} />
      ) : null}
      {message ? <Text style={{ color: PEDIU.coral }}>{message}</Text> : null}
    </View>
  );
}

export default function CourierHomePage() {
  const { user, isAuthenticated } = useAuth();
  const [vehicleType, setVehicleType] = useState<VehicleType>("bike");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [phone, setPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentPhoto, setDocumentPhoto] = useState<string>();
  const [vehiclePhoto, setVehiclePhoto] = useState<string>();
  const [selfiePhoto, setSelfiePhoto] = useState<string>();
  const [pixKey, setPixKey] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [tracking, setTracking] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [cashReceived, setCashReceived] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string>();
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<"offers" | "ride" | "earnings" | "account">("offers");
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
  const earnings = trpc.pediu.courier.earnings.useQuery(undefined, {
    enabled: profile.data?.status === "approved",
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
      setTab("ride");
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
  const arrive = trpc.pediu.experience.delivery.arrive.useMutation({
    onSuccess: () => void active.refetch(),
  });
  const pickup = trpc.pediu.experience.delivery.pickup.useMutation({
    onSuccess: async () => {
      await active.refetch();
    },
  });

  const stopTracking = useCallback(() => {
    const currentWatcher = watcher.current;
    watcher.current = null;
    try {
      currentWatcher?.remove();
    } catch {
      // No navegador a inscrição de localização nem sempre pode ser removida.
    }
    setTracking(false);
  }, []);

  const complete = trpc.pediu.experience.delivery.complete.useMutation({
    onSuccess: async () => {
      stopTracking();
      setDeliveryCode("");
      setCashReceived(false);
      setDeliveryPhoto(undefined);
      await active.refetch();
      await profile.refetch();
      await earnings.refetch();
    },
  });

  useEffect(() => () => stopTracking(), [stopTracking]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startTracking = async (orderId: number, etaMinutes?: number | null) => {
    setLocationError("");
    if (!profile.data?.locationConsentAt)
      await consent.mutateAsync({ accepted: true });
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setLocationError(
        "Permita a localização durante a entrega para o cliente acompanhar você no mapa.",
      );
      return;
    }
    try {
      watcher.current?.remove();
    } catch {
      watcher.current = null;
    }
    watcher.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25,
        timeInterval: 8_000,
      },
      (position) => {
        const sentAt = Date.now();
        if (sentAt - lastLocationAt.current < 7_000 || sendLocation.isPending)
          return;
        lastLocationAt.current = sentAt;
        locationSequence.current += 1;
        sendLocation.mutate({
          orderId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          etaMinutes: etaMinutes ?? undefined,
          idempotencyKey: `courier-${orderId}-${sentAt}-${locationSequence.current}`,
        });
      },
    );
    setTracking(true);
  };

  const goOnline = async () => {
    setLocationError("");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setLocationError(
        "Para receber corridas perto de você, permita a localização e tente ficar online de novo.",
      );
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      availability.mutate({
        value: "available",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocationError("Não conseguimos ler sua localização. Tente ficar online de novo.");
    }
  };

  const documentsReady = Boolean(
    documentNumber.trim() &&
      documentPhoto &&
      vehiclePhoto &&
      selfiePhoto &&
      (vehicleType === "bike" || vehiclePlate.trim()) &&
      pixKey.trim() &&
      workArea.trim() &&
      workHours.trim(),
  );

  const submitApplication = () => {
    if (!documentsReady) return;
    apply.mutate({
      vehicleType,
      vehiclePlate: vehiclePlate.trim() || undefined,
      phone: phone.trim() || undefined,
      documentNumber: documentNumber.trim(),
      documentPhoto,
      vehiclePhoto,
      selfiePhoto,
      pixKey: pixKey.trim(),
      workArea: workArea.trim(),
      workHours: workHours.trim(),
    });
  };

  const openNavigation = (latitude: number, longitude: number, app: "maps" | "waze") => {
    const url =
      app === "maps"
        ? mapsNavigationUrl(latitude, longitude)
        : wazeNavigationUrl(latitude, longitude);
    void Linking.openURL(url);
  };

  if (!isAuthenticated) {
    return (
      <Page title="Entregar com o Pediu" eyebrow="CENTRAL DO ENTREGADOR">
        <Card>
          <Text style={s.sectionTitle}>Faça entregas do seu jeito</Text>
          <Text style={s.muted}>
            Crie seu perfil, envie os documentos e aguarde a aprovação. As corridas
            chegam quando você estiver online perto das lojas.
          </Text>
          <PrimaryButton
            title="Criar conta ou entrar"
            onPress={() =>
              askToJoin({
                action: "courier",
                role: "courier",
                returnTo: "/courier",
              })
            }
          />
          <OutlineButton title="Voltar" onPress={() => router.back()} />
        </Card>
      </Page>
    );
  }

  if (profile.isLoading)
    return (
      <Page title="Central do entregador" eyebrow="ENTREGAS">
        <ActivityIndicator color={PEDIU.coral} />
      </Page>
    );

  const applicationForm = (
    <Card>
      <Text style={s.sectionTitle}>Seus documentos</Text>
      <Text style={s.muted}>
        Envie a CNH, a placa, uma foto do veículo e uma foto sua. A análise libera as corridas da cidade.
      </Text>
      <Text style={s.label}>COMO VOCÊ ENTREGA</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(vehicleLabels) as VehicleType[]).map((type) => (
          <OutlineButton
            key={type}
            title={vehicleLabels[type]}
            onPress={() => setVehicleType(type)}
            style={{
              borderColor: vehicleType === type ? PEDIU.coral : PEDIU.line,
              backgroundColor: vehicleType === type ? PEDIU.coralSoft : PEDIU.white,
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
      <Field
        label="NÚMERO DA CNH"
        value={documentNumber}
        onChangeText={setDocumentNumber}
        placeholder="Somente números"
        keyboardType="number-pad"
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
      <Field label="CHAVE PIX" value={pixKey} onChangeText={setPixKey} autoCapitalize="none" />
      <Field label="CIDADE OU BAIRROS" value={workArea} onChangeText={setWorkArea} />
      <Field label="DIAS E HORÁRIOS" value={workHours} onChangeText={setWorkHours} placeholder="Seg a sex, 11h às 23h" />
      <PhotoButton title="Foto da CNH" value={documentPhoto} onPick={setDocumentPhoto} />
      <PhotoButton title="Foto do veículo" value={vehiclePhoto} onPick={setVehiclePhoto} />
      <PhotoButton title="Sua foto" value={selfiePhoto} onPick={setSelfiePhoto} />
      {!documentsReady ? (
        <Text style={s.muted}>Faltam a CNH, as fotos, a chave PIX, a área e o horário.</Text>
      ) : null}
      {apply.error ? <Text style={{ color: PEDIU.coral }}>{apply.error.message}</Text> : null}
      <PrimaryButton
        title={apply.isPending ? "Enviando cadastro..." : "Enviar para análise"}
        onPress={submitApplication}
        disabled={apply.isPending || !phone.trim() || !documentsReady}
      />
    </Card>
  );

  if (!profile.data) {
    return (
      <Page title="Quero entregar" eyebrow="PRIMEIRO PASSO">
        {applicationForm}
        <Card>
          <Text style={s.sectionTitle}>O que acontece depois?</Text>
          <Row icon="verified-user" title="Análise da plataforma" subtitle="O cadastro fica pendente até a aprovação." />
          <Row icon="schedule" title="Ficar online" subtitle="Com a localização ligada, as lojas perto de você enviam corridas." />
          <Row icon="route" title="Retirada e entrega" subtitle="Você confirma a retirada na loja e a entrega com o código do cliente." />
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
              "Quando a análise terminar, as corridas aparecem aqui assim que você ficar online."}
          </Text>
          <Text style={s.muted}>
            {profile.data.documentPhoto
              ? "Documentos enviados. Aguarde a conferência."
              : "Envie CNH, veículo e foto para concluir a análise."}
          </Text>
        </Card>
        {profile.data.status === "rejected" ? applicationForm : null}
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
  const earned = (earnings.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const storePoint = current ? pointOf(current.store.latitude, current.store.longitude) : null;
  const destinationPoint = current
    ? pointOf(current.order.destinationLatitude, current.order.destinationLongitude)
    : null;
  const headingToCustomer =
    current?.assignment.status === "in_transit" || current?.order.status === "A caminho";
  const navigationPoint = headingToCustomer ? destinationPoint ?? storePoint : storePoint;
  const cashOrder = current?.paymentMethod === "cash";

  return (
    <OpsShell
      dock={
        <OpsDock
          items={[
            {
              label: "Ofertas",
              icon: "radar",
              to: "/courier",
              active: tab === "offers",
              onPress: () => setTab("offers"),
            },
            {
              label: "Corrida",
              icon: "two-wheeler",
              to: "/courier",
              active: tab === "ride",
              onPress: () => setTab("ride"),
            },
            {
              label: "Ganhos",
              icon: "payments",
              to: "/courier",
              active: tab === "earnings",
              onPress: () => setTab("earnings"),
            },
            {
              label: "Conta",
              icon: "person",
              to: "/courier",
              active: tab === "account",
              onPress: () => setTab("account"),
            },
          ]}
        />
      }
    >
      <OpsHeader
        eyebrow="MOTOBOY"
        title={user?.name ?? "Entregador"}
        subtitle={`${vehicleLabels[approvedProfile.vehicleType]} · corridas perto de você`}
        status={availabilityLabel}
        statusTone={availabilityTone}
        statusIcon="two-wheeler"
        onStatusPress={() => {
          if (approvedProfile.availability === "available") {
            availability.mutate({ value: "offline" });
            return;
          }
          void goOnline();
        }}
      />
      {locationError ? (
        <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>{locationError}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <OpsMetric value={offers.data?.length ?? 0} label="no radar" dark />
        <OpsMetric value={formatMoney(earned)} label="a receber" />
      </View>
      {tab === "offers" ? (
      <>
      <OpsSectionTitle title="Ofertas" count={offers.data?.length ?? 0} />
      {offers.isLoading ? (
        <OpsCard>
          <ActivityIndicator color={PEDIU.coral} />
        </OpsCard>
      ) : null}
      {offers.data?.map((offer) => {
        const earning =
          offer.payoutAmount != null
            ? Number(offer.payoutAmount)
            : courierEarning(offer.deliveryFee, offer.tipAmount);
        return (
          <OpsCard key={offer.id} style={{ borderColor: "#E20D2A", borderWidth: 1.5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: "Fredoka", fontSize: 23, fontWeight: "900", color: "#111111" }}>
                  {offer.storeName}
                </Text>
                <Text style={{ fontFamily: "Nunito", fontSize: 17, color: "#6E635A" }}>
                  {offer.deliveryAddress ?? "Destino informado após o aceite"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                {offer.storeKind === "market" ? <OpsBadge tone="success">MERCADO</OpsBadge> : null}
                {offer.isFlash === 1 ? <OpsBadge tone="accent">FLASH</OpsBadge> : null}
                <OpsBadge tone="muted">{countdownLabel(offer.expiresAt, now)}</OpsBadge>
              </View>
            </View>
            <Text style={{ fontFamily: "Fredoka", fontSize: 22, fontWeight: "900", color: "#111111" }}>
              Você recebe {formatMoney(earning)}
            </Text>
            <OpsOrderLines
              lines={[
                `Até a loja: ${formatKm(Number(offer.pickupDistanceKm))}`,
                `Até o cliente: ${formatKm(Number(offer.dropoffDistanceKm))}`,
                offer.storeKind === "market"
                  ? "Sacola separada · retire no mercado e entregue no endereço"
                  : (offer.message ?? "Nova corrida perto de você"),
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
        );
      })}
      {!offers.isLoading && !offers.data?.length ? (
        <OpsCard>
          <Text style={s.muted}>
            Nenhuma corrida agora. Fique online, com a localização ligada, para receber ofertas perto de você.
          </Text>
        </OpsCard>
      ) : null}
      {offers.isError ? (
        <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>{offers.error.message}</Text>
      ) : null}
      </>
      ) : null}

      {tab === "ride" ? (
      <>
      <OpsSectionTitle title="Corrida" count={active.data?.length ?? 0} />
      {current ? (
        <OpsCard>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ fontFamily: "Fredoka", fontSize: 22, fontWeight: "900", color: "#111111" }}>
              {current.store.name}
            </Text>
            {current.order.isFlash === 1 ? <OpsBadge tone="primary">FLASH</OpsBadge> : null}
          </View>
          <RouteMap
            markers={[
              ...(storePoint
                ? [{ ...storePoint, label: current.store.name, color: "#E20D2A" }]
                : []),
              ...(destinationPoint
                ? [{ ...destinationPoint, label: "Entrega", color: "#0E7A45" }]
                : []),
            ]}
          />
          <OpsOrderLines
            lines={[
              `Retirada: ${current.store.address ?? "Endereço da loja"}`,
              `Destino: ${current.order.deliveryAddress ?? "Endereço do cliente"}`,
              cashOrder
                ? `Dinheiro${current.order.changeFor ? ` · troco para ${formatMoney(current.order.changeFor)}` : ""}`
                : "Pagamento já combinado com a loja",
            ]}
          />
          {navigationPoint ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <OpsButton
                title="Google Maps"
                variant="outline"
                onPress={() =>
                  openNavigation(navigationPoint.latitude, navigationPoint.longitude, "maps")
                }
                style={{ flex: 1 }}
              />
              <OpsButton
                title="Waze"
                variant="outline"
                onPress={() =>
                  openNavigation(navigationPoint.latitude, navigationPoint.longitude, "waze")
                }
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
          {current.assignment.status === "assigned" ? (
            <OpsButton
              title={arrive.isPending ? "Marcando..." : "Cheguei na loja"}
              onPress={() => arrive.mutate({ orderId: current.order.id })}
              disabled={arrive.isPending}
            />
          ) : null}
          {current.assignment.status === "arrived" ? (
            <OpsButton
              title={pickup.isPending ? "Confirmando..." : "Pedido retirado"}
              onPress={() => {
                pickup.mutate({ orderId: current.order.id });
                void startTracking(current.order.id, current.assignment.etaMinutes);
              }}
              disabled={pickup.isPending}
            />
          ) : null}
          {headingToCustomer ? (
            <View style={{ gap: 8 }}>
              <Text style={s.label}>CÓDIGO QUE O CLIENTE MOSTRAR</Text>
              <TextInput
                value={deliveryCode}
                onChangeText={(value) => setDeliveryCode(value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4 dígitos"
                keyboardType="number-pad"
                style={{
                  borderWidth: 1,
                  borderColor: "#F0E4D8",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 22,
                  fontWeight: "900",
                  letterSpacing: 4,
                  color: "#111111",
                }}
              />
              <PhotoButton title="Foto da entrega (opcional)" value={deliveryPhoto} onPick={setDeliveryPhoto} />
              {cashOrder ? (
                <OpsButton
                  title={cashReceived ? "Dinheiro recebido" : "Recebi o dinheiro"}
                  variant={cashReceived ? "accent" : "outline"}
                  onPress={() => setCashReceived((value) => !value)}
                />
              ) : null}
              <OpsButton
                title={complete.isPending ? "Finalizando..." : "Confirmar entrega"}
                onPress={() =>
                  complete.mutate({
                    orderId: current.order.id,
                    code: deliveryCode,
                    photo: deliveryPhoto,
                    cashReceived: cashOrder ? cashReceived : undefined,
                  })
                }
                disabled={
                  complete.isPending ||
                  deliveryCode.length !== 4 ||
                  (cashOrder && !cashReceived)
                }
              />
            </View>
          ) : null}
          {!tracking && headingToCustomer ? (
            <OpsButton
              title="Compartilhar minha posição"
              variant="outline"
              onPress={() => void startTracking(current.order.id, current.assignment.etaMinutes)}
            />
          ) : null}
          {tracking ? (
            <OpsButton title="Posição compartilhada nesta entrega" variant="accent" onPress={stopTracking} />
          ) : null}
          {arrive.error ? <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>{arrive.error.message}</Text> : null}
          {pickup.error ? <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>{pickup.error.message}</Text> : null}
          {locationError ? <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>{locationError}</Text> : null}
          {sendLocation.error ? (
            <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>{sendLocation.error.message}</Text>
          ) : null}
          {complete.error ? (
            <Text style={{ color: PEDIU.coral, fontFamily: "Nunito" }}>{complete.error.message}</Text>
          ) : null}
        </OpsCard>
      ) : (
        <OpsCard>
          <Text style={s.muted}>Quando você aceitar uma corrida, a retirada e a entrega aparecem aqui.</Text>
        </OpsCard>
      )}
      </>
      ) : null}

      {tab === "earnings" ? (
        <>
          <OpsSectionTitle title="Ganhos" count={earnings.data?.length ?? 0} />
          <OpsCard>
            <Text style={{ fontFamily: "Fredoka", fontSize: 28, fontWeight: "900", color: "#111111" }}>
              {formatMoney(earned)}
            </Text>
            <Text style={s.muted}>Soma do que já ficou registrado nas entregas concluídas. O PIX automático ainda não sai sozinho.</Text>
          </OpsCard>
          {(earnings.data ?? []).map((row) => (
            <OpsCard key={row.id}>
              <Text style={{ fontFamily: "Fredoka", fontSize: 20, fontWeight: "900", color: "#111111" }}>
                {formatMoney(row.amount)}
              </Text>
              <Text style={s.muted}>Pedido {row.orderId}</Text>
            </OpsCard>
          ))}
          {!earnings.data?.length ? (
            <OpsCard>
              <Text style={s.muted}>Ainda não há ganho registrado.</Text>
            </OpsCard>
          ) : null}
        </>
      ) : null}

      {tab === "account" ? (
        <OpsCard>
          <OpsSectionTitle title="Conta" />
          <OpsOrderLines
            lines={[
              `Veículo: ${vehicleLabels[approvedProfile.vehicleType]}`,
              approvedProfile.vehiclePlate ? `Placa: ${approvedProfile.vehiclePlate}` : "Sem placa",
              `PIX: ${approvedProfile.pixKey || "Ainda não informado"}`,
              `Área: ${approvedProfile.workArea || "Ainda não informado"}`,
              `Horário: ${approvedProfile.workHours || "Ainda não informado"}`,
            ]}
          />
          {user?.usesCustomerApp === 1 ? (
            <OpsButton title="Pedir como cliente" variant="outline" onPress={() => router.replace("/(tabs)")} />
          ) : null}
        </OpsCard>
      ) : null}
    </OpsShell>
  );
}
