import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Card, Field, OutlineButton, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import * as Auth from "@/lib/_core/auth";
import { clearAuthIntent, peekAuthIntent, signupSteps, takeAuthReturn, type SignupRole } from "@/lib/guest-access";
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

  const finish = async (token: string) => {
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
          <Text style={s.muted}>Dá para ter mais de um papel depois, na aba Perfil.</Text>
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
              })
            }
          />
          <OutlineButton title="Escolher outro papel" onPress={() => setStep("role")} />
        </Card>
      ) : null}

      {step === "store" ? (
        <Card>
          <Text style={s.sectionTitle}>Sua loja</Text>
          <Text style={s.muted}>O nome aparece para quem está por perto. Endereço e telefone ajudam na entrega.</Text>
          <Field label="Nome da loja" value={storeName} onChangeText={setStoreName} />
          <Field label="Telefone da loja" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Endereço" value={storeAddress} onChangeText={setStoreAddress} />
          {createStore.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{messageOf(createStore.error)}</Text> : null}
          <PrimaryButton
            title={createStore.isPending ? "Salvando..." : "Abrir minha loja"}
            disabled={createStore.isPending || storeName.trim().length < 2}
            onPress={() =>
              createStore.mutate({
                name: storeName.trim(),
                phone: phone.trim() || undefined,
                address: storeAddress.trim() || undefined,
              })
            }
          />
        </Card>
      ) : null}

      {step === "vehicle" ? (
        <Card>
          <Text style={s.sectionTitle}>Como você entrega</Text>
          <Text style={s.muted}>A equipe do Pediu analisa o cadastro antes de liberar ofertas.</Text>
          <View style={{ gap: 8 }}>
            <OutlineButton title="Bicicleta" onPress={() => setVehicleType("bike")} />
            <OutlineButton title="Moto" onPress={() => setVehicleType("moto")} />
            <OutlineButton title="Carro" onPress={() => setVehicleType("car")} />
          </View>
          <Text style={s.muted}>Escolhido: {vehicleType === "bike" ? "Bicicleta" : vehicleType === "moto" ? "Moto" : "Carro"}</Text>
          {vehicleType !== "bike" ? (
            <Field label="Placa" value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" />
          ) : null}
          {applyCourier.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>{messageOf(applyCourier.error)}</Text> : null}
          <PrimaryButton
            title={applyCourier.isPending ? "Enviando..." : "Enviar para análise"}
            disabled={applyCourier.isPending}
            onPress={() =>
              applyCourier.mutate({
                vehicleType,
                vehiclePlate: vehiclePlate.trim() || undefined,
                phone: phone.trim() || undefined,
              })
            }
          />
        </Card>
      ) : null}

      {step === "pending" ? (
        <Card>
          <Text style={s.sectionTitle}>Cadastro em análise</Text>
          <Text style={s.muted}>
            Recebemos seus dados. Quando a equipe liberar, as ofertas aparecem na central do entregador. Enquanto isso, você já pode olhar as lojas como cliente.
          </Text>
          <PrimaryButton title="Começar a olhar" onPress={() => router.replace(takeAuthReturn() as never)} />
        </Card>
      ) : null}
    </Page>
  );
}
