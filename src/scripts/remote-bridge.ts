import { BridgeMessage, BridgeMessageType } from "../types/bridge";

export {};

// This script runs as a content script on leetcode.com.
// Its purpose is to bridge the communication gap between the
// page-injected script (leetcode.js) and the extension's service worker.

console.log('[CodeSync] Bridge content script loaded.');

window.addEventListener(
  'message',
  (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) {
      return;
    }

    const message = event.data;

    // Check if the message is the one we're looking for
    if (message && message.type === 'FROM_PAGE_SCRIPT' && message.handlerId) {
      console.log('[CodeSync Bridge] Received message from page script:', message);

      // Forward the message to the service worker
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            '[CodeSync Bridge] Error sending message to service worker:',
            chrome.runtime.lastError,
          );
        } else {
          console.log(
            '[CodeSync Bridge] Message forwarded to service worker, response:',
            response,
          );
        }
      });
    }
  },
  false,
);

chrome.runtime.onMessage.addListener((message: BridgeMessage, sender, sendResponse) => {
    if (message.type === BridgeMessageType.FROM_SERVICE_WORKER) {
        console.log('[CodeSync Bridge] Received message from service worker:', message);
        window.postMessage(message, '*');
    }
});
