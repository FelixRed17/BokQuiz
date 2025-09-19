import React, { useRef, useState } from 'react'
import { ValidationService } from '../services/ValidationService'
import { GameCodeInput } from './components/GameCodeInput'
import { PlayerNameInput } from './components/PlayerNameInput'
import { SubmissionControls } from './components/SubmissionControls'

export interface RegistrationData {
  playerName: string
  gameCode: string
}

export interface RegistrationFormProps {
  onRegisterSuccess: (data: RegistrationData) => void
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegisterSuccess }) => {
  const [gameCode, setGameCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [gameCodeError, setGameCodeError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nameInputRef = useRef<HTMLInputElement | null>(null)

  const handleGameCodeChange = (value: string) => {
    setGameCode(value)
    if (gameCodeError) {
      setGameCodeError(null)
    }
  }

  const handleNameChange = (value: string) => {
    setPlayerName(value)
    if (nameError) {
      setNameError(null)
    }
  }

  const handleGameCodeEnter = () => {
    if (nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    // Clear previous errors
    setGameCodeError(null)
    setNameError(null)

    setIsSubmitting(true)

    const gameCodeValidation = ValidationService.validateGameCode(gameCode)
    if (!gameCodeValidation.isValid) {
      setGameCodeError(gameCodeValidation.error || 'Invalid game code')
      setIsSubmitting(false)
      return
    }

    const nameValidation = ValidationService.validatePlayerName(playerName)
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error || 'Invalid player name')
      setIsSubmitting(false)
      return
    }

    onRegisterSuccess({ playerName, gameCode })
    setIsSubmitting(false)
  }

  return (
    <div 
      className="registration-form"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '450px',
        margin: '0 auto'
      }}
    >
      <div style={{ width: '100%', marginBottom: '20px' }}>
        <GameCodeInput
          value={gameCode}
          onChange={handleGameCodeChange}
          error={gameCodeError}
          disabled={isSubmitting}
          onEnterPress={handleGameCodeEnter}
        />
      </div>

      <div style={{ width: '100%', marginBottom: '25px' }}>
        <PlayerNameInput
          value={playerName}
          onChange={handleNameChange}
          error={nameError}
          disabled={isSubmitting}
          onEnterPress={handleSubmit}
        />
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <SubmissionControls
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          canSubmit={gameCode.trim().length > 0 && playerName.trim().length > 0}
        />
      </div>
    </div>
  )
}