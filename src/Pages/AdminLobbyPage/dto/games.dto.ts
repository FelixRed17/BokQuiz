export type ApiPlayerDTO = {
    name: string;
    eliminated: boolean;
    is_host: boolean;
    ready: boolean;
  };
  
  export type GameStateDTO = {
    status: string;
    round_number: number;
    current_question_index: number;
    time_remaining_ms: number;
    players: ApiPlayerDTO[];
    sudden_death_participants: any[];
  };
  
  export type GameStateResponseDTO = {
    data: GameStateDTO;
  };
  