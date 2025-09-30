import React, { useRef, useState } from "react";
import { ValidationService } from "../../services/ValidationService";
import { GameCodeInput } from "./components/GameCodeInput";
import { PlayerNameInput } from "./components/PlayerNameInput";
import { SubmissionControls } from "./components/SubmissionControls";
import { joinGame } from "./service/player.service";

export interface RegistrationData {
  playerName: string;
  gameCode: string;
}

export interface RegistrationFormProps {
  onRegisterSuccess: (data: RegistrationData) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onRegisterSuccess,
}) => {
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gameCodeError, setGameCodeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const handleGameCodeChange = (value: string) => {
    setGameCode(value);
    if (gameCodeError) setGameCodeError(null);
    if (genericError) setGenericError(null);
  };

  const handleNameChange = (value: string) => {
    setPlayerName(value);
    if (nameError) setNameError(null);
    if (genericError) setGenericError(null);
  };

  const handleGameCodeEnter = () => {
    if (nameInputRef.current) nameInputRef.current.focus();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    console.log();

    setGameCodeError(null);
    setNameError(null);
    setGenericError(null);

    // client-side validation
    const gameCodeValidation = ValidationService.validateGameCode(gameCode);
    if (!gameCodeValidation.isValid) {
      setGameCodeError(gameCodeValidation.error || "Invalid game code");
      return;
    }

    const nameValidation = ValidationService.validatePlayerName(playerName);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error || "Invalid player name");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await joinGame(gameCode, playerName);

      // If API returns an error-like payload, handle it gracefully
      // (adjust according to your API shape)
      if (!response || (response as any).error) {
        const message =
          (response as any).message ||
          (response as any).error ||
          "Failed to join the game.";
        setGenericError(message);
        return;
      }

      // Success — call the parent with minimal registration data
      onRegisterSuccess({
        playerName: playerName.trim(),
        gameCode: gameCode.trim(),
      });

      // Optionally you can store player_id or token to localStorage here:
      // if (response.data?.player_token) localStorage.setItem('playerToken', response.data.player_token);
    } catch (err: any) {
      // if ApiError from lib/errors is thrown, it may contain status & data
      const apiMessage =
        err?.data?.message || err?.message || "Unable to join game. Try again.";
      // Map some statuses to UI errors
      if (err?.status === 404) {
        setGameCodeError("Game not found. Check the code and try again.");
      } else if (err?.status === 400) {
        setNameError(apiMessage);
      } else {
        setGenericError(apiMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="registration-form"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: "450px",
        margin: "0 auto",
      }}
    >
      <div style={{ width: "100%", marginBottom: "20px" }}>
        <GameCodeInput
          value={gameCode}
          onChange={handleGameCodeChange}
          error={gameCodeError}
          disabled={isSubmitting}
          onEnterPress={handleGameCodeEnter}
        />
      </div>

      <div style={{ width: "100%", marginBottom: "25px" }}>
        <PlayerNameInput
          ref={nameInputRef}
          value={playerName}
          onChange={handleNameChange}
          error={nameError}
          disabled={isSubmitting}
          onEnterPress={handleSubmit}
        />
      </div>

      {genericError && (
        <div style={{ color: "#dc3545", marginBottom: 12 }}>{genericError}</div>
      )}

      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <SubmissionControls
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          canSubmit={gameCode.trim().length > 0 && playerName.trim().length > 0}
        />
      </div>
    </div>
  );
};
