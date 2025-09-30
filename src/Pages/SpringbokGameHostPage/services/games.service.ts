// features/gameHost/services/games.service.ts
import { http } from "../../../lib/http";
import type { CreateGameRequestDTO, CreateGameResponseDTO } from "../dto/games.dto";
import { mapCreateGameDTO } from "../mappers/games.mapper";
import type { Game } from "../types/games";

export async function createGame(hostName: string): Promise<Game> {
  const payload: CreateGameRequestDTO = { host_name: hostName.trim() };
  const dto = await http<CreateGameResponseDTO>("/api/v1/games", {
    method: "POST",
    json: payload, 
  });
  return mapCreateGameDTO(dto);
}


