import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";
import { resolveCurrentLocation } from "@/lib/location";

export default function LocationScreen() {
  const [address, setAddress] = useState("");
  const [shortAddress, setShortAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const requestGps = async () => {
    setLoading(true);
    try {
      const resolved = await resolveCurrentLocation();
      setAddress(resolved.address);
      setShortAddress(resolved.shortAddress);
      setCoordinates({ latitude: resolved.latitude, longitude: resolved.longitude });
    } catch (error) {
      Alert.alert("Localização", error instanceof Error ? error.message : "Não foi possível capturar seu endereço.");
    } finally { setLoading(false); }
  };
  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then((permission) => {
      if (!permission.granted) return;
      void resolveCurrentLocation().then((resolved) => {
        setAddress(resolved.address);
        setShortAddress(resolved.shortAddress);
        setCoordinates({ latitude: resolved.latitude, longitude: resolved.longitude });
      }).catch(() => undefined);
    });
  }, []);
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
        <TextInput value={address} onChangeText={(value) => { setAddress(value); setCoordinates(null); setShortAddress(""); }} placeholder="Rua, número, complemento, bairro e cidade" placeholderTextColor={PEDIU.muted} multiline style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, color: PEDIU.text, backgroundColor: PEDIU.white, minHeight: 76, textAlignVertical: "top" }} />
      </View>
      <OutlineButton title="Continuar" onPress={() => router.replace("/(tabs)" as never)} disabled={!address.trim()} />
    </Card>
  </Page>;
}
