import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

export const PEDIU = {
  coral: "#FF5A4F",
  coralSoft: "#FFF0EC",
  orange: "#FF8A3D",
  ink: "#163B48",
  text: "#18252B",
  muted: "#7C8A8F",
  canvas: "#FFF8F1",
  white: "#FFFFFF",
  line: "#F0E9E3",
  green: "#36B878",
};

export function Page({ children, title, eyebrow, back = true, action }: { children: ReactNode; title: string; eyebrow?: string; back?: boolean; action?: ReactNode }) {
  return <View style={s.root}><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.header}>
      {back ? <Pressable onPress={() => router.back()} style={s.back}><MaterialIcons name="arrow-back" size={21} color={PEDIU.ink} /></Pressable> : <View style={s.backPlaceholder} />}
      <View style={{ flex: 1 }}>{eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}<Text style={s.title}>{title}</Text></View>
      {action}
    </View>
    {children}
  </ScrollView></View>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) { return <View style={[s.card, style]}>{children}</View>; }
export function Section({ title, children }: { title: string; children: ReactNode }) { return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>; }
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={{ gap: 6 }}><Text style={s.label}>{label}</Text><TextInput {...props} placeholderTextColor={PEDIU.muted} style={[s.input, props.multiline && { minHeight: 86, textAlignVertical: "top" }]} /></View>; }
export function PrimaryButton({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={[s.primary, disabled && { opacity: .5 }]}><Text style={s.primaryText}>{title}</Text><MaterialIcons name="arrow-forward" size={18} color={PEDIU.white} /></Pressable>; }
export function OutlineButton({ title, onPress }: { title: string; onPress?: () => void }) { return <Pressable onPress={onPress} style={s.outline}><Text style={s.outlineText}>{title}</Text></Pressable>; }
export function Row({ icon, title, subtitle, onPress, right }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; subtitle?: string; onPress?: () => void; right?: ReactNode }) { return <Pressable onPress={onPress} style={s.row}><View style={s.icon}><MaterialIcons name={icon} size={20} color={PEDIU.ink} /></View><View style={{ flex: 1, gap: 2 }}><Text style={s.rowTitle}>{title}</Text>{subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}</View>{right ?? <MaterialIcons name="chevron-right" size={21} color={PEDIU.muted} />}</Pressable>; }
export function ToggleRow({ icon, title, subtitle, value, onChange }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; subtitle?: string; value: boolean; onChange: (value: boolean) => void }) { return <Row icon={icon} title={title} subtitle={subtitle} right={<Pressable onPress={() => onChange(!value)} style={[s.toggle, value && s.toggleOn]}><View style={[s.knob, value && s.knobOn]} /></Pressable>} />; }

export const s = StyleSheet.create({
  root:{flex:1,backgroundColor:PEDIU.canvas},content:{padding:20,paddingTop:58,paddingBottom:36,gap:16},header:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:4},back:{width:40,height:40,borderRadius:14,backgroundColor:PEDIU.white,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:PEDIU.line},backPlaceholder:{width:40},eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:PEDIU.coral},title:{fontSize:26,fontWeight:"900",color:PEDIU.ink},card:{backgroundColor:PEDIU.white,borderRadius:20,padding:16,borderWidth:1,borderColor:PEDIU.line,gap:13},section:{gap:10},sectionTitle:{fontSize:15,fontWeight:"900",color:PEDIU.ink},label:{fontSize:10,fontWeight:"900",letterSpacing:.7,color:PEDIU.muted},input:{backgroundColor:PEDIU.white,borderWidth:1,borderColor:PEDIU.line,borderRadius:14,paddingHorizontal:14,paddingVertical:12,color:PEDIU.ink,fontSize:14},primary:{minHeight:52,borderRadius:16,backgroundColor:PEDIU.coral,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10},primaryText:{color:PEDIU.white,fontSize:14,fontWeight:"900"},outline:{minHeight:50,borderRadius:16,borderWidth:1,borderColor:PEDIU.coral,alignItems:"center",justifyContent:"center"},outlineText:{color:PEDIU.coral,fontSize:13,fontWeight:"900"},row:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:13},icon:{width:42,height:42,borderRadius:13,backgroundColor:PEDIU.coralSoft,alignItems:"center",justifyContent:"center"},rowTitle:{fontSize:13,fontWeight:"900",color:PEDIU.ink},muted:{fontSize:12,lineHeight:18,color:PEDIU.muted},toggle:{width:48,height:28,borderRadius:14,backgroundColor:"#D9D5D0",padding:3,justifyContent:"center"},toggleOn:{backgroundColor:PEDIU.coral},knob:{width:22,height:22,borderRadius:11,backgroundColor:PEDIU.white},knobOn:{alignSelf:"flex-end"},
});