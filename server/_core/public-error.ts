import { TRPCError } from "@trpc/server";
import { FRIENDLY_FAILURE, friendlyUserMessage } from "../../lib/user-message";

export function publicError(error: unknown) {
  if (error instanceof TRPCError) {
    return new TRPCError({
      code: error.code,
      message: friendlyUserMessage(error.message),
    });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: FRIENDLY_FAILURE,
  });
}
