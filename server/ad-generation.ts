import { openAiChat, openAiConfigured, openAiImage, AI_UNAVAILABLE } from "./_core/openai";

export type AdGenerationInput = {
  storeName: string;
  productName: string;
  category: string;
  productDescription?: string | null;
  price: string;
  offerLabel?: string;
  audience?: string;
  tone?: "irresistivel" | "caseiro" | "premium" | "divertido";
};

export type GeneratedAdCreative = {
  headline: string;
  description: string;
  cta: string;
  visualPrompt: string;
  imageKey: string | null;
  imageData: string | null;
  model: string;
  offerLabel: string | null;
};

const clip = (value: string, max: number) =>
  value
    .trim()
    .replace(/[\u0000-\u001f]/g, "")
    .slice(0, max);

function cleanInput(input: AdGenerationInput) {
  return {
    storeName: clip(input.storeName, 160),
    productName: clip(input.productName, 180),
    category: clip(input.category, 80),
    productDescription: clip(input.productDescription ?? "", 800),
    price: clip(input.price, 32),
    offerLabel: clip(input.offerLabel ?? "", 120),
    audience: clip(input.audience ?? "pessoas do bairro", 120),
    tone: input.tone ?? "irresistivel",
  };
}

export async function generateAdCreative(
  input: AdGenerationInput,
  models?: { textModel?: string; imageModel?: string; imageQuality?: string },
): Promise<GeneratedAdCreative> {
  if (!openAiConfigured()) throw new Error(AI_UNAVAILABLE);
  const textModel = models?.textModel || "gpt-5-mini";
  const imageModel = models?.imageModel || "gpt-image-2";
  const imageQuality = models?.imageQuality || "medium";
  const data = cleanInput(input);
  if (!data.storeName || !data.productName || !data.category || !data.price) {
    throw new Error("Dados insuficientes para criar o anúncio");
  }

  const content = await openAiChat({
    model: textModel,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content: [
          "Você é o diretor de criação do Pediu, um marketplace de delivery local brasileiro.",
          "Crie copy curta, clara e comercial em português do Brasil para um produto real do catálogo.",
          "Nunca invente ingredientes, benefícios de saúde, avaliações, disponibilidade, frete grátis, desconto ou urgência.",
          "Só mencione uma vantagem promocional se ela estiver exatamente no campo oferta informado pelo lojista.",
          "Não use emojis em excesso, não grite em caixa alta e não use promessas absolutas.",
          "A imagem deve ser uma fotografia comercial apetitosa do produto, sem texto, sem logotipo e sem pessoas identificáveis.",
          "Retorne somente o JSON solicitado.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          loja: data.storeName,
          produto: data.productName,
          categoria: data.category,
          descricao: data.productDescription || "não informada",
          preco: data.price,
          oferta: data.offerLabel || "nenhuma oferta informada",
          publico: data.audience,
          tom: data.tone,
        }),
      },
    ],
    jsonSchema: {
        name: "pediu_ad_creative",
        schema: {
          type: "object",
          properties: {
            headline: { type: "string", minLength: 8, maxLength: 120 },
            description: { type: "string", minLength: 20, maxLength: 500 },
            cta: { type: "string", minLength: 4, maxLength: 80 },
            visualPrompt: { type: "string", minLength: 40, maxLength: 900 },
          },
          required: ["headline", "description", "cta", "visualPrompt"],
          additionalProperties: false,
        },
    },
  });

  let copy: {
    headline: string;
    description: string;
    cta: string;
    visualPrompt: string;
  };
  try {
    copy = JSON.parse(content) as typeof copy;
  } catch {
    throw new Error("A IA retornou um formato de anúncio inválido");
  }

  const headline = clip(copy.headline, 120);
  const description = clip(copy.description, 500);
  const cta = clip(copy.cta, 80);
  const visualPrompt = clip(copy.visualPrompt, 900);
  if (
    headline.length < 8 ||
    description.length < 20 ||
    cta.length < 4 ||
    visualPrompt.length < 40
  ) {
    throw new Error("A IA retornou um criativo fora dos limites de qualidade");
  }

  let imageData: string | null = null;
  try {
    imageData = await openAiImage({
      model: imageModel,
      quality: imageQuality,
      prompt: `${visualPrompt}. Produto real: ${data.productName}. Categoria: ${data.category}. Não inserir palavras, letras, preços, selos ou logotipos na imagem.`,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.includes("crédito")
        ? error.message
        : "Não consegui criar a imagem. O crédito voltou para a sua loja.",
    );
  }

  return {
    headline,
    description,
    cta,
    visualPrompt,
    imageKey: null,
    imageData,
    model: `${textModel} + ${imageModel}`,
    offerLabel: data.offerLabel || null,
  };
}
