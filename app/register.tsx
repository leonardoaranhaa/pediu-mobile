import { router } from "expo-router";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { StoreSignupForm } from "@/components/store-signup-form";
import { Card, Field, OutlineButton, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import * as Auth from "@/lib/_core/auth";
import { clearAuthIntent, peekAuthIntent, signupSteps, takeAuthReturn, type SignupRole } from "@/lib/guest-access";
import { geocodeTypedAddress } from "@/lib/location";
import { pickPhotoDataUrl } from "@/lib/pick-photo";
import { trpc } from "@/lib/trpc";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível criar a conta.";
}

const roleCopy: Record<SignupRole, { title: string; body: string }> = {
  customer: {
    title: "Cliente",
    body: "Pedir comida, mercado e acompanhar a entrega.",
  },
  merchant: {
    title: "Lojista",
    body: "Cadastrar a loja e receber pedidos.",
  },
  courier: {
    title: "Motoboy",
    body: "Fazer entregas depois da aprovação.",
  },
};

export default function RegisterScreen() {
  const { refresh } = useAuth({ autoFetch: false });
  const preset = peekAuthIntent()?.role ?? "customer";
  const [role, setRole] = useState<SignupRole>(preset);
  const [step, setStep] = useState<"role" | "account" | "store" | "vehicle" | "pending">("role");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [vehicleType, setVehicleType] = useState<"bike" | "moto" | "car">("moto");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentPhoto, setDocumentPhoto] = useState<string>();
  const [vehiclePhoto, setVehiclePhoto] = useState<string>();
  const [selfiePhoto, setSelfiePhoto] = useState<string>();
  const [courierPix, setCourierPix] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pinKey, setPinKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [mapMessage, setMapMessage] = useState("");

  const finish = async (token: string) => {
    await Auth.clearUserInfo();
    await Auth.setSessionToken(token);
    await refresh();
  };

  const signup = trpc.auth.signup.useMutation({
    onSuccess: async (result) => {
      await finish(result.token);
      const next = signupSteps(role)[2];
      if (next === "store" || next === "vehicle") setStep(next);
      else router.replace(takeAuthReturn() as never);
    },
  });
  const createStore = trpc.pediu.stores.create.useMutation({
    onSuccess: () => {
      clearAuthIntent();
      router.replace("/seller" as never);
    },
  });
  const applyCourier = trpc.pediu.courier.profile.register.useMutation({
    onSuccess: () => setStep("pending"),
  });

  const accountReady = name.trim().length >= 2 && email.includes("@") && password.length >= 8;

  return (
    <Page title="Criar conta" eyebrow="COMECE AGORA" back>
      {step === "role" ? (
        <Card>
          <Text style={s.sectionTitle}>O que você quer fazer no Pediu?</Text>
          <Text style={s.muted}>Este papel fica nesta conta. Para usar outro, crie uma conta nova.</Text>
          {(Object.keys(roleCopy) as SignupRole[]).map((option) => (
            <OutlineButton
              key={option}
              title={`${roleCopy[option].title} — ${roleCopy[option].body}`}
              onPress={() => {
                setRole(option);
                setStep("account");
              }}
            />
          ))}
          <OutlineButton title="Já tenho uma conta" onPress={() => router.push("/login")} />
        </Card>
      ) : null}

      {step === "account" ? (
        <Card>
          <Text style={s.sectionTitle}>{roleCopy[role].title}</Text>
          <Text style={s.muted}>{roleCopy[role].body}</Text>
          <Field label="Nome" value={name} onChangeText={setName} autoComplete="name" />
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          <Text style={s.muted}>A senha precisa ter pelo menos 8 caracteres.</Text>
          {signup.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{messageOf(signup.error)}</Text> : null}
          <PrimaryButton
            title={signup.isPending ? "Criando..." : role === "customer" ? "Criar conta" : "Continuar"}
            disabled={signup.isPending || !accountReady}
            onPress={() =>
              signup.mutate({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                password,
                intent: role === "customer" ? "customer" : role,
              })
            }
          />
          <OutlineButton title="Escolher outro papel" onPress={() => setStep("role")} />
        </Card>
      ) : null}

      {step === "store" ? (
        <StoreSignupForm
          onCreated={() => {
            clearAuthIntent();
            router.replace("/seller" as never);
          }}
        />
      ) : null}

      {step === "vehicle" ? (
        <Card>
          <Text style={s.sectionTitle}>Como você entrega</Text>
          <Text style={s.muted}>A equipe do Pediu analisa o cadastro antes de liberar ofertas.</Text>
          <View style={{ gap: 8 }}>
            <OutlineButton title="Bicicleta" selected={vehicleType === "bike"} onPress={() => setVehicleType("bike")} />
            <OutlineButton title="Moto" selected={vehicleType === "moto"} onPress={() => setVehicleType("moto")} />
            <OutlineButton title="Carro" selected={vehicleType === "car"} onPress={() => setVehicleType("car")} />
          </View>
          <Text style={s.muted}>Escolhido: {vehicleType === "bike" ? "Bicicleta" : vehicleType === "moto" ? "Moto" : "Carro"}</Text>
          {vehicleType !== "bike" ? (
            <Field label="Placa" value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" />
          ) : null}
          <Field label="Número da CNH" value={documentNumber} onChangeText={setDocumentNumber} keyboardType="number-pad" />
          <Field label="Chave PIX" value={courierPix} onChangeText={setCourierPix} autoCapitalize="none" />
          <Field label="Cidade ou bairros" value={workArea} onChangeText={setWorkArea} />
          <Field label="Dias e horários" value={workHours} onChangeText={setWorkHours} placeholder="Seg a sex, 11h às 23h" />
          <OutlineButton title={documentPhoto ? "CNH adicionada" : "Foto da CNH"} onPress={() => void pickPhotoDataUrl().then((data) => data && setDocumentPhoto(data)).catch((error: unknown) => setMapMessage(error instanceof Error ? error.message : "Não foi possível usar essa foto."))} />
          <OutlineButton title={vehiclePhoto ? "Veículo adicionado" : "Foto do veículo"} onPress={() => void pickPhotoDataUrl().then((data) => data && setVehiclePhoto(data)).catch((error: unknown) => setMapMessage(error instanceof Error ? error.message : "Não foi possível usar essa foto."))} />
          <OutlineButton title={selfiePhoto ? "Sua foto adicionada" : "Sua foto"} onPress={() => void pickPhotoDataUrl().then((data) => data && setSelfiePhoto(data)).catch((error: unknown) => setMapMessage(error instanceof Error ? error.message : "Não foi possível usar essa foto."))} />
          {documentPhoto ? <Image source={{ uri: documentPhoto }} style={{ width: 72, height: 72, borderRadius: 12 }} /> : null}
          {applyCourier.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{messageOf(applyCourier.error)}</Text> : null}
          {mapMessage ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{mapMessage}</Text> : null}
          <PrimaryButton
            title={applyCourier.isPending ? "Enviando..." : "Enviar para análise"}
            disabled={applyCourier.isPending || !documentNumber.trim() || !documentPhoto || !vehiclePhoto || !selfiePhoto || !courierPix.trim() || !workArea.trim() || !workHours.trim() || (vehicleType !== "bike" && !vehiclePlate.trim())}
            onPress={() =>
              applyCourier.mutate({
                vehicleType,
                vehiclePlate: vehiclePlate.trim() || undefined,
                phone: phone.trim() || undefined,
                documentNumber: documentNumber.trim(),
                documentPhoto,
                vehiclePhoto,
                selfiePhoto,
                pixKey: courierPix.trim(),
                workArea: workArea.trim(),
                workHours: workHours.trim(),
              })
            }
          />
        </Card>
      ) : null}

      {step === "pending" ? (
        <Card>
          <Text style={s.sectionTitle}>Cadastro em análise</Text>
          <Text style={s.muted}>
            Recebemos seus dados. Quando a equipe liberar, as ofertas aparecem aqui na central do entregador.
          </Text>
          <PrimaryButton title="Ir para a central" onPress={() => router.replace("/courier" as never)} />
        </Card>
      ) : null}
    </Page>
  );
}
