import React, { useEffect, useRef } from "react";
import { ValidationService } from "../../../services/ValidationService";

export interface GameCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  onEnterPress?: () => void;
}

export const GameCodeInput: React.FC<GameCodeInputProps> = ({
  value,
  onChange,
  error,
  disabled,
  onEnterPress,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  useEffect(() => {
    if (error && inputRef.current) {
      inputRef.current.style.animation = "shake 0.5s ease-in-out";
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.animation = "none";
        }
      }, 500);
    }
  }, [error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upperCaseValue = e.target.value.toUpperCase();
    onChange(upperCaseValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim() && onEnterPress) {
      onEnterPress();
    }
  };

  const getInputClasses = () => {
    let classes =
      "w-full h-12 px-4 rounded-lg border-2 transition-all duration-300 text-center uppercase tracking-wider";
    classes += " text-white text-base font-medium bg-transparent";
    classes += " box-border placeholder-gray-400";

    if (error) {
      classes += " border-red-500 bg-red-900 bg-opacity-20";
    } else if (
      value.trim() &&
      ValidationService.validateGameCode(value).isValid
    ) {
      classes += " border-green-400 bg-green-900 bg-opacity-20";
    } else if (value.trim()) {
      classes += " border-purple-400 bg-transparent";
    } else {
      classes += " border-purple-400";
    }

    return classes;
  };

  return (
    <div
      className="mb-8"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        marginBottom: "20px",
      }}
    >
      <label
        htmlFor="gameCode"
        style={{
          display: "block",
          color: "#a78bfa",
          fontSize: "1.1rem",
          fontWeight: "700",
          marginBottom: "15px",
          textAlign: "center",
          width: "100%",
          textShadow: "0 0 8px rgba(167, 139, 250, 0.4)",
        }}
      >
        ENTER GAME CODE
      </label>
      <div className="relative mb-2" style={{ width: "100%" }}>
        <input
          ref={inputRef}
          type="text"
          id="gameCode"
          value={value}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="e.g. SPRING2024"
          className={getInputClasses()}
          maxLength={12}
          disabled={disabled}
          autoComplete="off"
          onMouseEnter={(e) => {
            if (!e.currentTarget.matches(':focus')) {
              e.currentTarget.style.borderColor = "#467acfff";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(68, 39, 96, 0.3)";
            }
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = "white";
            e.target.style.borderColor = "#442760";
            e.target.style.boxShadow = "0 0 0 3px #442760";
            e.target.style.transform = "translateY(-1px)";
            e.target.style.animation = "none";
          }}
          onBlur={(e) => {
            if (!value.trim()) {
              e.target.style.backgroundColor = "#f8f9fa";
              e.target.style.borderColor = "transparent";
              e.target.style.boxShadow = "none";
              e.target.style.transform = "translateY(0)";
            }
          }}
          style={{
            fontFamily: "'Courier New', monospace",
            letterSpacing: "2px",
            outline: "none",
            boxShadow: "none",
            fontSize: "1rem",
            fontWeight: "500",
            height: "48px",
            backgroundColor: "#f8f9fa",
            color: "#00aeff",
            borderColor: "#0029bb",
            borderRadius: "8px",
            width: "100%",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            textAlign: "center",
            textTransform: "uppercase",
            boxSizing: "border-box",
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 w-0 h-0.5 transition-all duration-300 transform -translate-x-1/2 focus-within:w-full"
          style={{
            background: "linear-gradient(90deg, #00aeff, #0029bb)",
            height: "2px",
          }}
        ></div>
      </div>
      {error && (
        <div
          className="flex items-center justify-center gap-2 mt-2 text-red-500 text-sm"
          style={{
            color: "#dc3545",
            fontSize: "0.9rem",
            marginTop: "8px",
            animation: "fadeInError 0.3s ease-out",
            display: "flex",
          }}
        >
          <span style={{ fontSize: "1rem" }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
