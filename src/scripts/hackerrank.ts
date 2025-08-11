//this script should only run in hackerrank.com/challenges/* pages  (i.e. the challenge page)

import { GithubHandler } from '../handlers';
import HackerRankHandler from '../handlers/HackerRankHandler';

// Debug logging
console.log('🚀 HackerRank content script loaded on:', window.location.href);
console.log('🔍 Extension runtime ID:', chrome.runtime.id);
console.log('⏰ Script load time:', new Date().toISOString());

// Keep-alive heartbeat to verify script stays loaded
setInterval(() => {
  console.log('❤️ HackerRank content script alive at:', new Date().toLocaleTimeString());
}, 30000); // Every 30 seconds

const hackerrank = new HackerRankHandler();
const github = new GithubHandler();

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to show popup (reused from leetcode.ts)
async function showPopup() {
  return new Promise((resolve) => {
    // First inject required styles
    const style = document.createElement('style');
    style.textContent = `
      .hackerrank-popup {
        position: fixed;
        top: 10px;
        right: 10px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        padding: 16px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        border: 2px solid #00EA64;
      }
      .hackerrank-popup-header {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #00EA64;
        display: flex;
        align-items: center;
      }
      .hackerrank-popup-header::before {
        content: "🏆";
        margin-right: 8px;
      }
      .hackerrank-popup-body {
        margin-bottom: 16px;
        color: #333;
        font-size: 14px;
      }
      .hackerrank-popup-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .hackerrank-popup-button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
      }
      .hackerrank-popup-button.primary {
        background: #00EA64;
        color: white;
      }
      .hackerrank-popup-button.primary:hover {
        background: #00D159;
      }
      .hackerrank-popup-button.secondary {
        background: #f5f5f5;
        color: #333;
      }
      .hackerrank-popup-button.secondary:hover {
        background: #e0e0e0;
      }
      .hackerrank-popup-button.danger {
        background: #ff6b6b;
        color: white;
      }
      .hackerrank-popup-button.danger:hover {
        background: #ff5252;
      }
    `;
    document.head.appendChild(style);

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'hackerrank-popup';
    popup.innerHTML = `
      <div class="hackerrank-popup-header">
        HackerRank Solution Accepted!
      </div>
      <div class="hackerrank-popup-body">
        Your solution was accepted! How would you like to sync it to GitHub?
      </div>
      <div class="hackerrank-popup-buttons">
        <button class="hackerrank-popup-button danger" id="skip-btn">Skip</button>
        <button class="hackerrank-popup-button secondary" id="override-btn">Override Existing</button>
        <button class="hackerrank-popup-button primary" id="create-new-btn">Create New File</button>
      </div>
    `;

    document.body.appendChild(popup);

    const cleanup = () => {
      document.body.removeChild(popup);
      document.head.removeChild(style);
    };

    const skipButton = popup.querySelector('#skip-btn') as HTMLButtonElement;
    const overrideButton = popup.querySelector('#override-btn') as HTMLButtonElement;
    const createNewButton = popup.querySelector('#create-new-btn') as HTMLButtonElement;

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
  console.log('Skipping HackerRank submission');
}

// Function to override submission
function funcOverride() {
  console.log('Overriding HackerRank submission');
}

// Function to create new submission
function funcCreateNew() {
  console.log('Creating new HackerRank submission');
}

chrome.runtime.onMessage.addListener(async function (request, _s, _sendResponse) {
  console.log('📨 HackerRank content script received message:', request);
  
  if (request && request.type === 'get-hackerrank-submission') {
    console.log('✅ Processing HackerRank submission request for:', request.data?.challengeSlug);
    const challengeSlug = request?.data?.challengeSlug;

    if (!challengeSlug) return;

    // Check if HackerRank provider is enabled
    const result = await chrome.storage.sync.get(['provider_settings']);
    const providerSettings = result.provider_settings;
    
    if (providerSettings && providerSettings.hackerrank && !providerSettings.hackerrank.enabled) {
      console.log('HackerRank provider is disabled, skipping sync');
      return;
    }

    let retries = 0;
    let submission = await hackerrank.getSubmission(challengeSlug);
    while (!submission && retries < 3) {
      retries++;
      await sleep(retries * 2000); // Longer delays for HackerRank
      submission = await hackerrank.getSubmission(challengeSlug);
    }
    
    if (!submission) {
      console.log('❌ Failed to get HackerRank submission after retries');
      return;
    }

    // Validate submission's timestamp, if it was submitted more than 2 minutes ago, ignore it
    const now = new Date();
    const submissionDate = new Date(submission.timestamp * 1000);
    const diff = now.getTime() - submissionDate.getTime();
    const diffInMinutes = Math.floor(diff / 1000 / 60);

    if (diffInMinutes > 2) {
      console.log('❌ HackerRank submission is too old, ignoring');
      return;
    }

    console.log("✅ HackerRank submission processed:");
    console.log(submission);

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

    const isPushed = await github.submit(submission, useDefaultSubmit, 'hackerrank');
    if (isPushed) {
      chrome.runtime.sendMessage({ type: 'set-fire-icon' });
    }
  }
});