import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  defaultOpeningHours,
  parseOpeningHours,
  type OpeningHours,
  type WeekdayHours,
} from "@/shared/pilot-ops";

const LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function initialHours(raw: string | null | undefined): OpeningHours | null {
  return parseOpeningHours(raw);
}

export function OpeningHoursEditor({
  initial,
  onChange,
}: {
  initial?: string | null;
  onChange: (json: string | null) => void;
}) {
  const parsed = initialHours(initial);
  const [defined, setDefined] = useState(parsed !== null);
  const [hours, setHours] = useState<OpeningHours>(
    () => parsed ?? defaultOpeningHours(),
  );

  const commit = (next: OpeningHours) => {
    setHours(next);
    onChange(JSON.stringify(next));
  };

  const start = () => {
    const next = defaultOpeningHours();
    setDefined(true);
    commit(next);
  };

  if (!defined) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: "#6E635A", fontSize: 12, fontWeight: "800" }}>
          HORÁRIO POR DIA
        </Text>
        <Text style={{ color: "#111111", fontWeight: "800" }}>
          Sem horário definido
        </Text>
        <Text style={{ color: "#6E635A", fontSize: 13, lineHeight: 18 }}>
          A loja fica aberta sempre que "Loja aberta" estiver ligado. Nada é salvo até você definir os dias.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={start}
          style={{
            minHeight: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E20D2A",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#E20D2A", fontWeight: "900" }}>Definir horário</Text>
        </Pressable>
      </View>
    );
  }

  const patch = (day: string, value: Partial<WeekdayHours>) => {
    const current = hours[day as keyof OpeningHours] ?? {
      open: "11:00",
      close: "23:00",
      closed: false,
    };
    commit({ ...hours, [day]: { ...current, ...value } });
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: "#6E635A", fontSize: 12, fontWeight: "800" }}>
        HORÁRIO POR DIA
      </Text>
      {LABELS.map((label, index) => {
        const key = String(index);
        const day = hours[key as keyof OpeningHours] ?? {
          open: "11:00",
          close: "23:00",
          closed: false,
        };
        const closed = Boolean(day.closed);
        return (
          <View key={key} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Pressable onPress={() => patch(key, { closed: !closed })} style={{ width: 54 }}>
              <Text style={{ color: closed ? "#E20D2A" : "#111111", fontWeight: "900" }}>
                {label}
              </Text>
            </Pressable>
            {closed ? (
              <Text style={{ color: "#6E635A" }}>Fechado</Text>
            ) : (
              <>
                <TextInput
                  value={day.open}
                  onChangeText={(open) => patch(key, { open })}
                  placeholder="11:00"
                  style={{
                    width: 72,
                    borderWidth: 1,
                    borderColor: "#F0E4D8",
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    color: "#111111",
                  }}
                />
                <Text style={{ color: "#6E635A" }}>às</Text>
                <TextInput
                  value={day.close}
                  onChangeText={(close) => patch(key, { close })}
                  placeholder="23:00"
                  style={{
                    width: 72,
                    borderWidth: 1,
                    borderColor: "#F0E4D8",
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    color: "#111111",
                  }}
                />
              </>
            )}
          </View>
        );
      })}
      <Text style={{ color: "#6E635A", fontSize: 12 }}>
        Toque no dia para marcar como fechado. A loja continua aparecendo, com o próximo horário.
      </Text>
    </View>
  );
}
