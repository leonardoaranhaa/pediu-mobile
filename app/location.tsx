import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { Page, Card, PrimaryButton, OutlineButton, PEDIU, s } from "@/components/pediu-page";

export default function LocationScreen() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const useGps = async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Localização", "Permissão não concedida. Você pode informar o endereço manualmente.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [result] = await Location.reverseGeocodeAsync(position.coords);
      const label = [result?.street, result?.streetNumber, result?.district, result?.city].filter(Boolean).join(", ");
      if (label) setAddress(label);
    } finally { setLoading(false); }
  };
  return <Page title="Onde você está?" eyebrow="ENTREGA" back>
    <Card>
      <Text style={s.sectionTitle}>Defina seu endereço</Text>
      <Text style={s.muted}>Usaremos sua localização para mostrar estabelecimentos e calcular opções de entrega.</Text>
      <PrimaryButton title={loading ? "Localizando..." : "Usar minha localização"} onPress={() => void useGps()} disabled={loading} />
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={s.label}>Ou informe manualmente</Text>
        <TextInput value={address} onChangeText={setAddress} placeholder="Rua, número, bairro e cidade" style={{ borderWidth: 1, borderColor: PEDIU.line, borderRadius: 14, padding: 14, color: PEDIU.text, backgroundColor: PEDIU.white }} />
      </View>
      <OutlineButton title="Continuar" onPress={() => router.replace("/(tabs)" as never)} disabled={!address.trim()} />
    </Card>
  </Page>;
}
