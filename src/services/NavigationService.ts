export type Page = 'welcome' | 'registration'

export class NavigationService {
  private currentPage: Page = 'welcome'
  private listeners: ((page: Page) => void)[] = []

  getCurrentPage(): Page {
    return this.currentPage
  }

  navigateTo(page: Page): void {
    this.currentPage = page
    this.notifyListeners()
  }

  subscribe(listener: (page: Page) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentPage))
  }
}

export const navigationService = new NavigationService()
