import { OpsDock } from "@/components/pediu-ops-ui";

export type SellerTab = "home" | "orders" | "catalog" | "ads" | "settings";

export function SellerDock({ active }: { active: SellerTab }) {
  return (
    <OpsDock
      items={[
        { label: "Início", icon: "storefront", to: "/seller", active: active === "home" },
        { label: "Pedidos", icon: "receipt-long", to: "/seller/orders", active: active === "orders" },
        { label: "Cardápio", icon: "restaurant-menu", to: "/seller/catalog", active: active === "catalog" },
        { label: "Anúncios", icon: "campaign", to: "/seller/ads", active: active === "ads" },
        { label: "Ajustes", icon: "tune", to: "/seller/settings", active: active === "settings" },
      ]}
    />
  );
}
