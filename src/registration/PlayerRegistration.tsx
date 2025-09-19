import React from 'react'
import { RegistrationForm, type RegistrationData } from './RegistrationForm'

export interface PlayerRegistrationProps {
  onRegisterComplete?: (data: RegistrationData) => void
  onNavigateBack?: () => void
}

export const PlayerRegistration: React.FC<PlayerRegistrationProps> = ({ onRegisterComplete, onNavigateBack }) => {
  const handleRegistrationSuccess = (registrationData: RegistrationData) => {
    // Skip the welcome message and go directly to the quiz
    if (onRegisterComplete) {
      onRegisterComplete(registrationData)
    }
    // eslint-disable-next-line no-console
    console.log('Player registered:', registrationData)
    // eslint-disable-next-line no-console
    console.log(`Starting quiz for ${registrationData.playerName} in game ${registrationData.gameCode}`)
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4" 
      style={{ 
        background: '#213A35',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="registration-container"
        style={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          boxShadow: `
            0 20px 40px rgba(0, 0, 0, 0.1),
            0 0 100px rgba(255, 215, 0, 0.1)
          `,
          padding: '40px',
          maxWidth: '450px',
          width: '100%',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 215, 0, 0.2)',
          animation: 'slideUp 0.6s ease-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div 
          className="text-center mb-10"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginBottom: '30px'
          }}
        >
          <h1 
            style={{ 
              color: '#1C352D',
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 15px 0',
              background: 'linear-gradient(45deg, #1C352D, #006633)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textAlign: 'center'
            }}
          >
            Join the QUIZ
          </h1>
          <p style={{ 
            color: '#666', 
            fontSize: '1.2rem', 
            margin: '0', 
            fontWeight: '400',
            textAlign: 'center'
          }}>
            Ready to test your Springbok knowledge?
          </p>
        </div>

        <RegistrationForm 
          onRegisterSuccess={handleRegistrationSuccess}
        />

        <div 
          className="text-center pt-5" 
          style={{ 
            borderTop: '1px solid #e9ecef',
            paddingTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          <p style={{ 
            color: '#6c757d', 
            fontSize: '0.95rem', 
            margin: '0', 
            fontWeight: '500',
            textAlign: 'center'
          }}>
            🏆 Challenge yourself with Springbok trivia!
          </p>
        </div>
      </div>
    </div>
  )
}