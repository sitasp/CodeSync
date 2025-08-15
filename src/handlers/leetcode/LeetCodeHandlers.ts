import { ApiInterceptor } from '../../internal/apiDecorator';

/**
 * LeetCode-specific handlers. Add new endpoints by decorating methods.
 * These run ONLY on leetcode.com (per manifest matches) and ONLY for URLs that match.
 */
export class LeetCodeApiHandlers {
  public static readonly className = 'LeetCodeApiHandlers';

  // Intercept classic REST submission details
  @ApiInterceptor('/submissions/detail')
  async onSubmissionDetail({ requestContext, responseContext }: any) {
    console.log('🎯 [REST API] Submission Detail Request:', {
      url: requestContext.path,
      method: requestContext.method,
      headers: requestContext.headers,
      body: requestContext.payload,
    });

    console.log('📨 [REST API] Submission Detail Response:', {
      status: responseContext.statusCode,
      headers: responseContext.headers,
      data: responseContext.payload,
    });

    // Example: extract minimal fields if present
    try {
      const submissionId = /submissions\/detail\/(\d+)/.exec(
        requestContext.path,
      )?.[1];
      const data = responseContext.payload;
      const language =
        data?.lang || data?.submission?.lang || data?.programmingLanguage;
      const status = data?.statusDisplay || data?.status || data?.state;

      if (typeof window !== 'undefined') {
        window.postMessage(
        {
          type: 'SUBMISSION_DATA',
          provider: 'LeetCode',
          data: {
            submissionId,
            language,
            status,
            raw: data,
          },
          timestamp: Date.now(),
        },
        '*',
      );
      }
    } catch (e) {
      console.warn('[LeetSync] Failed to parse submission detail', e);
    }
  }

  // Intercept submission endpoint
  @ApiInterceptor(/\/problems\/[^\/]+\/submit\//, { remote: true })
  async onSubmissionSubmit({ requestContext, responseContext }: any) {
  }

  // Intercept GraphQL responses, narrow down using a regex for op name if needed
  @ApiInterceptor(/graphql/) // broaden or specialize as you like
  async onGraphQL({ requestContext, responseContext }: any) {
    console.log('🎯 [GraphQL API] Request:', {
      url: requestContext.path,
      method: requestContext.method,
      headers: requestContext.headers,
      body: requestContext.payload,
    });

    console.log('📨 [GraphQL API] Response:', {
      status: responseContext.statusCode,
      headers: responseContext.headers,
      data: responseContext.payload,
    });
  }
}
