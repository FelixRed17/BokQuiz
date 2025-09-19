export class ValidationService {
  static validateGameCode(value: string): { isValid: boolean; error?: string } {
    if (!value || value.trim() === '') {
      return { isValid: false, error: 'Game code is required' }
    }
    if (value.trim().length < 3) {
      return { isValid: false, error: 'Game code must be at least 3 characters' }
    }
    return { isValid: true }
  }

  static validatePlayerName(value: string): { isValid: boolean; error?: string } {
    if (!value || value.trim() === '') {
      return { isValid: false, error: 'Player name is required' }
    }
    if (value.trim().length < 2) {
      return { isValid: false, error: 'Player name must be at least 2 characters' }
    }
    return { isValid: true }
  }
}
