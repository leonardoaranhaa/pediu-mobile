import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type AccountPreferenceIcon = ComponentProps<typeof MaterialIcons>["name"];

export type AccountPreferenceLink = {
  key: string;
  icon: AccountPreferenceIcon;
  title: string;
  subtitle: string;
  path: string;
};

export type AccountPreferenceSection = {
  key: string;
  label: string;
  links: readonly AccountPreferenceLink[];
};

/**
 * Superfície funcional da central de conta.
 *
 * Manter os atalhos aqui evita que uma tela nova deixe de expor uma área que
 * já existia na versão anterior. As rotas continuam sendo telas reais e cada
 * uma mantém seu contrato de persistência no backend ou no storage por usuário.
 */
export const ACCOUNT_PREFERENCE_SECTIONS: readonly AccountPreferenceSection[] = [
  {
    key: "experience",
    label: "EXPERIÊNCIA DO PEDIU",
    links: [
      {
        key: "advanced",
        icon: "tune",
        title: "Mascote, movimento e casa inteligente",
        subtitle: "Personalidade visual, dicas, localização e diagnóstico",
        path: "/account/settings/advanced",
      },
      {
        key: "notifications",
        icon: "notifications",
        title: "Notificações",
        subtitle: "Avisos de pedidos, suporte, ofertas e push",
        path: "/account/notifications",
      },
    ],
  },
  {
    key: "account",
    label: "CONTA E CHECKOUT",
    links: [
      {
        key: "personal",
        icon: "person",
        title: "Dados pessoais",
        subtitle: "Nome, e-mail e informações da conta",
        path: "/account/personal",
      },
      {
        key: "addresses",
        icon: "location-on",
        title: "Endereços e localização",
        subtitle: "Casa, trabalho e endereço padrão de entrega",
        path: "/account/addresses",
      },
      {
        key: "payments",
        icon: "account-balance-wallet",
        title: "Pagamento e Pediu Pay",
        subtitle: "Preferências de PIX, cartão e dinheiro",
        path: "/account/payment-methods",
      },
    ],
  },
  {
    key: "trust",
    label: "CONFIANÇA E SUPORTE",
    links: [
      {
        key: "privacy",
        icon: "security",
        title: "Segurança e privacidade",
        subtitle: "Sessão, consentimentos, exportação e LGPD",
        path: "/account/privacy",
      },
      {
        key: "support",
        icon: "help-outline",
        title: "Ajuda e assistente",
        subtitle: "Dúvidas, suporte e acompanhamento de chamados",
        path: "/account/support-chat",
      },
    ],
  },
] as const;

export const ACCOUNT_PREFERENCE_LINK_KEYS = ACCOUNT_PREFERENCE_SECTIONS.flatMap(
  (section) => section.links.map((link) => link.key),
);
