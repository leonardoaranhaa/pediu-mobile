export type MascotReaction =
  | "idle"
  | "hungry"
  | "happy"
  | "full"
  | "sleepy"
  | "avoid"
  | "curious"
  | "celebrate";

export function mascotReactionForPath(pathname: string): MascotReaction {
  const path = pathname.toLowerCase();
  if (path.includes("settings") || path.includes("advanced")) return "avoid";
  if (path.includes("profile")) return "avoid";
  if (path.includes("success")) return "full";
  if (path.includes("order") || path.includes("tracking")) return "curious";
  if (path.includes("cart") || path.includes("checkout")) return "happy";
  if (path.includes("coupon") || path.includes("product")) return "happy";
  if (path.includes("seller") || path.includes("courier")) return "curious";
  return "hungry";
}

export type MascotGesture =
  | "stand"
  | "lie"
  | "coverEyes"
  | "sleep"
  | "peek"
  | "wave"
  | "belly"
  | "sniff"
  | "dance";

export type MascotScene = {
  id: string;
  reaction: MascotReaction;
  gesture: MascotGesture;
  line: string;
  duration: number;
};

export const AMBIENT_SCENES: MascotScene[] = [
  {
    id: "hungry",
    reaction: "hungry",
    gesture: "lie",
    line: "Aí que fomeee… pede alguma coisinha pra gente comer. Snif, snif!",
    duration: 10_000,
  },
  {
    id: "sniff",
    reaction: "hungry",
    gesture: "sniff",
    line: "Snif, snif… senti um cheirinho de coisa gostosa por aqui.",
    duration: 8_500,
  },
  {
    id: "curious",
    reaction: "curious",
    gesture: "peek",
    line: "Será que vem um mimo por aí? Eu senti um cheirinho de coisa boa.",
    duration: 11_500,
  },
  {
    id: "stretch",
    reaction: "idle",
    gesture: "stand",
    line: "Estiquei as perninhas. Pronto para descobrir seu próximo pedido!",
    duration: 10_000,
  },
  {
    id: "sleepy",
    reaction: "sleepy",
    gesture: "sleep",
    line: "Só um cochilinho… me chama quando escolher o que vamos pedir.",
    duration: 12_000,
  },
  {
    id: "dance",
    reaction: "celebrate",
    gesture: "dance",
    line: "Estou dançando baixinho porque hoje tem coisa boa no ar!",
    duration: 9_000,
  },
  {
    id: "watching",
    reaction: "idle",
    gesture: "stand",
    line: "Estou de olho em tudo com carinho. Escolha no seu tempo.",
    duration: 13_000,
  },
];

function sceneById(id: string) {
  return AMBIENT_SCENES.find((scene) => scene.id === id) ?? AMBIENT_SCENES[0];
}

export function sceneForReaction(reaction: MascotReaction): MascotScene {
  if (reaction === "hungry") return sceneById("hungry");
  if (reaction === "curious") return sceneById("curious");
  if (reaction === "sleepy") return sceneById("sleepy");
  if (reaction === "happy" || reaction === "celebrate")
    return {
      id: reaction,
      reaction,
      gesture: "wave",
      line: "Obaaa! Essa escolha deixou meu coração quentinho!",
      duration: 5_500,
    };
  if (reaction === "full")
    return {
      id: "full",
      reaction,
      gesture: "belly",
      line: "Agora sim… vou tirar um cochilo de barriga cheia.",
      duration: 10_000,
    };
  if (reaction === "avoid")
    return {
      id: "avoid",
      reaction,
      gesture: "coverEyes",
      line: "Não vou espiar nada, prometo. Privacidade é coisa séria!",
      duration: 8_000,
    };
  return {
    id: "idle",
    reaction: "idle",
    gesture: "stand",
    line: "Estou aqui com você. Vamos encontrar uma boa escolha?",
    duration: 8_000,
  };
}
