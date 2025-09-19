export class GameCodeValidator {
  static validate(code: string): string | null {
    const trimmedCode = code.trim().toUpperCase()

    if (trimmedCode.length === 0) {
      return 'Game code is required'
    }

    if (trimmedCode.length < 4) {
      return 'Game code must be at least 4 characters'
    }

    if (trimmedCode.length > 12) {
      return 'Game code must be 12 characters or less'
    }

    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
      return 'Game code can only contain letters and numbers'
    }

    const validCodes = ['SPRING2024', 'BOKTEST', 'RUGBYQUIZ', 'DEMO123']
    if (!validCodes.includes(trimmedCode)) {
      return 'Invalid game code. Please check and try again'
    }

    return null
  }
}

export class PlayerNameValidator {
  static validate(name: string): string | null {
    const trimmedName = name.trim()

    if (trimmedName.length < 2) {
      return 'Please enter a name with at least 2 characters'
    }

    if (trimmedName.length > 20) {
      return 'Name must be 20 characters or less'
    }

    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes'
    }

    return null
  }
}
