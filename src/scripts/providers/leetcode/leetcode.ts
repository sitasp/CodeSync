//this script should only run in leetcode/problems/*.com pages  (i.e. the problem page)

import { GithubHandler } from '../../../handlers';
import { injectAPIInterceptor } from '../../api-interceptor';
import { Submission } from '../../../types/Submission';

const github = new GithubHandler();

console.log('🎬 LeetCode content script starting...');

// Inject API interceptor when script loads
console.log('🎯 About to inject API interceptor...');
injectAPIInterceptor();
console.log('✅ API interceptor injection completed');

// const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Listen for intercepted API data from the modular injected script
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) return;
  
  const { type, provider, data, timestamp, metadata } = event.data;
  
  // Handle API responses (for debugging)
  if (type === 'API_RESPONSE' && provider === 'LeetCode') {
    console.log(`🔍 API Response [${metadata?.source}]:`, {
      url: metadata?.url,
      provider,
      data,
      debugInfo: metadata?.debugInfo
    });
  }
  
  // Handle submission data
  if (type === 'SUBMISSION_DATA' && provider === 'LeetCode') {
    console.log('📨 Received intercepted submission data:', {
      provider,
      problemId: metadata?.problemId,
      language: metadata?.language,
      status: metadata?.status,
      timestamp
    });
    
    // Forward to background script for caching
    // Note: data is now standardized SubmissionData format
    chrome.runtime.sendMessage({
      type: 'CACHE_SUBMISSION_DATA',
      questionSlug: data.problem.slug || data.problem.problemId,
      submissionData: data, // This is now standardized format
      timestamp,
      provider
    });
  }
});

// Function to show popup
async function showPopup() {
  return new Promise((resolve) => {
    // First inject required styles
    const style = document.createElement('style');
    style.textContent = `
      .leetcode-popup {
        position: fixed;
        top: 10px;
        right: 10px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        padding: 16px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      }
      .leetcode-popup-header {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #1a202c;
      }
      .leetcode-popup-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .leetcode-button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
        width: 100%;
        text-align: left;
      }
      .leetcode-button:hover {
        background-color: #EDF2F7;
      }
      .leetcode-button.skip {
        color: #718096;
      }
      .leetcode-button.override {
        color: #3182CE;
      }
      .leetcode-button.create {
        color: #38A169;
      }
    `;
    document.head.appendChild(style);

    // Create main popup container
    const popup = document.createElement('div');
    popup.className = 'leetcode-popup';

    // Create header
    const header = document.createElement('div');
    header.className = 'leetcode-popup-header';
    header.textContent = 'Submit to Github';
    popup.appendChild(header);

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'leetcode-popup-buttons';

    // Create Skip button
    const skipButton = document.createElement('button');
    skipButton.id = 'skipButton';
    skipButton.className = 'leetcode-button skip';
    skipButton.textContent = 'Skip';
    buttonsContainer.appendChild(skipButton);

    // Create Override button
    const overrideButton = document.createElement('button');
    overrideButton.id = 'overrideButton';
    overrideButton.className = 'leetcode-button override';
    overrideButton.textContent = 'Override Existing';
    buttonsContainer.appendChild(overrideButton);

    // Create New button
    const createNewButton = document.createElement('button');
    createNewButton.id = 'createNewButton';
    createNewButton.className = 'leetcode-button create';
    createNewButton.textContent = 'Create New File';
    buttonsContainer.appendChild(createNewButton);

    // Add buttons container to popup
    popup.appendChild(buttonsContainer);

    // Add popup to body
    document.body.appendChild(popup);

    // Add click event listeners
    const cleanup = () => {
      document.body.removeChild(popup);
      document.head.removeChild(style);
    };

    skipButton.onclick = () => {
      cleanup();
      resolve('skip');
    };

    overrideButton.onclick = () => {
      cleanup();
      resolve('override');
    };

    createNewButton.onclick = () => {
      cleanup();
      resolve('createNew');
    };

    // Close popup when clicking outside
    document.addEventListener('click', (event) => {
      if (!popup.contains(event.target as Node)) {
        cleanup();
        resolve('skip');
      }
    }, { once: true }); // Use once: true to ensure the listener is removed after first use
  });
}

// Function to skip submission
function funcSkip() {
  console.log('Skipping submission');
}

// Function to override submission
function funcOverride() {
  console.log('Overriding submission');
}

// Function to create new submission
function funcCreateNew() {
  console.log('Creating new submission');
}

