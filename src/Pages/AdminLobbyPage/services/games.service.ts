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

/* fetch round result */
export type RoundResultDTO = {
  round: number;
  leaderboard: Array<{
    name: string;
    round_score: number;
  }>;
  eliminated_names: string[];
  next_state: string;
};

export async function fetchRoundResult(gameCode: string, hostToken?: string): Promise<RoundResultDTO> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/round_result`;
  const headers: HeadersInit = {};
  if (hostToken) headers["X-Host-Token"] = hostToken;
  const dto = await http<RoundResultDTO>(path, { method: "GET", headers });
  return dto;
}

/* submit answer */
export type SubmitAnswerDTO = {
  accepted: boolean;
};

export async function submitAnswer(
  gameCode: string,
  playerId: number,
  reconnectToken: string,
  selectedIndex: number
): Promise<SubmitAnswerDTO> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/submit`;
  const dto = await http<SubmitAnswerDTO>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_id: playerId,
      reconnect_token: reconnectToken,
      selected_index: selectedIndex,
    }),
  });
  return dto;
}
