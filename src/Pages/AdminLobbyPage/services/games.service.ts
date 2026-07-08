// src/Pages/AdminLobbyPage/services/games.service.ts
import { http } from "../../../lib/http";
import type { ApiPlayerDTO, GameStateResponseDTO } from "../dto/games.dto";
import type { GameState, Player } from "../types/games";

type ApiEnvelope<T> = {
  data: T;
};

function unwrapData<T>(raw: T | ApiEnvelope<T>): T {
  if (raw && typeof raw === "object" && "data" in raw) {
    return (raw as ApiEnvelope<T>).data;
  }

  return raw as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getPayload(raw: unknown): Record<string, unknown> {
  const data = isRecord(raw) && "data" in raw ? raw.data : raw;
  return isRecord(data) ? data : {};
}

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

export type RoundAnswerQuestionDTO = {
  round: number;
  index: number;
  text: string;
  options: string[];
  correct_index: number;
  correct_answer: string;
};

export type RoundAnswersDTO = {
  round_number: number;
  questions: RoundAnswerQuestionDTO[];
};

/**
 * map DTO -> domain model
 */
function mapPlayer(dto: ApiPlayerDTO): Player {
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
  const dto = await http<HostStartResponseDTO | ApiEnvelope<HostStartResponseDTO>>(path, {
    method: "POST",
    headers: {
      "X-Host-Token": hostToken,
      Accept: "application/json",
    },
  });
  return unwrapData(dto);
}

export type HostNextResponseDTO = {
  advanced?: boolean;
  round_ended?: boolean;
  next_round_started?: boolean;
  sudden_death_continue?: boolean;
  sudden_death_in_progress?: boolean;
  sudden_death_ended?: boolean;
  next_status?: string;
  round_number?: number;
  index?: number;
};

export async function hostNext(
  gameCode: string,
  hostToken: string
): Promise<HostNextResponseDTO> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/host_next`;
  const dto = await http<HostNextResponseDTO | ApiEnvelope<HostNextResponseDTO>>(path, {
    method: "POST",
    headers: {
      "X-Host-Token": hostToken,
      Accept: "application/json",
    },
  });
  return unwrapData(dto);
}

/* fetch current question */
export type QuestionResponseDTO = {
  round_number: number;
  index: number;
  text: string;
  options: string[];
  ends_at: string;
  correct_index?: number;
  correctIndex?: number;
};

export async function fetchQuestion(gameCode: string): Promise<QuestionResponseDTO> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/question`;
  const dto = await http<QuestionResponseDTO | ApiEnvelope<QuestionResponseDTO>>(path, {
    method: "GET",
    cache: "no-store",
  });
  return unwrapData(dto);
}

/**
 * GET final game results (winner + answers)
 */
