import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { EmptyState } from "@/components/pediu/empty-state";
import { Card, Page, PEDIU, PrimaryButton, s } from "@/components/pediu-page";
import { useAuth } from "@/hooks/use-auth";
import { PEDIU_TOKENS } from "@/lib/pediu-tokens";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";

const kindLabel: Record<string, string> = {
  restaurant: "Restaurante",
  market: "Mercado",
  service: "Serviço",
};

export default function AdminStoresPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin";
  const utils = trpc.useUtils();
  const query = trpc.admin.stores.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });
  const update = trpc.admin.storeUpdate.useMutation({
    onSuccess: async () => {
      await utils.admin.stores.invalidate();
      await utils.admin.overview.invalidate();
    },
  });

  if (loading) return <Page title="Estabelecimentos" eyebrow="OPS"><ActivityIndicator color={PEDIU.coral} /></Page>;
  if (!allowed) {
    return (
      <Page title="Acesso restrito" eyebrow="OPS">
        <EmptyState icon="lock-outline" title="Somente administradores" body="Gestão de lojas exige papel admin." actionLabel="Voltar" onAction={() => router.back()} />
      </Page>
    );
  }

  return (
    <Page title="Estabelecimentos" eyebrow="MASTER MANAGEMENT">
      <Card>
        <Text style={s.sectionTitle}>Lojas · Flash · Vertical</Text>
        <Text style={s.muted}>Ligue Flash, marque Mercado ou suspenda abertura. Alterações geram auditoria.</Text>
      </Card>
      {query.isLoading ? <ActivityIndicator color={PEDIU.coral} /> : null}
      {query.error ? <Text style={{ color: PEDIU.coral, fontWeight: "700" }}>Falha ao carregar lojas.</Text> : null}
      {!query.isLoading && !query.error && !(query.data?.length ?? 0) ? (
        <EmptyState icon="storefront" title="Nenhuma loja cadastrada" body="Quando lojistas concluírem o onboarding, elas entram neste painel." />
      ) : null}
      {query.data?.map((store) => {
        const open = Boolean(store.isOpen);
        const flash = Boolean(store.flashEnabled);
        return (
          <Card key={store.id}>
            <Text style={s.rowTitle}>{store.name}</Text>
            <Text style={s.muted}>
              #{store.id} · {kindLabel[store.kind] ?? store.kind} · taxa R$ {Number(store.deliveryFee).toFixed(2).replace(".", ",")}
              {flash ? ` · Flash ${store.flashEtaMaxMinutes} min` : ""}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <Pressable
                onPress={() => update.mutate({ storeId: store.id, isOpen: !open })}
                style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: open ? PEDIU.green : PEDIU.canvas }}
              >
                <Text style={{ color: open ? PEDIU.white : PEDIU.ink, fontWeight: "900", fontSize: 11 }}>{open ? "Aberta" : "Fechada"}</Text>
              </Pressable>
              <Pressable
                onPress={() => update.mutate({ storeId: store.id, flashEnabled: !flash })}
                style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: flash ? PEDIU_TOKENS.accent : PEDIU.canvas }}
              >
                <Text style={{ color: flash ? PEDIU_TOKENS.accentFg : PEDIU.ink, fontWeight: "900", fontSize: 11 }}>{flash ? "Flash ON" : "Flash OFF"}</Text>
              </Pressable>
              {(["restaurant", "market", "service"] as const).map((kind) => (
                <Pressable
                  key={kind}
                  onPress={() => update.mutate({ storeId: store.id, kind })}
                  style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: store.kind === kind ? PEDIU.coral : PEDIU.canvas }}
                >
                  <Text style={{ color: store.kind === kind ? PEDIU.white : PEDIU.ink, fontWeight: "900", fontSize: 11 }}>{kindLabel[kind]}</Text>
                </Pressable>
              ))}
            </View>
            {update.error && update.variables?.storeId === store.id ? (
              <Text style={{ color: PEDIU.coral, marginTop: 8 }}>{update.error.message}</Text>
            ) : null}
          </Card>
        );
      })}
      {update.isPending ? <PrimaryButton title="Salvando…" disabled /> : null}
    </Page>
  );
}
