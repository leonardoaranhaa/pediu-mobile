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
  seed = 0,
  initial,
}: {
  onChange: (extras: ProductExtras) => void;
  seed?: number;
  initial?: ProductExtras | null;
}) {
  const [imageData, setImageData] = useState<string | null>(initial?.imageData ?? null);
  const [groupName, setGroupName] = useState(initial?.optionGroups?.[0]?.name ?? "");
  const [required, setRequired] = useState(Boolean(initial?.optionGroups?.[0]?.required));
  const [choices, setChoices] = useState<Choice[]>(
    initial?.optionGroups?.[0]?.choices.length
      ? initial.optionGroups[0].choices.map((choice) => ({
          name: choice.name,
          price: choice.priceDelta.replace(".", ","),
        }))
      : [{ name: "", price: "0" }],
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const group = initial?.optionGroups?.[0];
    setImageData(initial?.imageData ?? null);
    setGroupName(group?.name ?? "");
    setRequired(Boolean(group?.required));
    setChoices(
      group?.choices.length
        ? group.choices.map((choice) => ({
            name: choice.name,
            price: choice.priceDelta.replace(".", ","),
          }))
        : [{ name: "", price: "0" }],
    );
    setMessage("");
  }, [seed]);

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

  const takePhoto = async () => {
    setMessage("");
    try {
      const data = await pickPhotoDataUrl("camera");
      if (data) setImageData(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível usar essa foto.");
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: "#111111", fontSize: 16, fontWeight: "900" }}>Foto do produto</Text>
      <Pressable
        onPress={() => void choosePhoto()}
        style={{
          minHeight: 140,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E7D7C8",
          backgroundColor: "#FFFDF9",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {imageData ? (
          <Image source={{ uri: imageData }} style={{ width: "100%", height: 180 }} />
        ) : (
          <Text style={{ color: "#6E635A", fontWeight: "700", textAlign: "center", padding: 16 }}>
            Toque para escolher uma foto da galeria
          </Text>
        )}
      </Pressable>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => void takePhoto()} style={{ flex: 1, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: "#E20D2A", fontWeight: "900", textAlign: "center" }}>Tirar foto</Text>
        </Pressable>
        <Pressable onPress={() => void choosePhoto()} style={{ flex: 1, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: "#E20D2A", fontWeight: "900", textAlign: "center" }}>
            {imageData ? "Trocar foto" : "Galeria"}
          </Text>
        </Pressable>
      </View>
      {message ? <Text style={{ color: "#E20D2A", fontWeight: "700" }}>{message}</Text> : null}
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
