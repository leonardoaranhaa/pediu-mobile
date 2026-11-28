import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { CoachMarkTour, type CoachStep } from "@/components/coach-mark-tour";

export const HOME_TOUR_KEY = "pediu:tour:customer-home:v1";

export const HOME_TOUR_STEPS: CoachStep[] = [
  {
    target: "home.address",
    title: "Comece pelo endereço",
    body: "Toque aqui para dizer onde receber. As lojas, o tempo e a taxa mudam conforme o endereço.",
    reaction: "curious",
    radius: 24,
  },
  {
    target: "home.search",
    title: "Ache o que der vontade",
    body: "Busque um prato, uma loja ou um item do mercado.",
    reaction: "hungry",
    radius: 18,
  },
  {
    target: "home.categories",
    title: "Explore por categoria",
    body: "Lanches, pizza, japonesa, mercado… deslize para o lado e toque para filtrar.",
    reaction: "happy",
    radius: 20,
  },
  {
    target: "home.mascot",
    title: "Peça do seu jeito",
    body: "Toque em mim para pedir por voz ou por texto. Eu ajudo a montar a sacola.",
    reaction: "celebrate",
    radius: 999,
  },
  {
    target: "home.banners",
    title: "Ofertas e Clube Pediu",
    body: "Cupons e o Clube aparecem aqui. Cada pedido junta pontos para trocar por desconto.",
    reaction: "happy",
    radius: 24,
  },
  {
    target: "home.nav.orders",
    title: "Acompanhe seu pedido",
    body: "Depois de pedir, o andamento fica em Pedidos, do aceite da loja até a entrega.",
    reaction: "curious",
    radius: 18,
  },
];

let replayRequested = false;

/** Shows the home tour again the next time the home is open (e.g. from Help). */
export async function replayHomeTour() {
  replayRequested = true;
  await AsyncStorage.removeItem(HOME_TOUR_KEY).catch(() => undefined);
}

/**
 * First-visit tour of the customer home. Runs once per device, after the
 * catalog has loaded so every highlighted element is in place.
 */
export function HomeTour({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    void AsyncStorage.getItem(HOME_TOUR_KEY)
      .catch(() => "done")
      .then((value) => {
        if (!active || (value && !replayRequested)) return;
        replayRequested = false;
        // Let the first screen settle before dimming it.
        timer = setTimeout(() => setVisible(true), 900);
      });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [ready]);

  const close = useCallback(() => {
    setVisible(false);
    void AsyncStorage.setItem(HOME_TOUR_KEY, "done").catch(() => undefined);
  }, []);

  return <CoachMarkTour steps={HOME_TOUR_STEPS} visible={visible} onClose={close} finishLabel="Vamos pedir!" />;
}
