// features/player/components/PlayerNameInput.tsx
import { forwardRef } from "react";

export interface PlayerNameInputProps {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  disabled?: boolean;
  onEnterPress?: () => void;
}

export const PlayerNameInput = forwardRef<
  HTMLInputElement,
  PlayerNameInputProps
>(({ value, onChange, error, disabled, onEnterPress }, ref) => {
  return (
    <div>
      <label className="form-label">Your Name</label>
      <input
        ref={ref}
        className="form-control"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnterPress?.();
          }
        }}
      />
      {error && <div className="text-danger mt-1">{error}</div>}
    </div>
  );
});
