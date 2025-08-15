import { decoratorRegistry, bindDecorators } from './internal/apiDecorator';
import { LeetCodeApiHandlers } from './handlers/LeetCodeHandlers';

console.log('[Service Worker] Initializing...');

// Instantiate and bind decorators for handler classes in the service worker context.
// This populates the service worker's own `decoratorRegistry`.
bindDecorators(new LeetCodeApiHandlers());

// This listener handles messages forwarded from the content script bridge.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FROM_PAGE_SCRIPT' && message.handlerId) {
    const [className, methodName] = message.handlerId.split(':');

    // Find the corresponding handler method in the service worker's registry.
    const entry = decoratorRegistry.find(
      (e) =>
        ((e.instance.constructor as any).className === className ||
          e.instance.constructor.name === className) &&
        e.methodName === methodName,
    );

    if (entry) {
      console.log(`[Service Worker] Executing remote handler for ${message.handlerId}`);
      try {
        entry.instance[entry.methodName](message.contexts);
        sendResponse({ status: 'OK', handlerId: message.handlerId });
      } catch (e) {
        console.error(`[Service Worker] Error executing handler ${message.handlerId}:`, e);
        sendResponse({ status: 'ERROR', error: (e as Error).message });
      }
    } else {
      console.warn(`[Service Worker] No remote handler found for ${message.handlerId}`);
      sendResponse({ status: 'NOT_FOUND', handlerId: message.handlerId });
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
    console.log('✅ LeetCode tab detected. Injecting script...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['static/scripts/leetcode.js'],
        world: 'MAIN',
      });
      console.log('✅ Injected leetcode.js into the main world.');
    } catch (e) {
      console.error('❌ Error injecting script:', e);
    }
  }
});
