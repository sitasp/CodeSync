// Provider Registry - Manages multiple providers and routing
// Handles provider lifecycle and determines which provider should handle requests

import { Provider } from './provider-interface';

export class ProviderRegistry {
  private providers: Map<string, Provider> = new Map();
  private domainToProvider: Map<string, Provider> = new Map();

  constructor(providers: Provider[] = []) {
    providers.forEach(provider => this.register(provider));
  }

  /**
   * Register a new provider
   */
  register(provider: Provider): void {
    const name = provider.config.name;
    
    if (this.providers.has(name)) {
      console.warn(`Provider ${name} is already registered, replacing...`);
    }

    this.providers.set(name, provider);
    this.domainToProvider.set(provider.config.domain, provider);
    
    console.log(`📝 Registered provider: ${name} for domain: ${provider.config.domain}`);
  }

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean {
    const provider = this.providers.get(name);
    if (!provider) return false;

    this.providers.delete(name);
    this.domainToProvider.delete(provider.config.domain);
    
    console.log(`❌ Unregistered provider: ${name}`);
    return true;
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): Provider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Get provider for current domain
   */
  getCurrentProvider(): Provider | null {
    const currentDomain = window.location.hostname;
    
    // First try exact domain match
    for (const [domain, provider] of Array.from(this.domainToProvider.entries())) {
      if (currentDomain === domain || currentDomain.endsWith(`.${domain}`)) {
        return provider;
      }
    }

    // If no exact match, try pattern matching
    for (const provider of Array.from(this.providers.values())) {
      if (provider.matchUrl(window.location.href)) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Find provider that can handle the given URL
   */
  findProviderForUrl(url: string): Provider | null {
    // First try to extract domain from URL
    try {
      const urlObj = new URL(url, window.location.origin);
      const domain = urlObj.hostname;
      
      for (const [providerDomain, provider] of Array.from(this.domainToProvider.entries())) {
        if (domain === providerDomain || domain.endsWith(`.${providerDomain}`)) {
          return provider;
        }
      }
    } catch (error) {
      // URL parsing failed, try pattern matching
    }

    // Fallback to pattern matching
    for (const provider of Array.from(this.providers.values())) {
      if (provider.matchUrl(url)) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers for debugging
   */
  getDebugInfo(): any {
    return {
      totalProviders: this.providers.size,
      providers: Array.from(this.providers.entries()).map(([name, provider]) => ({
        name,
        domain: provider.config.domain,
        urlPatterns: provider.config.urlPatterns,
        debugInfo: provider.getDebugInfo()
      })),
      currentProvider: this.getCurrentProvider()?.config.name || null,
      currentDomain: window.location.hostname,
      currentUrl: window.location.href
    };
  }

  /**
   * Check if any provider can handle the current page
   */
  hasProviderForCurrentPage(): boolean {
    return this.getCurrentProvider() !== null;
  }

  /**
   * Get suggested providers for current domain (for debugging)
   */
  getSuggestedProviders(): string[] {
    const currentDomain = window.location.hostname;
    const suggestions: string[] = [];

    for (const provider of Array.from(this.providers.values())) {
      if (currentDomain.includes(provider.config.domain.replace('.com', ''))) {
        suggestions.push(provider.config.name);
      }
    }

    return suggestions;
  }
}