// Helper function to extract submission details from intercepted data
function extractSubmissionFromData(data: any): Submission | null {
  try {
    // Check if this is the new standardized format (from modular provider)
    if (data.code && data.language && data.problem && data.timestamp) {
      // Convert standardized SubmissionData to legacy Submission format
      return convertStandardizedToLegacy(data);
    }
    
    // Handle legacy formats (for backwards compatibility)
    let submissionDetails = null;
    
    if (data.submissionDetails) {
      submissionDetails = data.submissionDetails;
    } else if (data.data && data.data.submissionDetails) {
      submissionDetails = data.data.submissionDetails;
    }
    
    if (!submissionDetails) {
      console.log('❌ No submission details found in intercepted data');
      return null;
    }
    
    return submissionDetails as Submission;
  } catch (error) {
    console.error('❌ Error extracting submission data:', error);
    return null;
  }
}

// Convert standardized SubmissionData format to legacy Submission format
function convertStandardizedToLegacy(standardData: any): Submission {
  return {
    code: standardData.code,
    timestamp: standardData.timestamp,
    statusCode: standardData.status === 'Accepted' ? 10 : 11, // Map status to code
    runtime: standardData.performance?.runtime?.replace(/[^0-9]/g, '') || 0,
    runtimeDisplay: standardData.performance?.runtime || '0 ms',
    runtimePercentile: standardData.performance?.runtimePercentile || 50,
    runtimeDistribution: { lang: standardData.language, distribution: ['0', 0] },
    memory: standardData.performance?.memory?.replace(/[^0-9]/g, '') || 0,
    memoryDisplay: standardData.performance?.memory || '0 MB',
    memoryPercentile: standardData.performance?.memoryPercentile || 50,
    memoryDistribution: { lang: standardData.language, distribution: ['0', 0] },
    lang: {
      name: standardData.language.toLowerCase(),
      verboseName: standardData.language
    },
    question: {
      questionId: standardData.problem.problemId,
      title: standardData.problem.title || '',
      titleSlug: standardData.problem.slug || standardData.problem.problemId,
      content: standardData.problem.content || '',
      difficulty: standardData.problem.difficulty || 'Medium',
      questionFrontendId: standardData.problem.problemId,
      likes: standardData.problem.likes || 0,
      dislikes: standardData.problem.dislikes || 0
    },
    notes: standardData.leetcodeData?.notes || '',
    user: standardData.leetcodeData?.user || {
      username: 'user',
      profile: { realName: 'User', userAvatar: '' }
    }
  } as Submission;
}

// Helper function to validate submission timestamp
function isRecentSubmission(timestamp: number): boolean {
  const now = new Date();
  const submissionDate = new Date(timestamp * 1000);
  const diff = now.getTime() - submissionDate.getTime();
  const diffInMinutes = Math.floor(diff / 1000 / 60);
  
  return diffInMinutes <= 1;
}


// Process submission data (either cached or fallback)
async function processSubmissionData(submission: Submission) {
  console.log('📝 Processing submission:', submission);
  
  // Show popup for user choice
  const userChoice = await showPopup();
  let useDefaultSubmit: boolean = false;
  
  if (userChoice === 'skip') {
    funcSkip();
    return;
  } else if (userChoice === 'override') {
    funcOverride();
    useDefaultSubmit = true;
  } else if (userChoice === 'createNew') {
    funcCreateNew();
    useDefaultSubmit = false;
  }
  
  const isPushed = await github.submit(submission, useDefaultSubmit);
  if (isPushed) {
    chrome.runtime.sendMessage({ type: 'set-fire-icon' });
  }
}

chrome.runtime.onMessage.addListener(async function (request, _s, _sendResponse) {
  if (request && request.type === 'process-cached-submission') {
    const { questionSlug, submissionData } = request;
    
    console.log('💾 Processing cached submission for:', questionSlug);
    
    const submission = extractSubmissionFromData(submissionData);
    if (!submission) {
      console.log('❌ Failed to extract submission from cached data');
      return;
    }
    
    // Validate submission is recent
    if (!isRecentSubmission(submission.timestamp)) {
      console.log('⏰ Submission is too old, ignoring');
      return;
    }
    
    // Only process successful submissions
    if (submission.statusCode !== 10) {
      console.log('❌ Submission failed, not processing');
      return;
    }
    
    await processSubmissionData(submission);
  } else if (request && request.type === 'get-submission-fallback') {
    // Fallback method - this should rarely be needed with the new architecture
    const questionSlug = request?.data?.questionSlug;
    console.log('🔄 Using fallback method for:', questionSlug);
    
    // Note: This would require LeetCodeHandler which we're removing
    // For now, just log that we couldn't process this submission
    console.log('⚠️ Fallback method not implemented - submission missed');
  }
});
