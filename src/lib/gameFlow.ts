import { SUDDEN_DEATH_QUESTION_ROUND_NUMBER } from "../constants/game";

export type SuddenDeathParticipant = string | { name?: unknown };

export function isSuddenDeathQuestionRound(roundNumber: unknown): boolean {
  return roundNumber === SUDDEN_DEATH_QUESTION_ROUND_NUMBER;
}

export function normalizeParticipantName(value: unknown): string {
  if (typeof value === "string") return value.trim().toLowerCase();

  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name.trim().toLowerCase() : "";
  }

  return "";
}

export function normalizeParticipantNames(
  participants: unknown
): string[] {
  if (!Array.isArray(participants)) return [];

  return participants
    .map(normalizeParticipantName)
    .filter((name) => name.length > 0);
}

export function isPlayerInSuddenDeath(
  playerName: unknown,
  participants: unknown
): boolean {
  const normalizedName = normalizeParticipantName(playerName);
  return (
    normalizedName.length > 0 &&
    normalizeParticipantNames(participants).includes(normalizedName)
  );
}

export function isSuddenDeathResult(
  roundNumber: unknown,
  suddenDeathPlayers: unknown
): boolean {
  return (
    isSuddenDeathQuestionRound(roundNumber) ||
    (Array.isArray(suddenDeathPlayers) && suddenDeathPlayers.length > 0)
  );
}
