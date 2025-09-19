import React from 'react'

export interface SubmissionControlsProps {
  onSubmit: () => void
  isSubmitting: boolean
  canSubmit: boolean
}

export const SubmissionControls: React.FC<SubmissionControlsProps> = ({ onSubmit, isSubmitting, canSubmit }) => {
  const buttonText = isSubmitting ? 'Joining Game...' : 'Start Quiz 🏉'

  return (
    <div 
      className="flex justify-center mt-8"
      style={{ 
        display: 'flex',
        justifyContent: 'center',
        marginTop: '30px'
      }}
    >
      <button
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-lg transition-all duration-300 hover:from-yellow-500 hover:to-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          padding: '15px 40px',
          minWidth: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          fontWeight: '700',
          border: 'none',
          borderRadius: '12px',
          cursor: canSubmit && !isSubmitting ? 'pointer' : 'not-allowed',
          background: canSubmit && !isSubmitting 
            ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
            : 'linear-gradient(135deg, #ccc, #999)',
          color: canSubmit && !isSubmitting ? '#000' : '#666',
          boxShadow: canSubmit && !isSubmitting 
            ? '0 4px 15px rgba(255, 215, 0, 0.3)' 
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: canSubmit && !isSubmitting ? 1 : 0.6
        }}
        onMouseEnter={(e) => {
          if (canSubmit && !isSubmitting) {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.4)'
          }
        }}
        onMouseLeave={(e) => {
          if (canSubmit && !isSubmitting) {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3)'
          }
        }}
      >
        {isSubmitting && (
          <div 
            className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"
            style={{
              animation: 'spin 1s linear infinite',
              width: '20px',
              height: '20px',
              border: '2px solid transparent',
              borderTop: '2px solid #000',
              borderRadius: '50%',
              marginRight: '8px'
            }}
          />
        )}
        {buttonText}
      </button>
    </div>
  )
}