// LeetCode API Interceptor - Entry point script for LeetCode HTTP interception
// This script is injected into leetcode.com pages via manifest.json

import { ApiInterceptor, bindDecorators } from '../internal/apiDecorator';
import { HttpInterceptor } from '../internal/httpInterceptor';

export {}; // Make this a module

/**
 * LeetCode-specific handlers. Add new endpoints by decorating methods.
 * These run ONLY on leetcode.com (per manifest matches) and ONLY for URLs that match.
 */
class LeetCodeApiHandlers {
  // Intercept classic REST submission details
  @ApiInterceptor('/submissions/detail')
  async onSubmissionDetail({ requestContext, responseContext }: any) {
    console.log('🎯 [REST API] Submission Detail Request:', {
      url: requestContext.path,
      method: requestContext.method,
      headers: requestContext.headers,
      body: requestContext.payload
    });
    
    console.log('📨 [REST API] Submission Detail Response:', {
      status: responseContext.statusCode,
      headers: responseContext.headers,
      data: responseContext.payload
    });

    // Example: extract minimal fields if present
    try {
      const submissionId = /submissions\/detail\/(\d+)/.exec(requestContext.path)?.[1];
      const data = responseContext.payload;
      const language = data?.lang || data?.submission?.lang || data?.programmingLanguage;
      const status = data?.statusDisplay || data?.status || data?.state;

      window.postMessage({
        type: 'SUBMISSION_DATA',
        provider: 'LeetCode',
        data: {
          submissionId,
          language,
          status,
          raw: data,
        },
        timestamp: Date.now(),
      }, '*');
    } catch (e) {
      console.warn('[LeetSync] Failed to parse submission detail', e);
    }
  }

  // Intercept GraphQL responses, narrow down using a regex for op name if needed
  @ApiInterceptor(/graphql/) // broaden or specialize as you like
  async onGraphQL({ requestContext, responseContext }: any) {
    console.log('🎯 [GraphQL API] Request:', {
      url: requestContext.path,
      method: requestContext.method,
      headers: requestContext.headers,
      body: requestContext.payload
    });
    
    console.log('📨 [GraphQL API] Response:', {
      status: responseContext.statusCode,
      headers: responseContext.headers,
      data: responseContext.payload
    });
    
    // If the body contains operationName you care about, filter here
    try {
      const data = responseContext.payload;
      // Common LeetCode GQL shape: { data: { question: {...} } }
      if (data && typeof data === 'object' && 'data' in data) {
        // Forward for debugging/inspection in your background page
        window.postMessage({ type: 'API_RESPONSE', provider: 'LeetCode', data, url: requestContext.path }, '*');
      }
    } catch {}
  }
}

// ---- Bootstrap (runs when script is injected on leetcode.com) ----
(function bootstrap() {
  console.log('🚀 LeetCode API Interceptor script starting...');
  console.log('🌍 Current URL:', window.location.href);
  console.log('🏠 Current hostname:', window.location.hostname);
  
  try {
    // Start interceptor first
    console.log('📡 Creating HTTP interceptor...');
    const http = new HttpInterceptor();
    
    console.log('🔌 Starting HTTP interceptor...');
    http.start();
    
    // Instantiate handler class and bind its decorators to this instance
    console.log('🏗️ Creating LeetCode handlers...');
    const handlers = new LeetCodeApiHandlers();
    
    console.log('🔗 Binding decorators...');
    bindDecorators(handlers);
    
    console.log('✅ [LeetSync] lcInterceptor initialized successfully');
    console.log('🔍 Checking if fetch is patched:', typeof window.fetch);
    console.log('🔍 Checking if XMLHttpRequest is patched:', typeof XMLHttpRequest);
    
    // Test fetch interception
    setTimeout(() => {
      console.log('🧪 Testing fetch interception...');
      fetch('/api/test').catch(() => console.log('🧪 Test fetch completed (expected to fail)'));
    }, 1000);
    
  } catch (e) {
    console.error('❌ [LeetSync] bootstrap error', e);
    if (e instanceof Error) {
      console.error('❌ Error stack:', e.stack);
    }
  }
})();