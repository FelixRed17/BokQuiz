export type Player = {
    name: string;
    eliminated: boolean;
    isHost: boolean;
    ready: boolean;
  };
  
  export type GameState = {
    status: string;
    roundNumber: number;
    currentQuestionIndex: number;
    timeRemainingMs: number;
    players: Player[];
    suddenDeathParticipants: any[];
  };
  