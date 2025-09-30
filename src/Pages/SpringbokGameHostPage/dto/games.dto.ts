export type CreateGameResponseDTO = {
    data: {
      code: string;
      host_token: string;
      host_player_id: number;
    };
  };
  
  export type CreateGameRequestDTO = {
    host_name: string;
  };
  