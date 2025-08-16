// LeetCode API Interceptor - Entry point script for LeetCode HTTP interception
// This script is injected into leetcode.com pages via manifest.json

import { bindDecorators } from '../internal/apiDecorator';
import { HttpInterceptor } from '../internal/httpInterceptor';
import { LeetCodeApiHandlers } from '../handlers/leetcode/LeetCodeHandlers';
import GithubHandler from '../handlers/GithubHandler';
import { getUserData, setUserData, updateProblemsSolved } from '../lib/userData';

export {}; // Make this a module

// ---- Bootstrap (runs when script is injected on leetcode.com) ----
(function bootstrap() {
  console.log('🚀 LeetCode API Interceptor script starting...');
  console.log('🌍 Current URL:', window.location.href);
  console.log('🏠 Current hostname:', window.location.hostname);

  try {
    // Instantiate handler class and bind decorators FIRST
    console.log('🏗️ Creating LeetCode handlers and binding decorators...');
    const handlers = new LeetCodeApiHandlers();
    bindDecorators(handlers);
    console.log('🔗 Decorators bound.');

    // Now, create and start the interceptor
    console.log('📡 Creating HTTP interceptor...');
    const http = new HttpInterceptor();

    console.log('🔌 Starting HTTP interceptor...');
    http.start();

    console.log('✅ [CodeSync] lcInterceptor initialized successfully');
    console.log('🔍 Checking if fetch is patched:', typeof window.fetch);
    console.log('🔍 Checking if XMLHttpRequest is patched:', typeof XMLHttpRequest);
  } catch (e) {
    console.error('❌ [CodeSync] bootstrap error', e);
    if (e instanceof Error) {
      console.error('❌ Error stack:', e.stack);
    }
  }
})();

// Function to show popup
async function showPopup(): Promise<string> {
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

async function handleSubmission(submission: any, questionSlug: string) {
  const userData = await getUserData();
  if (!userData.github_leetsync_token || !userData.github_username || !userData.github_leetsync_repo) {
    console.log('❌ Missing Github Credentials');
    return;
  }

  const github = new GithubHandler(
    userData.github_leetsync_token,
    userData.github_username,
    userData.github_leetsync_repo,
    userData.github_leetsync_subdirectory || ''
  );

  const userChoice = await showPopup();
  let useDefaultSubmit: boolean = false;
  if (userChoice === 'skip') {
    return;
  } else if (userChoice === 'override') {
    useDefaultSubmit = true;
  } else if (userChoice === 'createNew') {
    useDefaultSubmit = false;
  }

  const result = await github.submit(submission, useDefaultSubmit);

  if (result && typeof result !== 'boolean') {
    await updateProblemsSolved(result.problemsSolved);
    await setUserData({ lastSolved: result.lastSolved });
    chrome.runtime.sendMessage({ type: 'set-fire-icon' });
  }
}

chrome.runtime.onMessage.addListener(async function (request, _s, _sendResponse) {
  if (request && request.type === 'leetcode-submission') {
    const { submissionDetails, questionSlug } = request.data;
    await handleSubmission(submissionDetails, questionSlug);
  }
});