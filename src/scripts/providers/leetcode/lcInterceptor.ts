import { ApiInterceptor, bindDecorators } from '../../../internal/apiDecorator';
import { HttpInterceptor } from '../../../internal/httpInterceptor';

/**
 * LeetCode-specific handlers. Add new endpoints by decorating methods.
 * These run ONLY on leetcode.com (per manifest matches) and ONLY for URLs that match.
 */
class LeetCodeApiHandlers {

  // Intercept classic REST submission details
  @ApiInterceptor('/submissions/detail')
  async onSubmissionDetail({ requestContext, responseContext }: any) {
    console.log('[LeetSync] submission detail matched', { 
      url: requestContext.path, 
      method: requestContext.method, 
      status: responseContext.statusCode 
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
  try {
    // Start interceptor first
    const http = new HttpInterceptor();
    http.start();

    // Instantiate handler class and bind its decorators to this instance
    const handlers = new LeetCodeApiHandlers();
    bindDecorators(handlers);

    console.log('[LeetSync] lcInterceptor initialized');
  } catch (e) {
    console.error('[LeetSync] bootstrap error', e);
  }
})();