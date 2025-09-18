import React from 'react';
import './QuestionCard.css';

interface QuestionCardProps {
  question: string;
  questionNumber: number;
  className?: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, questionNumber, className = '' }) => {
  return (
    <div className={`question-card ${className}`}>
      <div className="question-header">Question {questionNumber}</div>
      <div className="question-text">{question}</div>
    </div>
  );
};

export default QuestionCard;

