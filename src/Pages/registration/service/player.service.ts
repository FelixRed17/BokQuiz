// features/player/services/player.service.ts
import { http } from "../../../lib/http";
import type { JoinGameSuccessDTO, JoinGameResponseDTO } from "../dto/join.dto";

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
  if ((dto as any)?.error) {
    throw new Error((dto as any).error.message || "Failed to join");
  }

  // Expect server to respond with { player_id, reconnect_token } (direct or nested)
  // adjust for how your backend wraps successful responses
  const success =
    (dto as any).data ?? (dto as any) /* sometimes API returns flat object */;

  if (!success || success.player_id === undefined || !success.reconnect_token) {
    throw new Error("Malformed join response from server");
  }

  return {
    player_id: success.player_id,
    reconnect_token: success.reconnect_token,
  } as JoinGameSuccessDTO;
}

