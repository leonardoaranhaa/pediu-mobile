import { useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { pickPhotoDataUrl } from "@/lib/pick-photo";

export type ProductExtras = {
  imageData?: string;
  optionGroups?: Array<{
    name: string;
    required: boolean;
    choices: Array<{ name: string; priceDelta: string }>;
  }>;
};

type Choice = { name: string; price: string };

export function ProductExtrasFields({
  onChange,
}: {
  onChange: (extras: ProductExtras) => void;
}) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [required, setRequired] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([{ name: "", price: "0" }]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const cleaned = choices
      .map((choice) => ({
        name: choice.name.trim(),
        priceDelta: choice.price.replace(",", ".").trim() || "0",
      }))
      .filter((choice) => choice.name.length > 0 && /^\d+(\.\d{1,2})?$/.test(choice.priceDelta));
    const extras: ProductExtras = {};
    if (imageData) extras.imageData = imageData;
    if (groupName.trim() && cleaned.length) {
      extras.optionGroups = [
        { name: groupName.trim(), required, choices: cleaned },
      ];
    }
    onChange(extras);
  }, [choices, groupName, imageData, onChange, required]);

  const choosePhoto = async () => {
    setMessage("");
    try {
      const data = await pickPhotoDataUrl();
      if (data) setImageData(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível usar essa foto.");
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => void choosePhoto()}>
        <Text style={{ color: "#E20D2A", fontWeight: "900" }}>
          {imageData ? "Trocar foto do produto" : "Adicionar foto do produto"}
        </Text>
      </Pressable>
      {imageData ? (
        <Image source={{ uri: imageData }} style={{ width: 96, height: 96, borderRadius: 12 }} />
      ) : null}
      <Text style={{ color: "#6E635A", fontSize: 12, fontWeight: "800" }}>
        OPCIONAIS E ADICIONAIS
      </Text>
      <TextInput
        value={groupName}
        onChangeText={setGroupName}
        placeholder="Ex.: Tamanho ou adicionais"
        placeholderTextColor="#6E635A"
        style={{
          borderWidth: 1,
          borderColor: "#F0E4D8",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: "#111111",
        }}
      />
      <Pressable onPress={() => setRequired((value) => !value)}>
        <Text style={{ color: "#111111", fontWeight: "800" }}>
          {required ? "Escolha obrigatória" : "Escolha opcional"}
        </Text>
      </Pressable>
      {choices.map((choice, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={choice.name}
            onChangeText={(name) =>
              setChoices((current) =>
                current.map((item, itemIndex) => (itemIndex === index ? { ...item, name } : item)),
              )
            }
            placeholder="Nome"
            placeholderTextColor="#6E635A"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#F0E4D8",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#111111",
            }}
          />
          <TextInput
            value={choice.price}
            onChangeText={(price) =>
              setChoices((current) =>
                current.map((item, itemIndex) => (itemIndex === index ? { ...item, price } : item)),
              )
            }
            placeholder="0,00"
            placeholderTextColor="#6E635A"
            keyboardType="decimal-pad"
            style={{
              width: 84,
              borderWidth: 1,
              borderColor: "#F0E4D8",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#111111",
            }}
          />
        </View>
      ))}
      <Pressable
        onPress={() => setChoices((current) => [...current, { name: "", price: "0" }])}
      >
        <Text style={{ color: "#E20D2A", fontWeight: "800" }}>Adicionar opção</Text>
      </Pressable>
      {message ? <Text style={{ color: "#E20D2A" }}>{message}</Text> : null}
    </View>
  );
}
