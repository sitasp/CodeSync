// Modular API Interceptor - Entry point for provider-based HTTP interception
// Automatically detects and initializes appropriate providers based on current domain

export {}; // Make this a module

import { HttpInterceptor } from '../../core/http-interceptor';
import { ProviderRegistry } from '../../core/provider-registry';
import { LeetCodeProvider } from './leetcode-provider';

(function() {
  console.log('🚀 Modular API Interceptor starting...');

  try {
    // Create provider registry and register available providers
    const registry = new ProviderRegistry();
    
    // Register LeetCode provider
    registry.register(new LeetCodeProvider());
    
    // Check if we have a provider for the current page
    const currentProvider = registry.getCurrentProvider();
    if (!currentProvider) {
      console.log('ℹ️ No provider found for current domain:', window.location.hostname);
      console.log('💡 Available providers:', registry.getAllProviders().map(p => p.config.name));
      return;
    }
    
    console.log(`✅ Found provider: ${currentProvider.config.name} for domain: ${currentProvider.config.domain}`);
    console.log('🔧 Debug info:', currentProvider.getDebugInfo());
    
    // Initialize HTTP interceptor with all providers
    const interceptor = new HttpInterceptor(registry.getAllProviders());
    
    // Start intercepting
    interceptor.start();
    
    // Store interceptor globally for debugging
    (window as any).__apiInterceptor = {
      interceptor,
      registry,
      currentProvider,
      debugInfo: () => registry.getDebugInfo()
    };
    
    console.log('🔧 API Interceptor initialized successfully');
    console.log('💡 Debug: window.__apiInterceptor available for inspection');
    
  } catch (error) {
    console.error('❌ Failed to initialize API Interceptor:', error);
  }
})();