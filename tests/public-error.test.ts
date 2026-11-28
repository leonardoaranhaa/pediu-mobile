import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { publicError } from "../server/_core/public-error";
import { FRIENDLY_FAILURE } from "../lib/user-message";

const wrapped = (cause: unknown) =>
  new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String((cause as Error).message), cause });

describe("public error mapping", () => {
  it("turns a written business rule into a 400 with its text", () => {
    const mapped = publicError(wrapped(new Error("Estoque insuficiente")));
    expect(mapped.code).toBe("BAD_REQUEST");
    expect(mapped.message).toBe("Estoque insuficiente");
  });

  it("hides SQL and reports a lost race as 409", () => {
    const driver = Object.assign(new Error('duplicate key value violates unique constraint "x"'), { code: "23505" });
    const failed = new Error('Failed query: insert into "pediu_delivery_assignments" ("id","orderId") values ($1,$2)', { cause: driver });
    const mapped = publicError(wrapped(failed));
    expect(mapped.code).toBe("CONFLICT");
    expect(mapped.message).not.toMatch(/insert|pediu_/);
  });

  it("hides any other database failure behind a generic 500", () => {
    const failed = new Error("Failed query: select 1", { cause: Object.assign(new Error("boom"), { code: "57014" }) });
    const mapped = publicError(wrapped(failed));
    expect(mapped.code).toBe("INTERNAL_SERVER_ERROR");
    expect(mapped.message).toBe(FRIENDLY_FAILURE);
  });

  it("keeps the code of errors already raised as TRPCError", () => {
    const mapped = publicError(new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" }));
    expect(mapped.code).toBe("NOT_FOUND");
    expect(mapped.message).toBe("Pedido não encontrado");
  });
});
