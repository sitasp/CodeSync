//this script should only run in leetcode/problems/*.com pages  (i.e. the problem page)

import { LeetCodeHandler, GithubHandler } from '../handlers';

const leetcode = new LeetCodeHandler();
const github = new GithubHandler();

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

chrome.runtime.onMessage.addListener(async function (request, _s, _sendResponse) {
  if (request && request.type === 'get-submission') {
    const questionSlug = request?.data?.questionSlug;

    if (!questionSlug) return;

    // Check if LeetCode provider is enabled
    const result = await chrome.storage.sync.get(['provider_settings']);
    const providerSettings = result.provider_settings;

    if (providerSettings && providerSettings.leetcode && !providerSettings.leetcode.enabled) {
      console.log('LeetCode provider is disabled, skipping sync');
      return;
    }

    let retries = 0;
    let submission = await leetcode.getSubmission(questionSlug);
    while (!submission && retries < 3) {
      retries++;
      await sleep(retries * 1000);
      submission = await leetcode.getSubmission(questionSlug);
    }
    if (!submission) return;
    //validate submission's timestamp, if its was submitted more than 1 minute ago, then its an old submission and we should ignore it
    const now = new Date();
    const submissionDate = new Date(submission.timestamp * 1000);
    const diff = now.getTime() - submissionDate.getTime();
    const diffInMinutes = Math.floor(diff / 1000 / 60);

    if (diffInMinutes > 1) return;

    console.log("Inside after submission ");
    console.log(submission);


    // Show popup for user choice
    const userChoice = await showPopup();
    let useDefaultSubmit:boolean = false;
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

    const isPushed = await github.submit(submission, useDefaultSubmit, 'leetcode');
    if (isPushed) {
      chrome.runtime.sendMessage({ type: 'set-fire-icon' });
    }
  }
});
