import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { SellerDock } from "@/components/seller-dock";
import { Card, Field, Page, PrimaryButton, OutlineButton, Row, s } from "@/components/pediu-page";

export default function SellerClientsPage() {
  const { user } = useAuth();
  const clients = trpc.pediu.clients.mine.useQuery(undefined, { enabled: Boolean(user) });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [selectedId, setSelectedId] = useState<number>();
  const [selectedLimit, setSelectedLimit] = useState("");
  const create = trpc.pediu.clients.create.useMutation({
    onSuccess: () => {
      setName("");
      setPhone("");
      setCreditLimit("");
      setShowForm(false);
      void clients.refetch();
    },
  });
  const setLimit = trpc.pediu.credit.setLimit.useMutation({ onSuccess: () => void clients.refetch() });
  const block = trpc.pediu.credit.block.useMutation({ onSuccess: () => void clients.refetch() });
  const totalOwed = (clients.data ?? []).reduce((sum, customer) => sum + Number(customer.balance), 0);

  const createCustomer = () => {
    const limit = creditLimit.replace(",", ".").trim();
    if (name.trim().length < 2 || !/^\d+(\.\d{1,2})?$/.test(limit)) return;
    create.mutate({ name: name.trim(), phone: phone.trim() || undefined, creditLimit: limit });
  };

  return (
    <Page title="Clientes e fiado" eyebrow="RELACIONAMENTO" dock={<SellerDock active="home" />}>
      <Card>
        <Text style={s.sectionTitle}>Saldo em aberto</Text>
        <Text style={{ color: "#FF8A3D", fontSize: 28, fontWeight: "900" }}>R$ {totalOwed.toFixed(2).replace(".", ",")}</Text>
        <Text style={s.muted}>Somatório dos saldos dos clientes, calculado a partir dos lançamentos persistidos da sua loja.</Text>
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Como funciona o fiado</Text>
        <Text style={s.muted}>
          O limite é definido pela loja para cada cliente. O saldo em aberto reduz o valor disponível; bloquear o cadastro impede novas vendas nessa conta até você liberar novamente.
        </Text>
        <Text style={s.muted}>
          Combine o prazo de pagamento diretamente com o cliente e registre cada baixa no controle financeiro da loja.
        </Text>
      </Card>
      <Card>
        <OutlineButton title={showForm ? "Fechar cadastro" : "Cadastrar cliente"} onPress={() => setShowForm((value) => !value)} />
        {showForm ? (
          <View style={{ gap: 10 }}>
            <Field label="NOME" value={name} onChangeText={setName} placeholder="Nome completo" />
            <Field label="TELEFONE" value={phone} onChangeText={setPhone} placeholder="(11) 99999-9999" keyboardType="phone-pad" />
            <Field label="LIMITE DE FIADO (R$)" value={creditLimit} onChangeText={setCreditLimit} placeholder="Ex.: 200,00" keyboardType="decimal-pad" />
            <PrimaryButton title={create.isPending ? "Salvando..." : "Salvar cliente"} disabled={create.isPending} onPress={createCustomer} />
            {create.error ? <Text style={{ color: "#FF5A4F", fontSize: 12 }}>{create.error.message}</Text> : null}
          </View>
        ) : null}
      </Card>
      <Card>
        {clients.isLoading ? <Text style={s.muted}>Carregando clientes...</Text> : null}
        {clients.isError ? <Text style={{ color: "#FF5A4F", fontSize: 12 }}>{clients.error.message}</Text> : null}
        {!clients.isLoading && !clients.data?.length ? <Text style={s.muted}>Nenhum cliente cadastrado.</Text> : null}
        {clients.data?.map((customer) => {
          const selected = selectedId === customer.id;
          const blocked = customer.status !== "active";
          const updateLimit = () => {
            const limit = selectedLimit.replace(",", ".").trim();
            if (/^\d+(\.\d{1,2})?$/.test(limit)) setLimit.mutate({ customerId: customer.id, creditLimit: limit });
          };
          return (
            <View key={customer.id} style={{ gap: 8 }}>
              <Row icon="person" title={customer.name} subtitle={`${blocked ? "Bloqueado" : "Ativo"} · Saldo R$ ${Number(customer.balance).toFixed(2).replace(".", ",")} · Disponível R$ ${Math.max(0, Number(customer.creditLimit) - Number(customer.balance)).toFixed(2).replace(".", ",")}`} onPress={() => { setSelectedId(selected ? undefined : customer.id); setSelectedLimit(Number(customer.creditLimit).toFixed(2)); }} />
              {selected ? (
                <View style={{ gap: 8, paddingLeft: 48 }}>
                  <Field label="NOVO LIMITE (R$)" value={selectedLimit} onChangeText={setSelectedLimit} placeholder="Ex.: 300,00" keyboardType="decimal-pad" />
                  <PrimaryButton title={setLimit.isPending ? "Salvando..." : "Atualizar limite"} disabled={setLimit.isPending} onPress={updateLimit} />
                  <OutlineButton title={block.isPending ? "Atualizando..." : blocked ? "Desbloquear cliente" : "Bloquear cliente"} disabled={block.isPending} onPress={() => block.mutate({ customerId: customer.id, blocked: !blocked })} />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
    </Page>
  );
}
