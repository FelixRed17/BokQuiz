import { http } from "../../../lib/http";
import type { GameStateResponseDTO } from "../dto/games.dto";
import type { GameState, Player } from "../types/games";

/**
 * map DTO -> domain model
 */
function mapPlayer(dto: any): Player {
  return {
    name: dto.name,
    eliminated: !!dto.eliminated,
    isHost: !!dto.is_host,
    ready: !!dto.ready,
  };
}

function mapState(dto: GameStateResponseDTO): GameState {
  const d = dto.data;
  return {
    status: d.status,
    roundNumber: d.round_number,
    currentQuestionIndex: d.current_question_index,
    timeRemainingMs: d.time_remaining_ms,
    players: (d.players || []).map(mapPlayer),
    suddenDeathParticipants: d.sudden_death_participants || [],
  };
}

/**
 * Fetch the public game state
 */
export async function fetchGameState(gameCode: string): Promise<GameState> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/state`;
  const dto = await http<GameStateResponseDTO>(path, { method: "GET" });
  return mapState(dto);
}

/* host_start - requires X-Host-Token header */
export type HostStartResponseDTO = {
  started?: boolean;
  round_number?: number;
  index?: number;
};

export async function hostStart(gameCode: string, hostToken: string) {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/host_start`;
  const dto = await http<HostStartResponseDTO>(path, {
    method: "POST",
    headers: {
      "X-Host-Token": hostToken,
      Accept: "application/json",
    },
  });
  return dto;
}

/* fetch current question */
export type QuestionResponseDTO = {
  round_number: number;
  index: number;
  text: string;
  options: string[];
  ends_at: string;
};

export async function fetchQuestion(gameCode: string): Promise<QuestionResponseDTO> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/question`;
  const dto = await http<QuestionResponseDTO>(path, { method: "GET" });
  return dto;
}
