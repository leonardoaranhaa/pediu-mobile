import { Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export function StoreReviewBanner() {
  const { user } = useAuth();
  const isSeller = user?.role === "merchant" || user?.role === "admin";
  const store = trpc.pediu.stores.mine.useQuery(undefined, { enabled: isSeller });
  const status = store.data?.approvalStatus;
  if (status !== "pending" && status !== "rejected") return null;
  const pending = status === "pending";
  return (
    <View
      style={{
        backgroundColor: pending ? "#FFF3C4" : "#FDE8EA",
        borderRadius: 16,
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ color: "#111111", fontSize: 16, fontWeight: "900" }}>
        {pending ? "Sua loja está em análise" : "Sua loja foi reprovada"}
      </Text>
      <Text style={{ color: "#3A2A22", fontSize: 13, lineHeight: 18 }}>
        {pending
          ? "Os clientes ainda não veem os produtos. Quando a análise terminar, você recebe um aviso."
          : "Fale com o suporte do Pediu para entender o que precisa mudar."}
      </Text>
    </View>
  );
}