export async function fetchFinalResults(gameCode: string): Promise<FinalResultsDTO> {
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/results`;
  const raw = await http<unknown>(path, { method: "GET", cache: "no-store" });
  const payload = getPayload(raw);
  return {
    winner: typeof payload.winner === "string" ? payload.winner : null,
    answers: Array.isArray(payload.answers)
      ? payload.answers.filter(
          (
            item
          ): item is { round: number; text: string; correct_index: number } =>
            isRecord(item) &&
            typeof item.round === "number" &&
            typeof item.text === "string" &&
            typeof item.correct_index === "number"
        )
      : [],
  };
}

/**
 * Fetch canonical round_result. Always returns a normalized RoundResultDTO.
 * If round_result isn't available (422/404/"Not between rounds"), falls back to /results.
 */
export async function fetchRoundResult(gameCode: string): Promise<RoundResultDTO> {
  const ts = Date.now();
  const rrPath = `/api/v1/games/${encodeURIComponent(gameCode)}/round_result?ts=${ts}`;

  const raw = await http<unknown>(rrPath, { method: "GET", cache: "no-store" });
  const payload = getPayload(raw);

  const leaderboard = Array.isArray(payload.leaderboard)
    ? payload.leaderboard.filter(
        (entry): entry is { name: string; round_score: number } =>
          isRecord(entry) &&
          typeof entry.name === "string" &&
          typeof entry.round_score === "number"
      )
    : [];
  const eliminated_names = Array.isArray(payload.eliminated_names)
    ? payload.eliminated_names.filter(
        (name): name is string => typeof name === "string"
      )
    : [];
  const next_state = asString(
    payload.next_state ?? payload.nextState,
    "between_rounds"
  );
  const suddenDeathRaw = Array.isArray(payload.sudden_death_players)
    ? payload.sudden_death_players
    : Array.isArray(payload.sudden_death_participants)
    ? payload.sudden_death_participants
    : [];
  const sudden_death_players = suddenDeathRaw.filter(
    (name): name is string => typeof name === "string"
  );

  return {
    round: asNumber(payload.round ?? payload.round_number),
    round_number: asNumber(payload.round_number ?? payload.round),
    leaderboard,
    eliminated_names,
    next_state,
    sudden_death_players,
  };
}

export async function fetchRoundAnswers(
  gameCode: string,
  hostToken?: string,
  roundNumber?: number
): Promise<RoundAnswersDTO> {
  const params = new URLSearchParams();
  if (typeof roundNumber === "number" && Number.isFinite(roundNumber)) {
    params.set("round_number", String(roundNumber));
  }

  const query = params.toString();
  const path = `/api/v1/games/${encodeURIComponent(gameCode)}/round_answers${
    query ? `?${query}` : ""
  }`;
  const raw = await http<unknown>(path, {
    method: "GET",
    cache: "no-store",
    headers: {
      ...(hostToken ? { "X-Host-Token": hostToken } : {}),
      Accept: "application/json",
    },
  });
  const payload = getPayload(raw);
  const questions = Array.isArray(payload.questions)
    ? payload.questions.filter(isRecord).map((question) => {
        const options = Array.isArray(question.options)
          ? question.options.filter(
              (option): option is string => typeof option === "string"
            )
          : [];

        return {
          round: asNumber(question.round),
          index: asNumber(question.index),
          text: asString(question.text),
          options,
          correct_index: asNumber(question.correct_index),
          correct_answer: asString(question.correct_answer),
        };
      })
    : [];

  return {
    round_number: asNumber(payload.round_number),
    questions,
  };
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
  const dto = await http<SubmitAnswerDTO | ApiEnvelope<SubmitAnswerDTO>>(path, {
    method: "POST",
    keepalive: true,
    timeoutMs: 2500,
    retry: 1,
    json: {
      player_id: playerId,
      reconnect_token: reconnectToken,
      selected_index: selectedIndex,
    },
  });
  return unwrapData(dto);
}

/**
 * Transform ActionCable message payload to GameState
 */
export function transformChannelState(payload: unknown): GameState | null {
  if (!payload) return null;

  try {
    const statePayload = isRecord(payload) ? payload : {};
    const rawPlayers = Array.isArray(statePayload.players)
      ? statePayload.players
      : [];
    return {
      status: asString(statePayload.status),
      roundNumber: asNumber(statePayload.round_number ?? statePayload.roundNumber),
      currentQuestionIndex: asNumber(
        statePayload.current_question_index ?? statePayload.currentQuestionIndex
      ),
      timeRemainingMs: asNumber(
        statePayload.time_remaining_ms ?? statePayload.timeRemainingMs
      ),
      players: rawPlayers.filter(isRecord).map((p) => ({
        name: asString(p.name),
        eliminated: Boolean(p.eliminated),
        isHost: Boolean(p.is_host) || Boolean(p.isHost),
        ready: !!p.ready,
      })),
      suddenDeathParticipants: Array.isArray(
        statePayload.sudden_death_participants
      )
        ? statePayload.sudden_death_participants
        : Array.isArray(statePayload.suddenDeathParticipants)
        ? statePayload.suddenDeathParticipants
        : [],
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
  eventPayload?: unknown
): GameState | null {
  if (!currentState) return null;

  const newState = { ...currentState };

  switch (eventType) {
    case "player_joined":
      if (isRecord(eventPayload) && isRecord(eventPayload.player)) {
        newState.players = [
          ...newState.players,
          {
            name: asString(eventPayload.player.name),
            eliminated: false,
            isHost: false,
            ready: false,
          },
        ];
      }
      break;

    case "player_ready":
      if (isRecord(eventPayload) && typeof eventPayload.playerName === "string") {
        newState.players = newState.players.map((p) =>
          p.name === eventPayload.playerName ? { ...p, ready: true } : p
        );
      }
      break;

    case "player_eliminated":
      if (isRecord(eventPayload) && typeof eventPayload.playerName === "string") {
        newState.players = newState.players.map((p) =>
          p.name === eventPayload.playerName ? { ...p, eliminated: true } : p
        );
      }
      break;

    case "round_started":
      if (isRecord(eventPayload) && typeof eventPayload.roundNumber === "number") {
        newState.roundNumber = eventPayload.roundNumber;
        newState.currentQuestionIndex = 0;
        newState.status = "active";
      }
      break;

    case "question_started":
      if (isRecord(eventPayload) && typeof eventPayload.index === "number") {
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
