import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";
import { resolveCurrentLocation, type ResolvedLocation } from "@/lib/location";
import { useAuth } from "@/hooks/use-auth";

function addressPayload(resolved: ResolvedLocation, name: string | null | undefined) {
  const details = resolved.details;
  const postalCode = (details.postalCode ?? "").replace(/\D/g, "");
  const normalizedRegion = (details.region ?? "").trim();
  const stateByName: Record<string, string> = {
    "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM", "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES", "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR", "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO",
  };
  const state = normalizedRegion.length === 2 ? normalizedRegion.toUpperCase() : stateByName[normalizedRegion];
  if (!details.street?.trim() || !details.city?.trim() || !state || postalCode.length !== 8) {
    throw new Error("O GPS não retornou um endereço completo. Edite o endereço antes de salvar.");
  }
  return {
    label: "Localização atual",
    recipientName: name?.trim() || "Cliente",
    street: details.street.trim(),
    number: details.streetNumber?.trim() || "S/N",
    neighborhood: (details.district ?? details.subregion ?? "Centro").trim(),
    city: details.city.trim(),
    state,
    postalCode,
    latitude: String(resolved.latitude),
    longitude: String(resolved.longitude),
    isDefault: true,
  };
}

export default function LocationScreen() {
  const { user, isAuthenticated } = useAuth();
  const [address, setAddress] = useState("");
  const [shortAddress, setShortAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const createAddress = trpc.pediu.addresses.create.useMutation({
    onSuccess: () => {
      Alert.alert("Endereço salvo", "Sua localização agora está disponível no checkout.");
      router.replace("/(tabs)");
    },
    onError: (error) => Alert.alert("Endereço", error.message),
  });

  const requestGps = async () => {
    setLoading(true);
    try {
      const next = await resolveCurrentLocation();
      setResolved(next);
      setAddress(next.address);
      setShortAddress(next.shortAddress);
      setCoordinates({ latitude: next.latitude, longitude: next.longitude });
    } catch (error) {
      Alert.alert("Localização", error instanceof Error ? error.message : "Não foi possível capturar seu endereço.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then((permission) => {
      if (permission.granted) void requestGps();
    });
  }, []);

  const saveAddress = () => {
    if (!isAuthenticated) {
      Alert.alert("Entre na sua conta", "Salve o endereço depois de fazer login.");
      return;
    }
    if (!resolved) {
      Alert.alert("Localização", "Capture sua localização antes de salvar.");
      return;
    }
    try {
      createAddress.mutate(addressPayload(resolved, user?.name));
    } catch (error) {
      Alert.alert("Endereço", error instanceof Error ? error.message : "Endereço incompleto");
    }
  };

  return <Page title="Onde você está?" eyebrow="ENTREGA" back>
    <View style={{ backgroundColor: PEDIU.ink, borderRadius: 27, padding: 20, gap: 9 }}>
      <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: PEDIU.coral, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="my-location" size={23} color={PEDIU.white} /></View>
      <Text style={{ color: PEDIU.white, fontSize: 23, lineHeight: 28, fontWeight: "900" }}>Entrega no lugar certo.</Text>
      <Text style={{ color: "#BCD0D1", fontSize: 12, lineHeight: 18 }}>Capture sua localização e o Pediu transforma o GPS em um endereço completo para facilitar cada pedido.</Text>
    </View>
    <Card>
      <Text style={s.sectionTitle}>{shortAddress || "Defina seu endereço"}</Text>
      <Text style={s.muted}>{address || "Usaremos sua localização para mostrar estabelecimentos próximos e calcular opções de entrega."}</Text>
      {coordinates ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: PEDIU.coralSoft, borderRadius: 12, padding: 10 }}><MaterialIcons name="verified" size={16} color={PEDIU.green} /><Text style={{ color: PEDIU.ink, fontSize: 11, fontWeight: "800" }}>Localização confirmada automaticamente</Text></View> : null}
      <PrimaryButton title={loading ? "Buscando endereço..." : "Capturar minha localização"} onPress={() => void requestGps()} disabled={loading} />
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={s.label}>OU EDITE MANUALMENTE</Text>
        <TextInput value={address} onChangeText={(value) => { setAddress(value); setResolved(null); setCoordinates(null); setShortAddress(""); }} placeholder="Rua, número, complemento, bairro e cidade" placeholderTextColor={PEDIU.muted} multiline style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, color: PEDIU.text, backgroundColor: PEDIU.white, minHeight: 76, textAlignVertical: "top" }} />
      </View>
      <PrimaryButton title={createAddress.isPending ? "Salvando endereço..." : "Salvar no meu perfil"} onPress={saveAddress} disabled={createAddress.isPending || !resolved} />
      <OutlineButton title="Continuar sem salvar" onPress={() => router.replace("/(tabs)" as never)} />
    </Card>
  </Page>;
}
