import { TRPCError } from "@trpc/server";
import {
  buildParticipationCorrectionEventData,
  declarationsMatch,
  type ParticipationDeclaration,
} from "@shared/participationDeclaration";

export function prepareParticipationCorrection(input: {
  ownerId: number | null | undefined;
  actorId: number;
  previous: ParticipationDeclaration;
  current: ParticipationDeclaration;
  witnessId: string | null | undefined;
  explanation?: string | null;
}) {
  if (input.ownerId !== input.actorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This Work is not available to your creator account." });
  }

  if (declarationsMatch(input.previous, input.current)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a changed participation declaration before recording a correction." });
  }

  return {
    previous: input.previous,
    current: input.current,
    eventData: buildParticipationCorrectionEventData({
      previous: input.previous,
      current: input.current,
      witnessId: input.witnessId,
      explanation: input.explanation,
    }),
  };
}
