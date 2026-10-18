import { useEffect, useMemo, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Card,
  Field,
  Page,
  PrimaryButton,
  PEDIU,
  s,
} from "@/components/pediu-page";
import { askToJoin } from "@/components/auth-prompt";
import { useAuth } from "@/hooks/use-auth";
import { cartFlashEligible } from "@/lib/cart";
import { cancellationPolicyCopy, deliverySummaryCopy } from "@/lib/checkout-copy";
import { useCart } from "@/providers/cart-provider";
import { trpc } from "@/lib/trpc";

type PaymentMethod = "pix" | "cash";
type Fulfillment = "standard" | "flash";

const TIP_OPTIONS = [0, 2, 5, 8] as const;

function money(value: number | string) {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
}

function checkoutKey() {
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CheckoutScreen() {
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ coupon?: string }>();
  const { items, total: estimatedTotal, hydrated, clear } = useCart();
  const flags = trpc.pediu.experience.flags.useQuery(undefined, {
    staleTime: 60_000,
  });
  const addresses = trpc.pediu.addresses.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [fulfillmentMode, setFulfillmentMode] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [address, setAddress] = useState("");
  const [addressId, setAddressId] = useState<number | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("standard");
  const [tipAmount, setTipAmount] = useState(0);
  const normalizedCouponInput = couponCode.trim().toUpperCase();
  const tipEnabled = flags.data?.tip !== false;
  const flashFlagOn = flags.data?.flash !== false;
  const flashEligibleLocal = cartFlashEligible(items);
  const marketCart = items[0]?.storeKind === "market";
  const effectiveFulfillmentMode = marketCart ? "delivery" : fulfillmentMode;
  const quoteInput = useMemo(
    () => ({
      storeId: items[0]?.storeId ?? 1,
      addressId:
        effectiveFulfillmentMode === "delivery" ? addressId : undefined,
      fulfillmentMode: effectiveFulfillmentMode,
      fulfillment,
      tipAmount: tipEnabled ? tipAmount : 0,
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        note: item.note,
      })),
      couponCode: appliedCouponCode || undefined,
    }),
    [
      addressId,
      appliedCouponCode,
      effectiveFulfillmentMode,
      fulfillment,
      items,
      tipAmount,
      tipEnabled,
    ],
  );
  const quote = trpc.pediu.checkout.quote.useQuery(quoteInput, {
    enabled: isAuthenticated && hydrated && items.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const createPix = trpc.pediu.payments.createPix.useMutation();
  const createOrder = trpc.pediu.orders.create.useMutation({
    onSuccess: async (result) => {
      let paymentId = result.paymentId;
      if (paymentMethod === "pix" && result.paymentId) {
        try {
          const pixCharge = await createPix.mutateAsync({
            orderId: result.orderId,
          });
          paymentId = pixCharge.paymentId;
        } catch {
          // The idempotent order key lets the customer safely retry PIX setup.
          return;
        }
      }
      clear();
      router.replace({
        pathname: "/order/success",
        params: {
          orderId: String(result.orderId),
          paymentId: paymentId ? String(paymentId) : "",
          total: quote.data?.total ?? "",
        },
      });
    },
  });
  useEffect(() => {
    if (!idempotencyKey) setIdempotencyKey(checkoutKey());
  }, [idempotencyKey]);

  useEffect(() => {
    const coupon = params.coupon?.trim().toUpperCase();
    if (coupon && !appliedCouponCode) {
      setCouponCode(coupon);
      setAppliedCouponCode(coupon);
    }
  }, [appliedCouponCode, params.coupon]);

  useEffect(() => {
    const preferred =
      addresses.data?.find((item) => item.isDefault === 1) ??
      addresses.data?.[0];
    if (!address && preferred) {
      setAddressId(preferred.id);
      setAddress(
        [
          `${preferred.street}, ${preferred.number}`,
          preferred.complement,
          `${preferred.neighborhood} · ${preferred.city}/${preferred.state}`,
          preferred.postalCode,
        ]
          .filter(Boolean)
          .join(", "),
      );
    }
  }, [address, addresses.data]);

  useEffect(() => {
    if (marketCart && fulfillmentMode !== "delivery") {
      setFulfillmentMode("delivery");
    }
  }, [fulfillmentMode, marketCart]);

  useEffect(() => {
    if (
      fulfillment !== "flash" ||
      fulfillmentMode !== "delivery" ||
      !quote.isError
    )
      return;
    if ((quote.error?.message ?? "").toLowerCase().includes("flash"))
      setFulfillment("standard");
  }, [fulfillment, fulfillmentMode, quote.error?.message, quote.isError]);

  const applyCoupon = () => {
    if (appliedCouponCode && normalizedCouponInput === appliedCouponCode) {
      setAppliedCouponCode("");
      setCouponCode("");
      return;
    }
    if (normalizedCouponInput) setAppliedCouponCode(normalizedCouponInput);
  };

  const submit = () => {
    if (
      !items.length ||
      (effectiveFulfillmentMode === "delivery" && !addressId) ||
      !idempotencyKey ||
      !quote.data ||
      quote.isFetching
    )
      return;
    createOrder.mutate({
      idempotencyKey,
      storeId: quote.data.storeId,
      total: quote.data.total,
      paymentMethod,
      fulfillmentMode: effectiveFulfillmentMode,
      fulfillment: quote.data.fulfillment,
      tipAmount: Number(quote.data.tipAmount),
      ...(effectiveFulfillmentMode === "delivery"
        ? { addressId, deliveryAddress: address.trim() }
        : {}),
      couponCode: quote.data.couponCode,
      items: quote.data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        note: item.note,
      })),
    });
  };

  if (!hydrated)
    return (
      <Page title="Checkout" eyebrow="PEDIDO" back>
        <Card>
          <Text style={s.sectionTitle}>Restaurando pedido...</Text>
        </Card>
      </Page>
    );
  if (!isAuthenticated)
    return (
      <Page title="Checkout" eyebrow="PEDIDO" back>
        <Card>
          <Text style={s.sectionTitle}>Entre para continuar</Text>
          <Text style={s.muted}>
            Para fechar o pedido e acompanhar o pagamento, crie uma conta ou entre na sua.
          </Text>
          <PrimaryButton
            title="Criar conta ou entrar"
            onPress={() => askToJoin({ action: "checkout", returnTo: "/checkout" })}
          />
        </Card>
      </Page>
    );
  if (!items.length)
    return (
      <Page title="Checkout" eyebrow="PEDIDO" back>
        <Card>
          <Text style={s.sectionTitle}>Seu carrinho está vazio</Text>
          <PrimaryButton
            title="Voltar ao carrinho"
            onPress={() => router.replace("/cart")}
          />
        </Card>
      </Page>
    );

  const quotedTotal = quote.data ? Number(quote.data.total) : estimatedTotal;
  const deliverySummary = deliverySummaryCopy({
    mode: effectiveFulfillmentMode,
    isFlash: quote.data?.isFlash,
    flashEtaMaxMinutes: quote.data?.flashEtaMaxMinutes,
  });
  const couponCanBeRemoved = Boolean(
    appliedCouponCode && normalizedCouponInput === appliedCouponCode,
  );

  return (
    <Page title="Finalizar pedido" eyebrow="CHECKOUT" back>
      <Card>
        <Text style={s.sectionTitle}>Conferência do pedido</Text>
        {quote.isLoading ? (
          <Text style={s.muted}>
            Conferindo preços, disponibilidade e cupom...
          </Text>
        ) : null}
        {quote.isError ? (
          <>
            <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
              {quote.error.message}
            </Text>
            <PrimaryButton
              title="Atualizar cotação"
              onPress={() => void quote.refetch()}
            />
          </>
        ) : null}
        {quote.data ? (
          <>
            <Text style={s.muted}>Valores confirmados para este pedido.</Text>
            <View style={{ gap: 6, marginTop: 10 }}>
              {quote.data.items.map((item) => (
                <View key={item.productId} style={row}>
                  <Text style={s.muted}>
                    {item.quantity} × {item.name}
                  </Text>
                  <Text style={value}>{money(item.lineTotal)}</Text>
                </View>
              ))}
            </View>
            <View
              style={{
                gap: 8,
                borderTopWidth: 1,
                borderTopColor: PEDIU.line,
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <View style={row}>
                <Text style={s.muted}>Subtotal</Text>
                <Text style={value}>{money(quote.data.subtotal)}</Text>
              </View>
              <View style={row}>
                <Text style={s.muted}>
                  {quote.data.fulfillmentMode === "pickup"
                    ? "Retirada"
                    : "Entrega"}
                </Text>
                <Text style={value}>{money(quote.data.deliveryFee)}</Text>
              </View>
              {Number(quote.data.discount) > 0 ? (
                <View style={row}>
                  <Text style={s.muted}>
                    Desconto{" "}
                    {quote.data.couponCode ? `(${quote.data.couponCode})` : ""}
                  </Text>
                  <Text style={{ color: PEDIU.green, fontWeight: "900" }}>
                    − {money(quote.data.discount)}
                  </Text>
                </View>
              ) : null}
              <View style={row}>
                <Text style={{ color: PEDIU.ink, fontWeight: "900" }}>
                  Total confirmado
                </Text>
                <Text
                  style={{
                    color: PEDIU.coral,
                    fontSize: 21,
                    fontWeight: "900",
                  }}
                >
                  {money(quote.data.total)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={s.muted}>
            Total estimado: {money(estimatedTotal)}. O valor final aparece quando o endereço estiver escolhido.
          </Text>
        )}
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Cupom de desconto</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="CÓDIGO"
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Ex.: BEMVINDO10"
              autoCapitalize="characters"
            />
          </View>
          <PrimaryButton
            title={couponCanBeRemoved ? "Remover" : "Aplicar"}
            onPress={applyCoupon}
            disabled={!normalizedCouponInput && !appliedCouponCode}
          />
        </View>
        {appliedCouponCode && !quote.isError && quote.data ? (
          <Text style={{ color: PEDIU.green, fontSize: 12, fontWeight: "800" }}>
            Cupom {appliedCouponCode} validado. Desconto:{" "}
            {money(quote.data.discount)}.
          </Text>
        ) : null}
        {appliedCouponCode && quote.isError ? (
          <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
            O cupom não foi aplicado. Remova-o ou informe outro código.
          </Text>
        ) : null}
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Como receber?</Text>
        {marketCart ? (
          <Text style={s.muted}>
            Compras de mercado entram na rota Pediu Entregas: o mercado separa e
            um entregador parceiro leva até seu endereço.
          </Text>
        ) : null}
        <Text style={s.muted}>
          {effectiveFulfillmentMode === "delivery"
            ? "A taxa muda conforme o endereço escolhido. Depois que a loja aceitar, você acompanha cada etapa."
            : "A retirada não tem taxa de entrega. A loja avisa quando o pedido estiver pronto para você buscar."}
        </Text>
        {quote.data && effectiveFulfillmentMode === "delivery" ? (
          <View style={{ backgroundColor: PEDIU.peach, borderRadius: 13, padding: 11, gap: 3 }}>
            <Text style={{ color: PEDIU.ink, fontWeight: "900" }}>
              Taxa de entrega: {money(quote.data.deliveryFee)}
            </Text>
            <Text style={s.muted}>
              {quote.data.isFlash && quote.data.flashEtaMaxMinutes
                ? `Flash: previsão de até ${quote.data.flashEtaMaxMinutes} min após a confirmação.`
                : "O prazo final depende do preparo da loja e da disponibilidade de um entregador."}
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(marketCart
            ? (["delivery"] as const)
            : (["delivery", "pickup"] as const)
          ).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setFulfillmentMode(mode)}
              style={{
                flex: 1,
                minHeight: 58,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor:
                  fulfillmentMode === mode ? PEDIU.coral : PEDIU.line,
                backgroundColor:
                  fulfillmentMode === mode ? PEDIU.coralSoft : PEDIU.white,
                borderRadius: 14,
                paddingHorizontal: 8,
              }}
            >
              <Text
                style={{
                  color: fulfillmentMode === mode ? PEDIU.coral : PEDIU.muted,
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                {mode === "delivery" ? "Entregar" : "Retirar na loja"}
              </Text>
            </Pressable>
          ))}
        </View>
        {!marketCart && effectiveFulfillmentMode === "pickup" ? (
          <Text style={s.muted}>Você receberá a confirmação quando o pedido estiver pronto para retirada.</Text>
        ) : null}
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Antes de confirmar</Text>
        <View
          style={[
            checkoutStyles.infoPanel,
            { backgroundColor: PEDIU.peach, borderColor: PEDIU.line },
          ]}
        >
          <View style={[checkoutStyles.infoIcon, { backgroundColor: PEDIU.white }]}>
            <MaterialIcons name={deliverySummary.icon} size={21} color={PEDIU.coral} />
          </View>
          <View style={checkoutStyles.infoBody}>
            <Text style={s.sectionTitle}>{deliverySummary.title}</Text>
            <Text style={checkoutStyles.infoLabel}>{deliverySummary.label}</Text>
            <Text style={s.muted}>
              {quote.isLoading
                ? "Conferindo as condições reais deste endereço..."
                : deliverySummary.detail}
            </Text>
          </View>
        </View>
        <View
          style={[
            checkoutStyles.infoPanel,
            { backgroundColor: PEDIU.coralSoft, borderColor: "#F6C5C5" },
          ]}
        >
          <View style={[checkoutStyles.infoIcon, { backgroundColor: PEDIU.white }]}>
            <MaterialIcons name="event-busy" size={21} color={PEDIU.coral} />
          </View>
          <View style={checkoutStyles.infoBody}>
            <Text style={s.sectionTitle}>Cancelamento transparente</Text>
            {cancellationPolicyCopy.map((policy) => (
              <View key={policy.title} style={checkoutStyles.policyRow}>
                <View style={[checkoutStyles.policyDot, { backgroundColor: PEDIU.coral }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={checkoutStyles.policyTitle}>{policy.title}</Text>
                  <Text style={s.muted}>{policy.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Card>
      {flashFlagOn ? (
        <Card>
          <Text style={s.sectionTitle}>Pediu Flash</Text>
          <Text style={s.muted}>
            {flashEligibleLocal
              ? "Prioridade na fila da loja e do entregador. A taxa aparece depois que você escolhe o endereço."
              : "Esta loja não oferece Flash no momento."}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {(["standard", "flash"] as const).map((option) => {
              const selected = fulfillment === option;
              const disabled =
                option === "flash" &&
                (!flashEligibleLocal || fulfillmentMode !== "delivery");
              return (
                <Pressable
                  key={option}
                  disabled={disabled}
                  onPress={() => setFulfillment(option)}
                  style={{
                    flex: 1,
                    minHeight: 52,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: selected ? PEDIU.coral : PEDIU.line,
                    backgroundColor: selected ? PEDIU.coralSoft : PEDIU.white,
                    borderRadius: 14,
                    opacity: disabled ? 0.45 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? PEDIU.coral : PEDIU.muted,
                      fontWeight: "900",
                    }}
                  >
                    {option === "flash" ? "Flash" : "Padrão"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fulfillment === "flash" && quote.data?.isFlash ? (
            <Text
              style={{ color: PEDIU.green, fontSize: 12, fontWeight: "800" }}
            >
              Flash ativo · até{" "}
              {quote.data.flashEtaMaxMinutes ?? "o prazo informado"} min
            </Text>
          ) : null}
        </Card>
      ) : null}
      {tipEnabled ? (
        <Card>
          <Text style={s.sectionTitle}>Gorjeta para a entrega</Text>
          <Text style={s.muted}>
            A gorjeta vai para quem entrega e não vira ponto do Clube.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {TIP_OPTIONS.map((value) => (
              <Pressable
                key={value}
                onPress={() => setTipAmount(value)}
                style={{
                  flex: 1,
                  minHeight: 46,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: tipAmount === value ? PEDIU.coral : PEDIU.line,
                  backgroundColor:
                    tipAmount === value ? PEDIU.coralSoft : PEDIU.white,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: tipAmount === value ? PEDIU.coral : PEDIU.muted,
                    fontWeight: "900",
                  }}
                >
                  {value ? money(value) : "Sem gorjeta"}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}
      {fulfillmentMode === "delivery" ? (
        <Card>
          <Text style={s.sectionTitle}>Endereço de entrega</Text>
          {addresses.data?.length ? (
            <View style={{ gap: 8 }}>
              {addresses.data.map((saved) => {
                const label = [
                  `${saved.street}, ${saved.number}`,
                  saved.complement,
                  `${saved.neighborhood} · ${saved.city}/${saved.state}`,
                  saved.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <Pressable
                    key={saved.id}
                    onPress={() => {
                      setAddressId(saved.id);
                      setAddress(label);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        addressId === saved.id ? PEDIU.coral : PEDIU.line,
                      backgroundColor:
                        addressId === saved.id ? PEDIU.coralSoft : PEDIU.white,
                      borderRadius: 14,
                      padding: 12,
                      gap: 3,
                    }}
                  >
                    <Text style={{ color: PEDIU.ink, fontWeight: "900" }}>
                      {saved.label}
                      {saved.isDefault ? " · Padrão" : ""}
                    </Text>
                    <Text style={s.muted}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Field
            label="ENDEREÇO ESCOLHIDO"
            value={address}
            onChangeText={() => undefined}
            placeholder="Escolha um endereço salvo com ponto no mapa"
            multiline
            editable={false}
          />
          <Text style={s.muted}>
            A entrega usa o endereço salvo, com um ponto no mapa. Para incluir
            outro, abra Meus endereços e salve de novo. Digitar aqui não muda o
            destino.
          </Text>
          {addresses.data?.some(
            (saved) =>
              saved.id === addressId && (!saved.latitude || !saved.longitude),
          ) ? (
            <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
              Este endereço ainda não tem um ponto no mapa. Abra Meus endereços
              e salve de novo, ou use o GPS.
            </Text>
          ) : null}
          {addresses.isError ? (
            <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
              {addresses.error.message}
            </Text>
          ) : null}
        </Card>
      ) : null}
      <Card>
        <Text style={s.sectionTitle}>Pagamento</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["pix", "cash"] as const).map((method) => (
            <Pressable
              key={method}
              onPress={() => setPaymentMethod(method)}
              style={{
                flex: 1,
                minHeight: 58,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor:
                  paymentMethod === method ? PEDIU.coral : PEDIU.line,
                backgroundColor:
                  paymentMethod === method ? PEDIU.coralSoft : PEDIU.white,
                borderRadius: 14,
              }}
            >
              <Text
                style={{
                  color: paymentMethod === method ? PEDIU.coral : PEDIU.muted,
                  fontWeight: "900",
                }}
              >
                {method === "pix" ? "PIX" : "Dinheiro"}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={s.sectionTitle}>Confirmação</Text>
        <Text style={s.muted}>
          Total deste pedido: {money(quotedTotal)}.
        </Text>
        {createOrder.error ? (
          <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
            {createOrder.error.message}
          </Text>
        ) : null}
        {createPix.error ? (
          <Text style={{ color: PEDIU.coral, fontSize: 12 }}>
            Não foi possível gerar o PIX: {createPix.error.message}. O pedido já
            foi salvo; tente confirmar novamente para repetir a operação com
            segurança.
          </Text>
        ) : null}
        <PrimaryButton
          title={
            createOrder.isPending
              ? "Criando pedido..."
              : createPix.isPending
                ? "Gerando PIX..."
                : "Confirmar pedido"
          }
          onPress={submit}
          disabled={
            createOrder.isPending ||
            createPix.isPending ||
            quote.isFetching ||
            !quote.data ||
            (fulfillmentMode === "delivery" && !addressId)
          }
        />
      </Card>
    </Page>
  );
}

const row = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
};
const value = { color: PEDIU.ink, fontWeight: "800" as const };
const checkoutStyles = StyleSheet.create({
  infoPanel: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    borderWidth: 1,
    borderRadius: 19,
    padding: 13,
  },
  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBody: { flex: 1, gap: 5 },
  infoLabel: { color: PEDIU.coral, fontSize: 13, fontWeight: "900" },
  policyRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  policyDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  policyTitle: { color: PEDIU.ink, fontSize: 12, fontWeight: "900" },
});
