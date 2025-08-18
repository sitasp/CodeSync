export {};

// This script runs as a content script on leetcode.com.
// Its purpose is to bridge the communication gap between the
// page-injected script (leetcode.js) and the extension's service worker
// for the popup communication.

console.log('[CodeSync] Popup content script loaded.');

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'leetcode-submission') {
    console.log('[CodeSync Popup Content Script] Received leetcode-submission from service worker:', request.data);
    console.log('✅ [CodeSync Popup Content Script] Forwarding LEETCODE_SUBMISSION to page script.'); // Added log
    // Forward the submission details to the page script (leetcode.js)
    window.postMessage({ type: 'LEETCODE_SUBMISSION', data: request.data }, window.location.origin);
    sendResponse({ status: 'OK' }); // Acknowledge receipt
  }
});

// Listen for messages from the page script (leetcode.js) with user's popup choice
window.addEventListener(
  'message',
  (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) {
      return;
    }

    const message = event.data;

    if (message && message.type === 'POPUP_CHOICE' && message.data) {
      console.log('[CodeSync Popup Content Script] Received popup choice from page script:', message.data);
      // Forward the choice to the service worker
      chrome.runtime.sendMessage({ type: 'POPUP_CHOICE', data: message.data }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            '[CodeSync Popup Content Script] Error sending popup choice to service worker:',
            chrome.runtime.lastError,
          );
        }
      });
    }
  },
  false,
);
