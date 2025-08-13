// Core HTTP Interceptor - Generic HTTP request/response interception
// Provider-agnostic and handles all technical aspects of interception

import { InterceptedResponse, Provider } from './provider-interface';

export type ResponseHandler = (response: InterceptedResponse) => void;

export class HttpInterceptor {
  private originalFetch: typeof fetch;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send;
  private providers: Provider[];
  private isActive: boolean = false;

  constructor(providers: Provider[]) {
    this.providers = providers;
    
    // Store original functions
    this.originalFetch = window.fetch;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
  }

  /**
   * Start intercepting HTTP requests
   */
  start(): void {
    if (this.isActive) {
      console.warn('HttpInterceptor is already active');
      return;
    }

    this.interceptFetch();
    this.interceptXHR();
    this.isActive = true;
    
    console.log('🔧 HTTP Interceptor started with providers:', this.providers.map(p => p.config.name));
  }

  /**
   * Stop intercepting HTTP requests
   */
  stop(): void {
    if (!this.isActive) return;

    // Restore original functions
    (window as any).fetch = this.originalFetch;
    (XMLHttpRequest.prototype as any).open = this.originalXHROpen;
    (XMLHttpRequest.prototype as any).send = this.originalXHRSend;
    
    this.isActive = false;
    console.log('🛑 HTTP Interceptor stopped');
  }

  /**
   * Find provider that can handle the given URL
   */
  private findProvider(url: string): Provider | null {
    return this.providers.find(provider => provider.matchUrl(url)) || null;
  }

  /**
   * Process intercepted response with appropriate provider
   */
  private processResponse(response: InterceptedResponse): void {
    const provider = this.findProvider(response.url);
    if (!provider) return;

    try {
      // Check if provider wants to process this response
      if (!provider.shouldProcessResponse(response)) return;

      console.log(`🔍 Processing response with ${provider.config.name}:`, {
        url: response.url,
        source: response.source
      });

      // Send debug info
      window.postMessage({
        type: 'API_RESPONSE',
        provider: provider.config.name,
        data: response.data,
        timestamp: response.timestamp,
        metadata: {
          url: response.url,
          source: response.source,
          debugInfo: provider.getDebugInfo()
        }
      }, '*');

      // Check if this is submission data
      if (provider.isSubmissionData(response)) {
        const submissionData = provider.parseSubmissionData(response);
        
        if (submissionData) {
          console.log(`📡 Submission data found via ${provider.config.name}:`, submissionData);
          
          // Send submission data
          window.postMessage({
            type: 'SUBMISSION_DATA',
            provider: provider.config.name,
            data: submissionData,
            timestamp: response.timestamp,
            metadata: {
              problemId: submissionData.problem.problemId,
              language: submissionData.language,
              status: submissionData.status
            }
          }, '*');
        }
      }
    } catch (error) {
      console.error(`Error processing response with ${provider.config.name}:`, error);
    }
  }

  /**
   * Intercept fetch requests
   */
  private interceptFetch(): void {
    const self = this;
    
    (window as any).fetch = function(...args: Parameters<typeof fetch>) {
      const url = args[0];
      
      return self.originalFetch.apply(this, args).then(response => {
        // Only process successful responses from URLs that have a provider
        if (typeof url === 'string' && response.ok && self.findProvider(url)) {
          console.log('🌐 Intercepting fetch to:', url);
          
          // Clone response to avoid consuming the stream
          response.clone().json().then(data => {
            const interceptedResponse: InterceptedResponse = {
              url: url,
              data: data,
              source: 'fetch',
              timestamp: Date.now()
            };
            
            self.processResponse(interceptedResponse);
          }).catch(error => {
            console.log('Error parsing fetch response:', error);
          });
        }
        
        return response;
      });
    };
  }

  /**
   * Intercept XMLHttpRequest
   */
  private interceptXHR(): void {
    const self = this;
    
    (XMLHttpRequest.prototype as any).open = function(method: string, url: string) {
      (this as any)._url = url;
      (this as any)._method = method;
      return self.originalXHROpen.apply(this, arguments as any);
    };

    (XMLHttpRequest.prototype as any).send = function(_body?: any) {
      const xhr = this;
      
      // Add load event listener before sending
      xhr.addEventListener('load', function(this: XMLHttpRequest) {
        const xhrAny = this as any;
        const url = xhrAny._url;
        
        // Only process successful responses from URLs that have a provider
        if (url && xhrAny.status >= 200 && xhrAny.status < 300 && self.findProvider(url)) {
          console.log('🌐 Intercepting XHR to:', url);
          
          self.parseXHRResponse(xhrAny, url);
        }
      });
      
      return self.originalXHRSend.apply(this, arguments as any);
    };
  }

  /**
   * Parse XHR response handling different response types
   */
  private parseXHRResponse(xhr: any, url: string): void {
    try {
      let data;
      
      // Handle different response types
      if (xhr.responseType === '' || xhr.responseType === 'text') {
        data = JSON.parse(xhr.responseText);
        this.handleParsedResponse(data, url);
      } else if (xhr.responseType === 'blob') {
        // Handle blob responses - convert to text first
        const blob = xhr.response;
        if (blob instanceof Blob) {
          blob.text().then(text => {
            try {
              const blobData = JSON.parse(text);
              this.handleParsedResponse(blobData, url);
            } catch (error) {
              console.log('Error parsing blob response:', error);
            }
          });
          return; // Exit early for async blob handling
        }
      } else if (xhr.responseType === 'json') {
        data = xhr.response;
        this.handleParsedResponse(data, url);
      } else {
        console.log('⚠️ Unsupported response type:', xhr.responseType);
        return;
      }
    } catch (error) {
      console.log('Error parsing XHR response:', error);
    }
  }

  /**
   * Handle parsed response data
   */
  private handleParsedResponse(data: any, url: string): void {
    const interceptedResponse: InterceptedResponse = {
      url: url,
      data: data,
      source: 'xhr',
      timestamp: Date.now()
    };
    
    this.processResponse(interceptedResponse);
  }
}