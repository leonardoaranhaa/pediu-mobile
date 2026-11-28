import { Pressable, Text, View, type TextStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { optionGroupHint, optionGroupLimits, type OptionGroupRule, type OptionSelection } from "@/lib/option-selection";

type Choice = { id: number; name: string; priceDelta: string | number };

type Palette = { accent: string; accentSoft: string; line: string; surface: string; ink: string; muted: string };

/**
 * One add-on group. Radio buttons when the group allows one choice,
 * checkboxes when it allows several. Nothing starts selected.
 */
export function OptionGroupPicker({
  group,
  selection,
  onToggle,
  palette,
  titleStyle,
}: {
  group: Omit<OptionGroupRule, "choices"> & { choices: Choice[] };
  selection: OptionSelection;
  onToggle: (choiceId: number) => void;
  palette: Palette;
  titleStyle?: TextStyle;
}) {
  const { max } = optionGroupLimits(group);
  const multiple = max > 1;
  const chosen = selection[group.id] ?? [];
  return (
    <View style={{ gap: 8 }} accessibilityRole={multiple ? undefined : "radiogroup"}>
      <View style={{ gap: 2 }}>
        <Text style={titleStyle}>{group.name}</Text>
        <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "700" }}>
          {optionGroupHint(group)}
          {multiple ? ` · ${chosen.length} de ${max}` : ""}
        </Text>
      </View>
      {group.choices.map((choice) => {
        const on = chosen.includes(choice.id);
        const delta = Number(choice.priceDelta);
        const price = delta > 0 ? ` · + R$ ${delta.toFixed(2).replace(".", ",")}` : "";
        const icon = multiple
          ? on ? "check-box" : "check-box-outline-blank"
          : on ? "radio-button-checked" : "radio-button-unchecked";
        return (
          <Pressable
            key={choice.id}
            onPress={() => onToggle(choice.id)}
            accessibilityRole={multiple ? "checkbox" : "radio"}
            accessibilityState={multiple ? { checked: on } : { selected: on }}
            accessibilityLabel={`${choice.name}${price}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 48,
              borderWidth: 1,
              borderColor: on ? palette.accent : palette.line,
              backgroundColor: on ? palette.accentSoft : palette.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <MaterialIcons name={icon} size={22} color={on ? palette.accent : palette.muted} />
            <Text style={{ flex: 1, color: palette.ink, fontWeight: "800" }}>
              {choice.name}
              {price}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
