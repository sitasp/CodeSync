// LeetCode API Interceptor - Entry point script for LeetCode HTTP interception
// This script is injected into leetcode.com pages via manifest.json

import { bindDecorators } from '../internal/apiDecorator';
import { HttpInterceptor } from '../internal/httpInterceptor';
import { LeetCodeApiHandlers } from '../handlers/leetcode/LeetCodeHandlers';

console.log('🚀 [leetcode.ts] Script loaded.'); // Moved log

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
  console.log('✅ [leetcode.ts] showPopup called.');
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

// Listen for messages from the content script (remote-bridge.ts)
window.addEventListener('message', async (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  if (message && message.type === 'LEETCODE_SUBMISSION' && message.data) {
    console.log('✅ [leetcode.ts] Received LEETCODE_SUBMISSION from remote-bridge:', message.data);
    const { submissionDetails, questionSlug } = message.data;

    const userChoice = await showPopup();

    // Send the user's choice back to the content script
    window.postMessage({
      type: 'POPUP_CHOICE',
      data: { userChoice, submissionDetails, questionSlug },
    }, window.location.origin);
  }
});
