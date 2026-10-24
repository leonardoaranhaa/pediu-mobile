import type { MascotReaction } from "@/lib/mascot-scenes";

export type OnboardingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  reaction: MascotReaction;
  speech: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "peca",
    eyebrow: "PEÇA",
    title: "Tudo o que você precisa, em um só lugar.",
    body: "Restaurantes, mercados, farmácias e serviços perto de você. Com um toque, o pedido sai.",
    reaction: "hungry",
    speech: "Snif, snif… já tô com fome! Vamos pedir algo gostoso?",
  },
  {
    id: "acompanhe",
    eyebrow: "ACOMPANHE",
    title: "Seu pedido do começo ao fim.",
    body: "Atualizações em tempo real, mapa ao vivo e chat com o entregador. Sem surpresa na porta.",
    reaction: "curious",
    speech: "Estou de olho no caminho. Já já chega quentinho!",
  },
  {
    id: "venda",
    eyebrow: "VENDA",
    title: "Seu negócio também cabe no Pediu.",
    body: "Catálogo, pedidos, clientes e anúncios com IA. Tudo em uma operação simples e local.",
    reaction: "happy",
    speech: "Obaaa! Hora de vender e brilhar com o seu negócio!",
  },
  {
    id: "seu-pediu",
    eyebrow: "SEU PEDIU",
    title: "O Pediu se adapta a você.",
    body: "Escolha temas, personalize o mascote e descubra vantagens exclusivas. É o seu jeito de pedir.",
    reaction: "celebrate",
    speech: "Estou dançando porque você chegou! Bora começar?",
  },
];
