import { useState } from "react";
import { Image, Text, View } from "react-native";
import { PinMap } from "@/components/pin-map";
import { Card, Field, OutlineButton, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { geocodeTypedAddress } from "@/lib/location";
import { pickPhotoDataUrl } from "@/lib/pick-photo";
import { trpc } from "@/lib/trpc";

type Step =
  | "identity"
  | "document"
  | "address"
  | "responsible"
  | "delivery"
  | "pix"
  | "photo"
  | "fiscal";

const order: Step[] = [
  "identity",
  "document",
  "address",
  "responsible",
  "delivery",
  "pix",
  "photo",
  "fiscal",
];

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function StoreSignupForm({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<Step>("identity");
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [taxKind, setTaxKind] = useState<"cnpj" | "cpf">("cnpj");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [storefront, setStorefront] = useState("");
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pinKey, setPinKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleTaxId, setResponsibleTaxId] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [radius, setRadius] = useState("5");
  const [courierMode, setCourierMode] = useState<"own" | "pediu">("pediu");
  const [minOrder, setMinOrder] = useState("0,00");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [prepMinutes, setPrepMinutes] = useState("30");
  const [pickup, setPickup] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [logo, setLogo] = useState<string>();
  const [stateRegistration, setStateRegistration] = useState("");
  const [cityRegistration, setCityRegistration] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [cnae, setCnae] = useState("");

  const createStore = trpc.pediu.stores.create.useMutation({
    onSuccess: () => onCreated(),
  });

  const index = order.indexOf(step);
  const taxDigits = digits(taxId);
  const taxOk = taxKind === "cnpj" ? taxDigits.length === 14 : taxDigits.length === 11;

  const locate = () => {
    setMessage("");
    setLocating(true);
    void geocodeTypedAddress(`${address}, Brasil`)
      .then((point) => {
        if (!point) {
          setMessage("Não achamos esse endereço. Confira rua, número e cidade.");
          return;
        }
        setPin(point);
        setPinKey((value) => value + 1);
      })
      .catch(() => setMessage("Não foi possível consultar o mapa agora."))
      .finally(() => setLocating(false));
  };

  const next = () => {
    setMessage("");
    if (step === "identity" && (tradeName.trim().length < 2 || legalName.trim().length < 2 || phone.trim().length < 8)) {
      setMessage("Informe o nome fantasia, a razão social e o telefone.");
      return;
    }
    if (step === "document" && !taxOk) {
      setMessage(taxKind === "cnpj" ? "O CNPJ precisa ter 14 números." : "O CPF precisa ter 11 números.");
      return;
    }
    if (step === "address" && (!address.trim() || !pin)) {
      setMessage("Confirme o endereço no mapa.");
      return;
    }
    if (step === "responsible" && (responsibleName.trim().length < 2 || digits(responsibleTaxId).length !== 11 || responsiblePhone.trim().length < 8)) {
      setMessage("Informe o responsável, o CPF e o celular.");
      return;
    }
    const feeOk = /^\d+([.,]\d{1,2})?$/.test(deliveryFee.trim());
    if (step === "delivery" && (!feeOk || Number(radius) <= 0 || Number(prepMinutes) <= 0)) {
      setMessage("Informe a taxa de entrega, o raio e o tempo de preparo. Zero é permitido.");
      return;
    }
    if (step === "pix" && pixKey.trim().length < 3) {
      setMessage("Informe a chave PIX do repasse.");
      return;
    }
    const following = order[index + 1];
    if (following) setStep(following);
  };

  const save = () => {
    createStore.mutate({
      name: tradeName.trim(),
      legalName: legalName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      fiscalAddress: address.trim(),
      storefrontAddress: storefront.trim() || undefined,
      taxId: taxDigits,
      taxIdKind: taxKind,
      latitude: pin?.latitude,
      longitude: pin?.longitude,
      responsibleName: responsibleName.trim(),
      responsibleTaxId: digits(responsibleTaxId),
      responsiblePhone: responsiblePhone.trim(),
      courierMode,
      deliveryRadiusKm: Number(radius.replace(",", ".")).toFixed(2),
      minOrder: Number(minOrder.replace(",", ".") || "0").toFixed(2),
      deliveryFee: Number(deliveryFee.replace(",", ".")).toFixed(2),
      prepMinutes: Number(prepMinutes),
      pickupEnabled: pickup,
      pixKey: pixKey.trim(),
      logoData: logo,
      stateRegistration: stateRegistration.trim() || undefined,
      cityRegistration: cityRegistration.trim() || undefined,
      taxRegime: taxRegime.trim() || undefined,
      cnae: cnae.trim() || undefined,
    });
  };

  return (
    <Card>
      <Text style={s.label}>LOJA · PASSO {index + 1} DE {order.length}</Text>
      {step === "identity" ? (
        <>
          <Text style={s.sectionTitle}>Como a loja se chama</Text>
          <Field label="Nome fantasia" value={tradeName} onChangeText={setTradeName} />
          <Field label="Razão social" value={legalName} onChangeText={setLegalName} />
          <Field label="Telefone da loja" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </>
      ) : null}
      {step === "document" ? (
        <>
          <Text style={s.sectionTitle}>Documento da loja</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <OutlineButton title="CNPJ" selected={taxKind === "cnpj"} onPress={() => setTaxKind("cnpj")} />
            <OutlineButton title="CPF (MEI)" selected={taxKind === "cpf"} onPress={() => setTaxKind("cpf")} />
          </View>
          <Field label={taxKind === "cnpj" ? "CNPJ" : "CPF"} value={taxId} onChangeText={setTaxId} keyboardType="number-pad" />
        </>
      ) : null}
      {step === "address" ? (
        <>
          <Text style={s.sectionTitle}>Endereço fiscal</Text>
          <Field label="Rua, número, bairro e cidade" value={address} onChangeText={setAddress} />
          <OutlineButton title={locating ? "Procurando..." : "Ver no mapa"} onPress={locate} />
          {pin ? <PinMap latitude={pin.latitude} longitude={pin.longitude} anchorKey={pinKey} label="Loja" onChange={setPin} /> : null}
          <Field label="Endereço do balcão, se for outro" value={storefront} onChangeText={setStorefront} />
        </>
      ) : null}
      {step === "responsible" ? (
        <>
          <Text style={s.sectionTitle}>Quem responde pela loja</Text>
          <Field label="Nome" value={responsibleName} onChangeText={setResponsibleName} />
          <Field label="CPF" value={responsibleTaxId} onChangeText={setResponsibleTaxId} keyboardType="number-pad" />
          <Field label="Celular" value={responsiblePhone} onChangeText={setResponsiblePhone} keyboardType="phone-pad" />
        </>
      ) : null}
      {step === "delivery" ? (
        <>
          <Text style={s.sectionTitle}>Como a entrega funciona</Text>
          <Field label="Raio em km" value={radius} onChangeText={setRadius} keyboardType="decimal-pad" />
          <Field label="Pedido mínimo (R$)" value={minOrder} onChangeText={setMinOrder} keyboardType="decimal-pad" placeholder="0,00" />
          <Field label="Taxa de entrega (R$)" value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="decimal-pad" placeholder="5,00" />
          <Field label="Tempo de preparo (minutos)" value={prepMinutes} onChangeText={setPrepMinutes} keyboardType="number-pad" />
          <OutlineButton title={courierMode === "pediu" ? "Motoboy do Pediu" : "Motoboy da própria loja"} onPress={() => setCourierMode((value) => (value === "pediu" ? "own" : "pediu"))} />
          <OutlineButton title={pickup ? "Retirada no balcão: sim" : "Retirada no balcão: não"} onPress={() => setPickup((value) => !value)} />
        </>
      ) : null}
      {step === "pix" ? (
        <>
          <Text style={s.sectionTitle}>Para onde cai o dinheiro</Text>
          <Field label="Chave PIX" value={pixKey} onChangeText={setPixKey} autoCapitalize="none" />
        </>
      ) : null}
      {step === "photo" ? (
        <>
          <Text style={s.sectionTitle}>Foto da loja</Text>
          <Text style={s.muted}>Opcional. Pode ser a fachada ou o logo.</Text>
          <OutlineButton title={logo ? "Foto adicionada" : "Escolher foto"} onPress={() => void pickPhotoDataUrl().then((data) => data && setLogo(data)).catch(() => setMessage("Não foi possível usar essa foto."))} />
          {logo ? <Image source={{ uri: logo }} style={{ width: 72, height: 72, borderRadius: 12 }} /> : null}
        </>
      ) : null}
      {step === "fiscal" ? (
        <>
          <Text style={s.sectionTitle}>Dados fiscais</Text>
          <Text style={s.muted}>Opcional agora. A nota fiscal ainda não é emitida. Guarde o que você já tiver.</Text>
          <Field label="Inscrição estadual" value={stateRegistration} onChangeText={setStateRegistration} />
          <Field label="Inscrição municipal" value={cityRegistration} onChangeText={setCityRegistration} />
          <Field label="Regime tributário" value={taxRegime} onChangeText={setTaxRegime} placeholder="Simples, MEI ou outro" />
          <Field label="CNAE" value={cnae} onChangeText={setCnae} />
        </>
      ) : null}
      {message ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{message}</Text> : null}
      {createStore.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{createStore.error.message}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {index > 0 ? <OutlineButton title="Voltar" onPress={() => setStep(order[index - 1])} /> : null}
        {step !== "fiscal" ? <PrimaryButton title={step === "photo" ? "Pular ou continuar" : "Continuar"} onPress={next} /> : (
          <PrimaryButton title={createStore.isPending ? "Salvando..." : "Abrir minha loja"} disabled={createStore.isPending} onPress={save} />
        )}
      </View>
      {onClose ? <OutlineButton title="Agora não" onPress={onClose} /> : null}
    </Card>
  );
}
