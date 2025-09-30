// features/player/dto/join.dto.ts
export type JoinGameRequestDTO = {
    name: string;
  };
  
  export type JoinGameSuccessDTO = {
    player_id: number;
    reconnect_token: string;
  };
  
  export type JoinGameErrorDTO = {
    error: {
      code: string;
      message: string;
    };
  };
  
  export type JoinGameResponseDTO =
    | { data?: JoinGameSuccessDTO; message?: string } // non-error (api might wrap differently)
    | JoinGameErrorDTO;
  