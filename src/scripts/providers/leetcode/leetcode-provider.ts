// LeetCode Provider - Handles LeetCode-specific logic
// Implements the provider interface for LeetCode platform

import { 
  Provider, 
  ProviderConfig, 
  InterceptedResponse, 
  SubmissionData, 
  ProblemData 
} from '../../core/provider-interface';

export class LeetCodeProvider extends Provider {
  config: ProviderConfig = {
    name: 'LeetCode',
    domain: 'leetcode.com',
    urlPatterns: [
      '/graphql',
      '/problems/',
      '/submit/'
    ]
  };

  /**
   * Check if this provider should handle the given URL
   */
  matchUrl(url: string): boolean {
    // Check if URL contains LeetCode domain or patterns
    return url.includes('leetcode.com') || 
           this.config.urlPatterns.some(pattern => url.includes(pattern));
  }

  /**
   * Extract problem slug from current page URL
   */
  extractProblemId(): string | null {
    const path = window.location.pathname;
    const match = path.match(/\/problems\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if the intercepted response contains submission data
   */
  isSubmissionData(response: InterceptedResponse): boolean {
    const { data } = response;
    
    if (!data) return false;

    // Check for various LeetCode submission response formats
    return !!(
      data.submissionDetails || 
      (data.data && data.data.submissionDetails) ||
      (data.questionSubmissionList && data.questionSubmissionList.submissions) ||
      (data.data && data.data.submitCode) ||
      data.submitCode ||
      this.looksLikeSubmissionCall(response.url, data)
    );
  }

  /**
   * Parse the response data into standardized submission format
   */
  parseSubmissionData(response: InterceptedResponse): SubmissionData | null {
    const { data } = response;
    
    try {
      let submissionDetails;
      
      // Extract submission details from various response formats
      if (data.submissionDetails) {
        submissionDetails = data.submissionDetails;
      } else if (data.data && data.data.submissionDetails) {
        submissionDetails = data.data.submissionDetails;
      } else if (data.data && data.data.submitCode) {
        // Handle submit response format
        return this.parseSubmitResponse(data.data.submitCode);
      } else {
        console.log('❌ Could not extract submission details from response');
        return null;
      }

      // Validate submission is successful
      if (submissionDetails.statusCode !== 10) {
        console.log('⚠️ Submission was not successful, status:', submissionDetails.statusCode);
        return null;
      }

      // Validate timestamp (only recent submissions)
      if (!this.isRecentSubmission(submissionDetails.timestamp)) {
        console.log('⏰ Submission is too old, ignoring');
        return null;
      }

      const problemData: ProblemData = {
        problemId: submissionDetails.question.questionId || submissionDetails.question.questionFrontendId || 'unknown',
        title: submissionDetails.question.title,
        slug: submissionDetails.question.titleSlug,
        difficulty: submissionDetails.question.difficulty,
        content: submissionDetails.question.content,
        likes: submissionDetails.question.likes || 0,
        dislikes: submissionDetails.question.dislikes || 0
      };

      const submissionData: SubmissionData = {
        code: submissionDetails.code,
        language: submissionDetails.lang.verboseName || submissionDetails.lang.name,
        status: this.getStatusFromCode(submissionDetails.statusCode),
        timestamp: submissionDetails.timestamp,
        problem: problemData,
        performance: {
          runtime: submissionDetails.runtimeDisplay,
          memory: submissionDetails.memoryDisplay,
          runtimePercentile: submissionDetails.runtimePercentile,
          memoryPercentile: submissionDetails.memoryPercentile
        },
        // Include original LeetCode-specific data
        leetcodeData: {
          statusCode: submissionDetails.statusCode,
          runtimeDistribution: submissionDetails.runtimeDistribution,
          memoryDistribution: submissionDetails.memoryDistribution,
          topicTags: submissionDetails.topicTags,
          notes: submissionDetails.notes,
          user: submissionDetails.user
        }
      };

      return submissionData;
    } catch (error) {
      console.error('❌ Error parsing LeetCode submission data:', error);
      return null;
    }
  }

  /**
   * Check if this response should be processed
   */
  shouldProcessResponse(response: InterceptedResponse): boolean {
    const { url } = response;
    
    // Process GraphQL requests and submission-related URLs
    return url.includes('/graphql') || 
           url.includes('/submit') || 
           url.includes('/check') ||
           url.includes('/problems/');
  }

  /**
   * Check if this looks like a submission-related call (helper method)
   */
  private looksLikeSubmissionCall(url: string, data: any): boolean {
    if (!data) return false;
    
    const dataStr = JSON.stringify(data).toLowerCase();
    return (
      dataStr.includes('submission') ||
      dataStr.includes('submitcode') ||
      dataStr.includes('submissiondetails') ||
      url.includes('submit')
    );
  }

  /**
   * Parse submit response format (different from submission details)
   */
  private parseSubmitResponse(submitData: any): SubmissionData | null {
    // This would handle the immediate submit response format
    // Implementation depends on LeetCode's submit API response structure
    console.log('📝 Parsing submit response:', submitData);
    
    // For now, return null as we primarily use submission details
    // This can be implemented if needed for immediate feedback
    return null;
  }

  /**
   * Check if submission is recent (within 1 minute)
   */
  private isRecentSubmission(timestamp: number): boolean {
    const now = new Date();
    const submissionDate = new Date(timestamp * 1000);
    const diff = now.getTime() - submissionDate.getTime();
    const diffInMinutes = Math.floor(diff / 1000 / 60);
    
    return diffInMinutes <= 1;
  }

  /**
   * Convert LeetCode status code to readable status
   */
  private getStatusFromCode(statusCode: number): string {
    const statusMap: { [key: number]: string } = {
      10: 'Accepted',
      11: 'Wrong Answer',
      12: 'Memory Limit Exceeded',
      13: 'Output Limit Exceeded',
      14: 'Time Limit Exceeded',
      15: 'Runtime Error',
      16: 'Internal Error',
      20: 'Compile Error',
      21: 'Unknown Error'
    };
    
    return statusMap[statusCode] || `Unknown Status (${statusCode})`;
  }

  /**
   * Get LeetCode-specific debug information
   */
  getDebugInfo(): any {
    return {
      ...super.getDebugInfo(),
      problemSlug: this.extractProblemId(),
      pageType: this.getPageType(),
      isOnProblemPage: window.location.pathname.includes('/problems/'),
      currentPath: window.location.pathname
    };
  }

  /**
   * Determine what type of LeetCode page we're on
   */
  private getPageType(): string {
    const path = window.location.pathname;
    
    if (path.includes('/problems/')) return 'problem';
    if (path.includes('/submissions/')) return 'submissions';
    if (path.includes('/discuss/')) return 'discuss';
    if (path.includes('/explore/')) return 'explore';
    if (path === '/') return 'home';
    
    return 'other';
  }
}