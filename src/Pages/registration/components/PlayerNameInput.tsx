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
    <div style={{ width: '100%', marginBottom: '20px' }}>
      <label 
        htmlFor="playerName"
        style={{
          display: 'block',
          color: '#a78bfa',
          fontSize: '1.1rem',
          fontWeight: '700',
          marginBottom: '15px',
          textAlign: 'center',
          width: '100%',
          textShadow: '0 0 8px rgba(167, 139, 250, 0.4)'
        }}
      >
        YOUR NAME
      </label>
      <input
        id="playerName"
        ref={ref}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnterPress?.();
          }
        }}
        placeholder="Enter your name"
        style={{
          width: '100%',
          height: '48px',
          padding: '0 1rem',
          borderRadius: '0.5rem',
          border: '2px solid #8b5cf6',
          backgroundColor: 'transparent',
          color: 'white',
          fontSize: '1rem',
          fontWeight: '500',
          transition: 'all 0.3s',
          outline: 'none',
          boxSizing: 'border-box',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          ...(error && {
            borderColor: '#ef4444',
            backgroundColor: 'rgba(185, 28, 28, 0.2)'
          })
        }}
      />
      {error && (
        <div style={{
          color: '#f87171',
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
    </div>
  );
});
