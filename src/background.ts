chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('leetcode.com')
  ) {
    console.log('✅ LeetCode tab detected. Injecting script...');
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ['static/scripts/leetcode.js'],
        world: 'MAIN', // Inject into the main page context
      })
      .then(() => {
        console.log('✅ Injected leetcode.js into the main world.');
      })
      .catch((err) => {
        console.error('❌ Failed to inject leetcode.js:', err);
      });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'set-fire-icon') {
    //set icon to fire then back to normal after 2 second

    chrome.action.setIcon(
      {
        path: '../../icon-fire-96x96.gif',
      },
      () => {
        setTimeout(() => {
          chrome.action.setIcon({
            path: '../../logo96.png',
          });
        }, 5000);
      },
    );
  } 
  // Listener for any other messages from content scripts
  console.log('Message received in background:', request);
  sendResponse({ status: 'OK' });
});

export {}; // This makes the file a module.
