// features/player/services/player.service.ts
import { http } from "../../../lib/http";
import type { JoinGameSuccessDTO, JoinGameResponseDTO } from "../dto/join.dto";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function getJoinErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (isRecord(error)) {
    return getJoinErrorMessage(error.message ?? error.error);
  }
  return "Failed to join";
}

function isJoinSuccess(value: unknown): value is JoinGameSuccessDTO {
  return (
    isRecord(value) &&
    typeof value.player_id === "number" &&
    typeof value.reconnect_token === "string"
  );
}

export async function joinGame(
  gameCode: string,
  playerName: string
): Promise<JoinGameSuccessDTO> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/join`;
  // http() throws ApiError with .status and .data (from lib/http)
  const dto = await http<JoinGameResponseDTO>(path, {
    method: "POST",
    json: { name: playerName.trim() },
  });

  // If API returns error shape in 200 (unlikely), handle defensively
  if (isRecord(dto) && "error" in dto) {
    throw new Error(getJoinErrorMessage(dto.error));
  }

  // Expect server to respond with { player_id, reconnect_token } (direct or nested)
  // adjust for how your backend wraps successful responses
  const success = isRecord(dto) && "data" in dto ? dto.data : dto;

  if (!isJoinSuccess(success)) {
    throw new Error("Malformed join response from server");
  }

  return {
    player_id: success.player_id,
    reconnect_token: success.reconnect_token,
  } as JoinGameSuccessDTO;
}
