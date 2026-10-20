import type { ParticipationValue } from "./loopRegistration";

export type ParticipationDeclaration = {
  music: ParticipationValue;
  lyrics: ParticipationValue;
  voice: ParticipationValue;
};

export type ParticipationCorrectionEventData = {
  previous: ParticipationDeclaration;
  current: ParticipationDeclaration;
  witnessId: string | null;
  explanation?: string;
};

export function declarationsMatch(
  previous: ParticipationDeclaration,
  current: ParticipationDeclaration,
): boolean {
  return previous.music === current.music
    && previous.lyrics === current.lyrics
    && previous.voice === current.voice;
}

export function buildParticipationCorrectionEventData(input: {
  previous: ParticipationDeclaration;
  current: ParticipationDeclaration;
  witnessId: string | null | undefined;
  explanation?: string | null;
}): ParticipationCorrectionEventData {
  const explanation = input.explanation?.trim();

  return {
    previous: input.previous,
    current: input.current,
    witnessId: input.witnessId ?? null,
    ...(explanation ? { explanation } : {}),
  };
}
