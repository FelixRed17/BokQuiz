// src/Pages/AdminLobbyPage/services/games.service.ts
import { http } from "../../../lib/http";
import type { GameStateResponseDTO } from "../dto/games.dto";
import type { GameState, Player } from "../types/games";

/**
 * DTOs / Types
 */
export type FinalResultsDTO = {
  winner: string | null;
  answers: Array<{ round: number; text: string; correct_index: number }>;
};

export type RoundResultDTO = {
  // server may include either `round` or `round_number`
  round?: number;
  round_number?: number;
  leaderboard: Array<{
    name: string;
    round_score: number;
  }>;
  eliminated_names: string[];
  next_state: string;

  // optional: server may include the sudden-death participants (names)
  sudden_death_players?: string[];
};

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

/**
 * GET final game results (winner + answers)
 */
export async function fetchFinalResults(gameCode: string): Promise<FinalResultsDTO> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/results`;
  const raw = await http<any>(path, { method: "GET", cache: "no-store" });
  const payload = raw?.data ?? raw;
  return {
    winner: payload?.winner ?? null,
    answers: Array.isArray(payload?.answers) ? payload.answers : [],
  };
}

/**
 * Fetch canonical round_result. Always returns a normalized RoundResultDTO.
 * If round_result isn't available (422/404/"Not between rounds"), falls back to /results.
 */
export async function fetchRoundResult(gameCode: string): Promise<RoundResultDTO> {
  const ts = Date.now();
  const rrPath = `/api/v1/games/${encodeURIComponent(gameCode)}/round_result?ts=${ts}`;

  try {
    const raw = await http<any>(rrPath, { method: "GET", cache: "no-store" });
    const payload = raw?.data ?? raw;

    const leaderboard = Array.isArray(payload?.leaderboard) ? payload.leaderboard : [];
    const eliminated_names = Array.isArray(payload?.eliminated_names) ? payload.eliminated_names : [];
    const next_state = payload?.next_state ?? payload?.nextState ?? "between_rounds";
    const sudden_death_players = Array.isArray(payload?.sudden_death_players)
      ? payload.sudden_death_players
      : Array.isArray(payload?.sudden_death_participants)
      ? payload.sudden_death_participants
      : [];

    return {
      round: payload?.round ?? payload?.round_number ?? 0,
      round_number: payload?.round_number ?? payload?.round ?? 0,
      leaderboard,
      eliminated_names,
      next_state,
      sudden_death_players,
    };
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    const message = (err?.data?.error?.message ?? err?.message ?? String(err)).toString().toLowerCase();

    if (status === 404 || status === 422 || message.includes("not between rounds")) {
      // fallback to final results endpoint and return a finished-shaped RoundResultDTO
      try {
        return {
          round: 0,
          round_number: 0,
          leaderboard: [],
          eliminated_names: [],
          next_state: "finished",
          sudden_death_players: [],
        };
      } catch (finalErr) {
        throw finalErr ?? err;
      }
    }

    throw err;
  }
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

/**
 * Transform ActionCable message payload to GameState
 */
export function transformChannelState(payload: any): GameState | null {
  if (!payload) return null;

  try {
    return {
      status: payload.status,
      roundNumber: payload.round_number ?? payload.roundNumber,
      currentQuestionIndex: payload.current_question_index ?? payload.currentQuestionIndex,
      timeRemainingMs: payload.time_remaining_ms ?? payload.timeRemainingMs,
      players: (payload.players || []).map((p: any) => ({
        name: p.name,
        eliminated: !!p.eliminated,
        isHost: !!p.is_host || !!p.isHost,
        ready: !!p.ready,
      })),
      suddenDeathParticipants: payload.sudden_death_participants ?? payload.suddenDeathParticipants ?? [],
    };
  } catch (err) {
    console.error("Failed to transform channel state:", err);
    return null;
  }
}

/**
 * Optimistic update helper (unchanged)
 */
export function applyOptimisticUpdate(
  currentState: GameState | null,
  eventType: string,
  eventPayload?: any
): GameState | null {
  if (!currentState) return null;

  const newState = { ...currentState };

  switch (eventType) {
    case "player_joined":
      if (eventPayload?.player) {
        newState.players = [
          ...newState.players,
          {
            name: eventPayload.player.name,
            eliminated: false,
            isHost: false,
            ready: false,
          },
        ];
      }
      break;

    case "player_ready":
      if (eventPayload?.playerName) {
        newState.players = newState.players.map((p) =>
          p.name === eventPayload.playerName ? { ...p, ready: true } : p
        );
      }
      break;

    case "player_eliminated":
      if (eventPayload?.playerName) {
        newState.players = newState.players.map((p) =>
          p.name === eventPayload.playerName ? { ...p, eliminated: true } : p
        );
      }
      break;

    case "round_started":
      if (eventPayload?.roundNumber !== undefined) {
        newState.roundNumber = eventPayload.roundNumber;
        newState.currentQuestionIndex = 0;
        newState.status = "active";
      }
      break;

    case "question_started":
      if (eventPayload?.index !== undefined) {
        newState.currentQuestionIndex = eventPayload.index;
      }
      break;

    case "round_ended":
      newState.status = "round_ended";
      break;

    default:
      return currentState;
  }

  return newState;
}
