// features/gameHost/mappers/games.mapper.ts
import type { CreateGameResponseDTO } from "../dto/games.dto";
import type { Game } from "../types/games";

export function mapCreateGameDTO(dto: CreateGameResponseDTO): Game {
  return {
    code: dto.data.code,
    hostToken: dto.data.host_token,
    hostPlayerId: dto.data.host_player_id,
  };
}
