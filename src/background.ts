import { handlers } from './handlers/remoteHandlerMap';
import { handleLeetCodeTabUpdate } from './handlers/leetcode/leetcodeTabHandler';

export {}; // Mark as module

// This service worker is completely decoupled from the page scripts.
// It does not import any code that might reference the 'window' object.

console.log('[Service Worker] Initializing...');

// The handlers map is now imported from remoteHandlerMap.ts

// This listener handles messages forwarded from the content script bridge.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FROM_PAGE_SCRIPT' && message.handlerId) {
    const handler = handlers[message.handlerId];

    if (handler) {
      console.log(`[Service Worker] Executing remote handler for ${message.handlerId}`);
      try {
        handler(message.contexts);
        sendResponse({ status: 'OK' });
      } catch (e) {
        console.error(`[Service Worker] Error executing handler ${message.handlerId}:`, e);
        sendResponse({ status: 'ERROR', error: (e as Error).message });
      }
    } else {
      console.warn(`[Service Worker] No remote handler found for ${message.handlerId}`);
      sendResponse({ status: 'NOT_FOUND' });
    }
  }
  // Return true to indicate you wish to send a response asynchronously.
  return true;
});

// This logic injects the page script into LeetCode tabs.
chrome.tabs.onUpdated.addListener(handleLeetCodeTabUpdate);

// Future Listeners can be added here for other sites or functionalities.