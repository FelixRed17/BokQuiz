import { PlayerRegistration } from '../registration/PlayerRegistration'

interface RegistrationPageProps {
  onNavigateBack: () => void
  onRegisterComplete: (data: { playerName: string; gameCode: string }) => void
}

export function RegistrationPage({ onNavigateBack, onRegisterComplete }: RegistrationPageProps) {
  return (
    <PlayerRegistration 
      onNavigateBack={onNavigateBack} 
      onRegisterComplete={onRegisterComplete} 
    />
  )
}
