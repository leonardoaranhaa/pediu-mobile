import { useState } from "react";
import { Alert, Text } from "react-native";
import { Page, Card, Field, PrimaryButton, Row, s } from "@/components/pediu-page";

export default function AddressesPage() {
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState<string[]>([]);

  const saveAddress = () => {
    if (!address.trim()) {
      Alert.alert("Endereço", "Informe um endereço.");
      return;
    }
    setSaved((items) => [...items, address.trim()]);
    setAddress("");
  };

  return (
    <Page title="Meus endereços" eyebrow="ENTREGA">
      <Card>
        <Field label="Novo endereço" value={address} onChangeText={setAddress} placeholder="Rua, número, bairro e complemento" multiline />
        <PrimaryButton title="Salvar endereço" onPress={saveAddress} />
      </Card>
      <Card>
        {saved.length ? saved.map((item, index) => (
          <Row key={`${item}-${index}`} icon="location-on" title={item} subtitle={index === 0 ? "Principal" : "Endereço salvo"} />
        )) : <Text style={s.muted}>Nenhum endereço salvo ainda.</Text>}
      </Card>
    </Page>
  );
}
