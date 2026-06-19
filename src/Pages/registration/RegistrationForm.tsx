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

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;

  if (value && typeof value === "object") {
    const errorLike = value as {
      data?: unknown;
      error?: unknown;
      error_message?: unknown;
      message?: unknown;
    };

    const candidates = [
      errorLike.error_message,
      errorLike.error,
      errorLike.data,
      errorLike.message,
    ];

    for (const candidate of candidates) {
      if (candidate === undefined || candidate === value) continue;
      const message = getErrorMessage(candidate, "");
      if (message) return message;
    }
  }

  return fallback;
}

function hasErrorPayload(value: unknown): value is { error: unknown } {
  return Boolean(value && typeof value === "object" && "error" in value);
}

function getErrorStatus(value: unknown): number | undefined {
  if (!value || typeof value !== "object" || !("status" in value)) return undefined;

  const status = (value as { status: unknown }).status;
  return typeof status === "number" ? status : undefined;
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
      if (!response || hasErrorPayload(response)) {
        const message = getErrorMessage(response, "Failed to join the game.");
        setGenericError(message);
        return;
      }

      // Store player credentials in localStorage for API calls
      sessionStorage.setItem("playerId", String(response.player_id));
      sessionStorage.setItem("reconnectToken", response.reconnect_token);
      sessionStorage.setItem("playerName", playerName.trim());
      localStorage.setItem("gameCode", gameCode.trim());
      // Clear amHost flag - this is a regular player, not the host
      localStorage.setItem("amHost", "false");

      // Success — call the parent with minimal registration data
      onRegisterSuccess({
        playerName: playerName.trim(),
        gameCode: gameCode.trim(),
      });
    } catch (err: unknown) {
      // if ApiError from lib/errors is thrown, it may contain status & data
      const apiMessage = getErrorMessage(
        err,
        "Unable to join game. Try again."
      );
      const status = getErrorStatus(err);
      // Map some statuses to UI errors
      if (status === 404) {
        setGameCodeError("Game not found. Check the code and try again.");
      } else if (status === 400) {
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
        maxWidth: "500px",
        margin: "2rem auto",
        padding: "2.5rem",
        borderRadius: "12px",
        border: "2px solid rgba(244, 195, 0, 0.78)",
        boxShadow: "0 0 22px rgba(244, 195, 0, 0.38)",
        backgroundColor: "rgba(0, 122, 51, 0.22)",
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
