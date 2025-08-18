import { createClientProxy } from './internal/clientProxy';
import { handlers } from './handlers/remoteHandlerMap';
import { handleLeetCodeTabUpdate } from './handlers/leetcode/leetcodeTabHandler';
import GithubHandler from './handlers/GithubHandler'; // Import GithubHandler
import { getUserData, setUserData, updateProblemsSolved } from './lib/userData'; // Import userData functions

export {}; // Mark as module

// This service worker is completely decoupled from the page scripts.
// It does not import any code that might reference the 'window' object.

console.log('[Service Worker] Initializing...');

// The handlers map is now imported from remoteHandlerMap.ts

// Function to handle submission logic (moved from leetcode.ts)
async function handleSubmission(submission: any, questionSlug: string, userChoice: string) {
  console.log('✅ [background.ts] handleSubmission called.');
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
    // Send message to content script to set fire icon (if needed)
    // This part needs to be handled carefully as it's a message from SW to CS
    // chrome.tabs.sendMessage(sender.tab.id, { type: 'set-fire-icon' });
  }
}


// This listener handles messages forwarded from the content script bridge.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FROM_PAGE_SCRIPT' && message.handlerId) {
    const handler = handlers[message.handlerId];

    if (handler) {
      console.log(`[Service Worker] Executing remote handler for ${message.handlerId}`);
      try {
        const result: any = handler(message.contexts);

        // Check if the result is a promise-like object (i.e., an async handler)
        if (typeof result === 'object' && result !== null && typeof result.then === 'function') {
          result.then((resolvedValue: any) => {
            sendResponse({ status: 'OK', value: resolvedValue });
          }).catch((error: any) => {
            console.error(`[Service Worker] Error executing async handler ${message.handlerId}:`, error);
            sendResponse({ status: 'ERROR', error: error.message });
          });
        } else {
          // Synchronous handler
          sendResponse({ status: 'OK' });
        }
      } catch (e) {
        console.error(`[Service Worker] Error executing handler ${message.handlerId}:`, e);
        sendResponse({ status: 'ERROR', error: (e as Error).message });
      }
    } else {
      console.warn(`[Service Worker] No remote handler found for ${message.handlerId}`);
      sendResponse({ status: 'NOT_FOUND' });
    }
  } else if (message.type === 'POPUP_CHOICE' && message.data) {
    // Handle the popup choice from the content script
    console.log('[Service Worker] Received POPUP_CHOICE from content script:', message.data);
    const { userChoice, submissionDetails, questionSlug } = message.data;
    handleSubmission(submissionDetails, questionSlug, userChoice);
    sendResponse({ status: 'OK' });
  }
  // Return true to indicate you wish to send a response asynchronously.
  return true;
});

// This logic injects the page script into LeetCode tabs.
chrome.tabs.onUpdated.addListener(handleLeetCodeTabUpdate);

// Future Listeners can be added here for other sites or functionalities.

// Example of using the client proxy
interface MainWorldApi {
    showNotification(message: string): void;
}

const mainWorldApi = createClientProxy<MainWorldApi>('MainWorldApi');

// Call a method on the main world api
mainWorldApi.showNotification('Hello from the service worker!');
