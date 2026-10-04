import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";

const user = {
  id: 700,
  openId: "voice-security-user",
  name: "Voice Test",
  email: "voice@example.test",
  loginMethod: "test",
  role: "user" as const,
  lastSignedIn: new Date(),
};

function createContext() {
  return {
    user,
    req: {
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
      headers: {},
    },
    res: {},
  } as any;
}

describe("voice and payload security boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects a voice command above the 500-character limit", async () => {
    const caller = appRouter.createCaller({ user } as any);

    await expect(
      caller.pediu.voice.interpret({
        mode: "customer",
        command: "a".repeat(501),
      }),
    ).rejects.toThrow();
  });

  it("rejects a transcription payload above the encoded-input limit", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.pediu.voice.transcribe({
        audioBase64: "A".repeat(12_000_001),
        mimeType: "audio/m4a",
      }),
    ).rejects.toThrow();
  });

  it("rejects malformed base64 before storage or transcription", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.pediu.voice.transcribe({
        audioBase64: "!".repeat(1_000),
        mimeType: "audio/m4a",
      }),
    ).rejects.toThrow("Áudio codificado inválido");
  });

  it("rejects audio whose decoded bytes are below the minimum", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.pediu.voice.transcribe({
        audioBase64: Buffer.alloc(750).toString("base64"),
        mimeType: "audio/m4a",
      }),
    ).rejects.toThrow("entre 1 KB e 8 MB");
  });

  it("rejects a MIME/signature mismatch before storage", async () => {
    const caller = appRouter.createCaller(createContext());
    const notWav = Buffer.alloc(1_024, 0x41).toString("base64");

    await expect(
      caller.pediu.voice.transcribe({
        audioBase64: notWav,
        mimeType: "audio/wav",
      }),
    ).rejects.toThrow("não corresponde ao formato informado");
  });
});
