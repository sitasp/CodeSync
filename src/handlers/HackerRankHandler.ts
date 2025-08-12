export default class HackerRankHandler {

  // New method to format intercepted submission data
  formatSubmissionFromInterceptedData(submissionData: any, challengeSlug: string): any {
    console.log('🔄 Formatting intercepted HackerRank submission data');

    // Use the existing formatSubmissionData method but with intercepted data
    return this.formatSubmissionData(submissionData, challengeSlug);
  }

  private formatSubmissionData(submission: any, challengeSlug: string): any {
    // Calculate average execution time
    const executionTimes = submission.codechecker_time || [];
    const avgTime = executionTimes.length > 0
      ? executionTimes.reduce((sum: number, time: number) => sum + time, 0) / executionTimes.length
      : 0;

    // Map HackerRank data to common submission format
    return {
      code: submission.code,
      language: {
        verboseName: submission.language,
        name: submission.language.toLowerCase()
      },
      statusCode: 10, // Use LeetCode success code for compatibility
      runtime: Math.round(avgTime * 1000), // Convert to milliseconds
      runtimeDisplay: `${Math.round(avgTime * 1000)}ms`,
      runtimePercentile: 50, // HackerRank doesn't provide percentiles, use default
      memory: 0, // HackerRank doesn't provide memory usage
      memoryDisplay: 'N/A',
      memoryPercentile: 50,
      question: {
        questionId: submission.challenge_id?.toString() || challengeSlug,
        questionFrontendId: challengeSlug,
        title: submission.name || challengeSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        titleSlug: challengeSlug,
        content: `<p>HackerRank Problem: ${submission.name || challengeSlug}</p><p>Track: ${submission.track?.track_name || 'Unknown'}</p>`,
        difficulty: 'Medium' // HackerRank doesn't have difficulty levels like LeetCode, use default
      },
      timestamp: Math.floor(new Date(submission.created_at).getTime() / 1000),
      notes: '' // HackerRank doesn't have notes
    };
  }
}