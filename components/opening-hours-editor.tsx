import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  defaultOpeningHours,
  parseOpeningHours,
  type OpeningHours,
  type WeekdayHours,
} from "@/shared/pilot-ops";

const LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function initialHours(raw: string | null | undefined): OpeningHours {
  return parseOpeningHours(raw) ?? defaultOpeningHours();
}

export function OpeningHoursEditor({
  initial,
  onChange,
}: {
  initial?: string | null;
  onChange: (json: string) => void;
}) {
  const [hours, setHours] = useState<OpeningHours>(() => initialHours(initial));

  const commit = (next: OpeningHours) => {
    setHours(next);
    onChange(JSON.stringify(next));
  };

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
