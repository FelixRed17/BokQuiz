import React from 'react';
import './OptionButton.css';

interface OptionButtonProps {
  option: string;
  index: number;
  isSelected: boolean;
  onClick: (index: number) => void;
  disabled?: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({ option, index, isSelected, onClick, disabled = false }) => {
  const letter = String.fromCharCode(65 + index);
  return (
    <div
      className={`option-button ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => {
        if (disabled) return;
        onClick(index);
      }}
      aria-disabled={disabled}
    >
      <div className="option-letter">{letter}</div>
      <div className="option-text">{option}</div>
    </div>
  );
};

export default OptionButton;

