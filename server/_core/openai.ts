const OPENAI_API = "https://api.openai.com/v1";

export function openAiKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

export function openAiConfigured() {
  return openAiKey().length > 0;
}

export const AI_UNAVAILABLE =
  "A inteligência artificial ainda não está disponível. Os atalhos continuam funcionando.";

async function openAiFetch(path: string, init: RequestInit) {
  const key = openAiKey();
  if (!key) throw new Error(AI_UNAVAILABLE);
  const response = await fetch(`${OPENAI_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error("Não consegui falar com a inteligência artificial agora. Tente de novo.");
  }
  return response;
}

export async function openAiChat(input: {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
  maxTokens?: number;
}) {
  const response = await openAiFetch("/chat/completions", {
    method: "POST",
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      max_completion_tokens: input.maxTokens ?? 800,
      ...(input.jsonSchema
        ? {
            response_format: {
              type: "json_schema",
              json_schema: {
                name: input.jsonSchema.name,
                strict: true,
                schema: input.jsonSchema.schema,
              },
            },
          }
        : {}),
    }),
  });
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Não consegui entender a resposta. Tente de novo.");
  }
  return content;
}

export async function openAiImage(input: {
  model: string;
  prompt: string;
  quality: string;
}) {
  const response = await openAiFetch("/images/generations", {
    method: "POST",
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      size: "1024x1024",
      quality: input.quality,
      n: 1,
    }),
  });
  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const image = payload.data?.[0];
  if (image?.b64_json) return `data:image/png;base64,${image.b64_json}`;
  if (image?.url) return image.url;
  throw new Error("Não consegui criar a imagem agora.");
}

export async function openAiTranscribe(input: {
  audio: Buffer;
  mimeType: string;
  model: string;
}) {
  const form = new FormData();
  const extension = input.mimeType.includes("wav")
    ? "wav"
    : input.mimeType.includes("mpeg")
      ? "mp3"
      : "m4a";
  form.append(
    "file",
    new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
    `audio.${extension}`,
  );
  form.append("model", input.model);
  form.append("language", "pt");
  const response = await openAiFetch("/audio/transcriptions", {
    method: "POST",
    body: form,
  });
  const payload = (await response.json()) as { text?: string };
  if (!payload.text?.trim()) {
    throw new Error("Não consegui ouvir o áudio. Digite o pedido ou use um atalho.");
  }
  return payload.text.trim();
}

export async function openAiFlagged(text: string) {
  if (!openAiConfigured()) return false;
  try {
    const response = await openAiFetch("/moderations", {
      method: "POST",
      body: JSON.stringify({ model: "omni-moderation-latest", input: text.slice(0, 4000) }),
    });
    const payload = (await response.json()) as {
      results?: Array<{ flagged?: boolean }>;
    };
    return Boolean(payload.results?.[0]?.flagged);
  } catch {
    return false;
  }
}
