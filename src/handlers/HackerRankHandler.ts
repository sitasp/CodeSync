export default class HackerRankHandler {
  private baseUrl: string = 'https://www.hackerrank.com';

  async getSubmission(challengeSlug: string, submissionId?: string): Promise<any | null> {
    try {
      console.log('🔍 HackerRank getSubmission called with:', { challengeSlug, submissionId });
      
      // Get authentication cookies
      const sessionResult = await chrome.storage.sync.get(['hackerrank_session']);
      const { hackerrank_session } = sessionResult;

      if (!hackerrank_session) {
        console.log('❌ No HackerRank session cookie found');
        return null;
      }

      // Get all cookies to build the request
      const cookies = await this.getAllHackerRankCookies();
      const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      console.log('🍪 HackerRank cookies prepared:', cookies.length, 'cookies');

      // Get CSRF token from page
      const csrfToken = await this.getCSRFToken();
      console.log('🔐 CSRF token obtained:', csrfToken ? 'Yes' : 'No');

      let targetSubmissionId = submissionId;
      
      // If no submission ID provided, find the latest one
      if (!targetSubmissionId) {
        console.log('🔍 No submission ID provided, finding latest...');
        targetSubmissionId = await this.getLatestSubmissionId(challengeSlug, cookieString, csrfToken) || undefined;
      }
      
      if (!targetSubmissionId) {
        console.log('❌ No submission ID found for challenge:', challengeSlug);
        return null;
      }

      console.log('🎯 Polling submission status for ID:', targetSubmissionId);
      // Poll the submission status until completion
      const submission = await this.pollSubmissionStatus(challengeSlug, targetSubmissionId, cookieString, csrfToken);
      
      return submission;
    } catch (error) {
      console.error('❌ Error getting HackerRank submission:', error);
      return null;
    }
  }

  private async getAllHackerRankCookies(): Promise<chrome.cookies.Cookie[]> {
    return new Promise((resolve) => {
      chrome.cookies.getAll({ domain: '.hackerrank.com' }, (cookies) => {
        resolve(cookies || []);
      });
    });
  }

  private async getCSRFToken(): Promise<string | null> {
    // Try to get CSRF token from meta tag or cookies
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return null;

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
          if (metaToken) return metaToken;
          
          // Fallback: try to find token in script tags
          const scripts = document.getElementsByTagName('script');
          for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            if (script.textContent?.includes('csrf_token')) {
              const match = script.textContent.match(/csrf_token['"]:['"]([^'"]+)['"]/);
              if (match) return match[1];
            }
          }
          return null;
        }
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      return null;
    }
  }

  private async getLatestSubmissionId(challengeSlug: string, cookieString: string, csrfToken: string | null): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/rest/contests/master/challenges/${challengeSlug}/submissions`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
      };

      if (csrfToken) {
        headers['X-Csrf-Token'] = csrfToken;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.log('❌ Failed to get submissions:', response.status);
        return null;
      }

      const data = await response.json();
      
      // Find the most recent submission (within last 2 minutes)
      const now = Date.now();
      const recentSubmissions = data.models?.filter((submission: any) => {
        const submissionTime = new Date(submission.created_at).getTime();
        const timeDiff = now - submissionTime;
        return timeDiff < 2 * 60 * 1000; // 2 minutes
      }) || [];

      if (recentSubmissions.length === 0) {
        console.log('❌ No recent submissions found');
        return null;
      }

      // Get the latest submission
      const latestSubmission = recentSubmissions.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return latestSubmission.id?.toString() || null;
    } catch (error) {
      console.error('❌ Error getting latest submission ID:', error);
      return null;
    }
  }

  private async pollSubmissionStatus(challengeSlug: string, submissionId: string, cookieString: string, csrfToken: string | null): Promise<any | null> {
    const maxRetries = 15; // 15 retries with 3-second intervals = 45 seconds max
    let retries = 0;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Cookie': cookieString,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
    };

    if (csrfToken) {
      headers['X-Csrf-Token'] = csrfToken;
    }

    console.log('🔄 Starting HackerRank submission polling...', { challengeSlug, submissionId, maxRetries });

    while (retries < maxRetries) {
      try {
        const url = `${this.baseUrl}/rest/contests/master/challenges/${challengeSlug}/submissions/${submissionId}`;
        console.log(`🔄 Poll attempt ${retries + 1}/${maxRetries}: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers
        });

        console.log('🔍 Response status:', response.status, response.statusText);

        if (!response.ok) {
          console.log(`❌ Failed to get submission status: ${response.status} ${response.statusText}`);
          if (response.status === 403 || response.status === 401) {
            console.log('❌ Authentication failed, stopping polling');
            return null;
          }
          // Continue polling for other errors
          retries++;
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        const data = await response.json();
        const submission = data.model;

        if (!submission) {
          console.log('❌ No submission data found in response');
          return null;
        }

        console.log(`🔄 HackerRank submission status: ${submission.status} (code: ${submission.status_code})`);

        // Check if submission is complete
        if (submission.status !== 'Processing' && submission.status_code !== 3) {
          // Submission is complete
          if (submission.status === 'Accepted' && submission.status_code === 1) {
            console.log('✅ HackerRank submission accepted!');
            return this.formatSubmissionData(submission, challengeSlug);
          } else {
            console.log(`❌ HackerRank submission failed: ${submission.status} (code: ${submission.status_code})`);
            return null;
          }
        }

        // Wait 3 seconds before next poll
        console.log('⏳ Waiting 3 seconds before next poll...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        retries++;
      } catch (error) {
        console.error('❌ Error polling submission status:', error);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('❌ HackerRank submission polling timed out after', maxRetries, 'attempts');
    return null;
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