import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Page, Card, Field, OutlineButton, PrimaryButton, PEDIU, s } from "@/components/pediu-page";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

type AddressForm = {
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
};

const EMPTY_FORM: AddressForm = {
  label: "Casa",
  recipientName: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: "",
};

function formatAddress(address: { street: string; number: string; complement: string | null }) {
  return `${address.street}, ${address.number}${address.complement ? ` · ${address.complement}` : ""}`;
}

export default function AddressesPage() {
  const { isAuthenticated } = useAuth();
  const addresses = trpc.pediu.addresses.list.useQuery(undefined, { enabled: isAuthenticated });
  const create = trpc.pediu.addresses.create.useMutation({ onSuccess: () => { setForm(EMPTY_FORM); void addresses.refetch(); } });
  const update = trpc.pediu.addresses.update.useMutation({ onSuccess: () => { setEditingId(null); setForm(EMPTY_FORM); void addresses.refetch(); } });
  const remove = trpc.pediu.addresses.delete.useMutation({ onSuccess: () => void addresses.refetch() });
  const setDefault = trpc.pediu.addresses.setDefault.useMutation({ onSuccess: () => void addresses.refetch() });
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const hasFormChanges = useMemo(() => Object.values(form).some((value) => value.trim().length > 0), [form]);
  const isSaving = create.isPending || update.isPending;
  const error = create.error ?? update.error ?? remove.error ?? setDefault.error;

  const setField = (field: keyof AddressForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const startEdit = (address: NonNullable<typeof addresses.data>[number]) => {
    setEditingId(address.id);
    setForm({
      label: address.label,
      recipientName: address.recipientName,
      street: address.street,
      number: address.number,
      complement: address.complement ?? "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
    });
  };

  const submit = () => {
    const payload = {
      ...form,
      state: form.state.toUpperCase(),
      postalCode: form.postalCode.replace(/\D/g, ""),
      complement: form.complement.trim() || null,
    };
    if (editingId) update.mutate({ addressId: editingId, data: payload });
    else create.mutate({ ...payload, isDefault: (addresses.data?.length ?? 0) === 0 });
  };

  const confirmDelete = (addressId: number) => Alert.alert("Excluir endereço", "Esse endereço será removido da sua conta.", [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: () => remove.mutate({ addressId }) },
  ]);

  if (!isAuthenticated) {
    return <Page title="Meus endereços" eyebrow="SUA CONTA" back><Card><Text style={s.sectionTitle}>Entre para sincronizar seus endereços</Text><Text style={s.muted}>Os endereços ficam vinculados à sua conta e podem ser usados no checkout.</Text></Card></Page>;
  }

  return <Page title="Meus endereços" eyebrow="SUA CONTA" back>
    <Card>
      <Text style={s.sectionTitle}>{editingId ? "Editar endereço" : "Adicionar endereço"}</Text>
      <Field label="Identificação" value={form.label} onChangeText={(value) => setField("label", value)} placeholder="Casa ou trabalho" />
      <Field label="DESTINATÁRIO" value={form.recipientName} onChangeText={(value) => setField("recipientName", value)} placeholder="Nome de quem recebe" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="RUA" value={form.street} onChangeText={(value) => setField("street", value)} placeholder="Rua das Flores" /></View>
        <View style={{ width: 92 }}><Field label="NÚMERO" value={form.number} onChangeText={(value) => setField("number", value)} placeholder="100" /></View>
      </View>
      <Field label="COMPLEMENTO" value={form.complement} onChangeText={(value) => setField("complement", value)} placeholder="Apartamento, bloco ou referência" />
      <Field label="BAIRRO" value={form.neighborhood} onChangeText={(value) => setField("neighborhood", value)} placeholder="Centro" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="CIDADE" value={form.city} onChangeText={(value) => setField("city", value)} placeholder="São Paulo" /></View>
        <View style={{ width: 74 }}><Field label="UF" value={form.state} onChangeText={(value) => setField("state", value.slice(0, 2))} placeholder="SP" autoCapitalize="characters" /></View>
      </View>
      <Field label="CEP" value={form.postalCode} onChangeText={(value) => setField("postalCode", value.replace(/\D/g, "").slice(0, 8))} placeholder="01001000" keyboardType="number-pad" />
      {error ? <Text style={{ color: PEDIU.coral, fontSize: 12 }}>{error.message}</Text> : null}
      <PrimaryButton title={isSaving ? "Salvando..." : editingId ? "Salvar endereço" : "Adicionar endereço"} onPress={submit} disabled={isSaving || !hasFormChanges} />
      {editingId ? <OutlineButton title="Cancelar edição" onPress={() => { setEditingId(null); setForm(EMPTY_FORM); }} /> : null}
    </Card>

    <Card>
      <Text style={s.sectionTitle}>Endereços salvos</Text>
      {addresses.isLoading ? <Text style={s.muted}>Carregando seus endereços...</Text> : null}
      {!addresses.isLoading && !addresses.data?.length ? <Text style={s.muted}>Você ainda não salvou um endereço.</Text> : null}
      {(addresses.data ?? []).map((address) => <View key={address.id} style={{ gap: 9, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: PEDIU.line }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ flex: 1, color: PEDIU.ink, fontWeight: "900" }}>{address.label}</Text>
          {address.isDefault ? <Text style={{ color: PEDIU.green, fontSize: 11, fontWeight: "900" }}>PADRÃO</Text> : null}
        </View>
        <Text style={s.muted}>{address.recipientName}</Text>
        <Text style={s.muted}>{formatAddress(address)}</Text>
        <Text style={s.muted}>{address.neighborhood} · {address.city}/{address.state} · {address.postalCode}</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <OutlineButton title="Editar" onPress={() => startEdit(address)} />
          {!address.isDefault ? <Pressable onPress={() => setDefault.mutate({ addressId: address.id })}><Text style={{ color: PEDIU.ink, fontWeight: "900", padding: 12 }}>Definir padrão</Text></Pressable> : null}
          <Pressable onPress={() => confirmDelete(address.id)}><Text style={{ color: PEDIU.coral, fontWeight: "900", padding: 12 }}>Excluir</Text></Pressable>
        </View>
      </View>)}
    </Card>
  </Page>;
}
