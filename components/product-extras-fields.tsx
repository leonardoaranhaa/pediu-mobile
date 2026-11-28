import { useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { pickPhotoDataUrl } from "@/lib/pick-photo";

export type ProductExtras = {
  imageData?: string;
  optionGroups?: Array<{
    name: string;
    required: boolean;
    minChoices?: number;
    maxChoices?: number;
    choices: Array<{ name: string; priceDelta: string }>;
  }>;
};

type Choice = { name: string; price: string };
type GroupDraft = { name: string; min: number; max: number; choices: Choice[] };

const MAX_GROUPS = 6;
const MAX_CHOICES = 12;
const INK = "#111111";
const MUTED = "#6E635A";
const LINE = "#F0E4D8";
const RED = "#E20D2A";

const inputStyle = {
  borderWidth: 1,
  borderColor: LINE,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: INK,
} as const;

function emptyGroup(): GroupDraft {
  return { name: "", min: 0, max: 1, choices: [{ name: "", price: "0" }] };
}

function draftsFrom(initial?: ProductExtras | null): GroupDraft[] {
  const groups = initial?.optionGroups ?? [];
  if (!groups.length) return [];
  return groups.map((group) => {
    const min = group.minChoices ?? (group.required ? 1 : 0);
    return {
      name: group.name,
      min,
      max: Math.max(group.maxChoices ?? 1, min, 1),
      choices: group.choices.length
        ? group.choices.map((choice) => ({ name: choice.name, price: choice.priceDelta.replace(".", ",") }))
        : [{ name: "", price: "0" }],
    };
  });
}

function cleanChoices(choices: Choice[]) {
  return choices
    .map((choice) => ({
      name: choice.name.trim(),
      priceDelta: choice.price.replace(",", ".").trim() || "0",
    }))
    .filter((choice) => choice.name.length > 0 && /^\d+(\.\d{1,2})?$/.test(choice.priceDelta));
}

function ruleLabel(min: number, max: number) {
  if (min === 0) return max === 1 ? "Opcional: o cliente pode escolher 1." : `Opcional: o cliente pode escolher até ${max}.`;
  if (min === max) return min === 1 ? "Obrigatório: o cliente escolhe 1." : `Obrigatório: o cliente escolhe ${min}.`;
  return `Obrigatório: o cliente escolhe de ${min} a ${max}.`;
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  const button = (text: string, next: number, disabled: boolean, a11y: string) => (
    <Pressable
      disabled={disabled}
      onPress={() => onChange(next)}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: LINE,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ color: INK, fontSize: 20, fontWeight: "900" }}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: MUTED, fontSize: 12, fontWeight: "800" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {button("−", value - 1, value <= min, `Diminuir ${label.toLowerCase()}`)}
        <Text style={{ color: INK, fontSize: 18, fontWeight: "900", minWidth: 20, textAlign: "center" }}>{value}</Text>
        {button("+", value + 1, value >= max, `Aumentar ${label.toLowerCase()}`)}
      </View>
    </View>
  );
}

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
  const [groups, setGroups] = useState<GroupDraft[]>(() => draftsFrom(initial));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setImageData(initial?.imageData ?? null);
    setGroups(draftsFrom(initial));
    setMessage("");
  }, [seed]);

  useEffect(() => {
    const extras: ProductExtras = {};
    if (imageData) extras.imageData = imageData;
    const optionGroups = groups.flatMap((group) => {
      const choices = cleanChoices(group.choices);
      if (!group.name.trim() || !choices.length) return [];
      const min = Math.min(group.min, choices.length);
      const max = Math.min(Math.max(group.max, min, 1), choices.length);
      return [{ name: group.name.trim(), required: min > 0, minChoices: min, maxChoices: max, choices }];
    });
    if (optionGroups.length) extras.optionGroups = optionGroups;
    onChange(extras);
  }, [groups, imageData, onChange]);

  const updateGroup = (index: number, patch: Partial<GroupDraft>) =>
    setGroups((current) => current.map((group, i) => (i === index ? { ...group, ...patch } : group)));

  const updateChoice = (groupIndex: number, choiceIndex: number, patch: Partial<Choice>) =>
    setGroups((current) =>
      current.map((group, i) =>
        i === groupIndex
          ? { ...group, choices: group.choices.map((choice, j) => (j === choiceIndex ? { ...choice, ...patch } : choice)) }
          : group,
      ),
    );

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
      <Text style={{ color: MUTED, fontSize: 12, fontWeight: "800" }}>OPCIONAIS E ADICIONAIS</Text>
      <Text style={{ color: MUTED }}>
        Crie um grupo para cada escolha: por exemplo, "Ponto da carne" (obrigatório, 1) e "Adicionais" (opcional, até 3).
      </Text>
      {groups.map((group, groupIndex) => {
        const filled = cleanChoices(group.choices).length;
        const choiceCap = Math.max(filled, 1);
        return (
          <View
            key={groupIndex}
            style={{ gap: 8, borderWidth: 1, borderColor: LINE, borderRadius: 16, padding: 12, backgroundColor: "#FFFDF9" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: INK, fontWeight: "900" }}>Grupo {groupIndex + 1}</Text>
              <Pressable
                onPress={() => setGroups((current) => current.filter((_, i) => i !== groupIndex))}
                accessibilityRole="button"
                accessibilityLabel={`Remover grupo ${group.name || groupIndex + 1}`}
                style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}
              >
                <Text style={{ color: RED, fontWeight: "800" }}>Remover grupo</Text>
              </Pressable>
            </View>
            <TextInput
              value={group.name}
              onChangeText={(name) => updateGroup(groupIndex, { name })}
              placeholder="Ex.: Ponto da carne, Adicionais, Sabores"
              placeholderTextColor={MUTED}
              accessibilityLabel="Nome do grupo"
              style={inputStyle}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Stepper
                label="Mínimo"
                value={group.min}
                min={0}
                max={choiceCap}
                onChange={(min) => updateGroup(groupIndex, { min, max: Math.max(group.max, min, 1) })}
              />
              <Stepper
                label="Máximo"
                value={group.max}
                min={Math.max(group.min, 1)}
                max={Math.min(Math.max(choiceCap, 1), MAX_CHOICES)}
                onChange={(max) => updateGroup(groupIndex, { max })}
              />
            </View>
            <Text style={{ color: MUTED, fontWeight: "700" }}>{ruleLabel(group.min, group.max)}</Text>
            {group.choices.map((choice, choiceIndex) => (
              <View key={choiceIndex} style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={choice.name}
                  onChangeText={(name) => updateChoice(groupIndex, choiceIndex, { name })}
                  placeholder="Nome da opção"
                  placeholderTextColor={MUTED}
                  accessibilityLabel="Nome da opção"
                  style={[inputStyle, { flex: 1, minWidth: 0 }]}
                />
                <TextInput
                  value={choice.price}
                  onChangeText={(price) => updateChoice(groupIndex, choiceIndex, { price })}
                  placeholder="0,00"
                  placeholderTextColor={MUTED}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Preço adicional da opção"
                  style={[inputStyle, { width: 84 }]}
                />
              </View>
            ))}
            {group.choices.length < MAX_CHOICES ? (
              <Pressable
                onPress={() => updateGroup(groupIndex, { choices: [...group.choices, { name: "", price: "0" }] })}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={{ color: RED, fontWeight: "800" }}>Adicionar opção</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {groups.length < MAX_GROUPS ? (
        <Pressable
          onPress={() => setGroups((current) => [...current, emptyGroup()])}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: RED, fontWeight: "900" }}>
            {groups.length ? "Adicionar outro grupo" : "Adicionar grupo de opções"}
          </Text>
        </Pressable>
      ) : null}
      {message ? <Text style={{ color: "#E20D2A" }}>{message}</Text> : null}
    </View>
  );
}
