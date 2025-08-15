import { handlers } from './handlers/remoteHandlerMap';

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
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('leetcode.com')
  ) {
    // Prevent script from being injected multiple times
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.hasOwnProperty('__leetsync_injected'),
      });

      if (!results || !results[0] || !results[0].result) {
        console.log('✅ LeetCode tab detected. Injecting script...');
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => (window as any).__leetsync_injected = true,
        });
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['static/scripts/leetcode.js'],
          world: 'MAIN',
        });
        console.log('✅ Injected leetcode.js into the main world.');
      }
    } catch (e) {
      if (
        e instanceof Error &&
        !e.message.includes('Cannot access a chrome:// URL') &&
        !e.message.includes('The extensions gallery cannot be scripted')
      ) {
        console.error('❌ Error injecting script:', e);
      }
    }
  }
});
