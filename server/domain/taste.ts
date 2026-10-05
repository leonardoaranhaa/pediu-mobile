export type TasteMood = {
  id: string;
  title: string;
  subtitle: string;
  query: string;
  tags: string[];
};

export const TASTE_MOODS: TasteMood[] = [
  { id: "comfort", title: "Conforto", subtitle: "Comida de abraço", query: "lanche", tags: ["lanche", "hamburguer", "massa"] },
  { id: "fresh", title: "Leve", subtitle: "Frescor agora", query: "salada", tags: ["salada", "poke", "suco"] },
  { id: "party", title: "Festa", subtitle: "Pra compartilhar", query: "pizza", tags: ["pizza", "porcao", "petisco"] },
  { id: "late", title: "Madrugada", subtitle: "Aberto perto", query: "lanche", tags: ["lanche", "doce", "cafe"] },
];

export function getTasteMood(moodId: string): TasteMood | undefined {
  return TASTE_MOODS.find((mood) => mood.id === moodId);
}
