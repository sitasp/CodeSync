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
  /* Will be used if we want to get messages from content scripts to background script */
  sendResponse({ status: 'OK' });
});
// LeetCode cookie management
chrome.cookies.get({ name: 'LEETCODE_SESSION', url: 'https://leetcode.com/' }, function (cookie) {
  if (!cookie) return;
  chrome.storage.sync.set({ leetcode_session: cookie.value }, () => {
    console.log(`Leetcode Synced Successfully`);
  });
});

// HackerRank cookie management
chrome.cookies.get({ name: '_hrank_session', url: 'https://www.hackerrank.com/' }, function (cookie) {
  if (!cookie) return;
  chrome.storage.sync.set({ hackerrank_session: cookie.value }, () => {
    console.log(`HackerRank Session Synced Successfully`);
  });
});

chrome.cookies.get({ name: 'remember_hacker_token', url: 'https://www.hackerrank.com/' }, function (cookie) {
  if (!cookie) return;
  chrome.storage.sync.set({ hackerrank_token: cookie.value }, () => {
    console.log(`HackerRank Token Synced Successfully`);
  });
});

chrome.cookies.onChanged.addListener(function (info) {
  const { cookie } = info;
  
  // LeetCode session cookie
  if (cookie.name === 'LEETCODE_SESSION') {
    chrome.storage.sync.set({ leetcode_session: cookie?.value || null }, () => {
      console.log(`Leetcode Re-Synced Successfully`);
    });
  }
  
  // HackerRank session cookies
  if (cookie.name === '_hrank_session') {
    chrome.storage.sync.set({ hackerrank_session: cookie?.value || null }, () => {
      console.log(`HackerRank Session Re-Synced Successfully`);
    });
  }
  
  if (cookie.name === 'remember_hacker_token') {
    chrome.storage.sync.set({ hackerrank_token: cookie?.value || null }, () => {
      console.log(`HackerRank Token Re-Synced Successfully`);
    });
  }
});
chrome.storage.sync.onChanged.addListener((changes) => {
  console.log(`🚀 ~ file: background.ts:68 ~ changes:`, JSON.stringify(changes, null, 2));
});

export const sendMessageToContentScript = (type: string, data: any) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs.length || !tabs[0].id) return;
    chrome.tabs.sendMessage(tabs[0].id, { type, data }, function (response) {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        // Handle the error here
        return;
      }
      console.log(`✅ Acknowledged`, response);
    });
  });
};

// Listen for LeetCode submit request
chrome.webRequest.onCompleted.addListener(
  (details: chrome.webRequest.WebResponseCacheDetails) => {
    // Check if it's a POST request to submit the code
    if (
      details.method === 'POST' &&
      details.url.startsWith('https://leetcode.com/problems/') &&
      details.url.includes('/submit/')
    ) {
      const questionSlug = details.url.match(/\/problems\/(.*)\/submit/)?.[1] ?? null;
      if (!questionSlug) return;
      // Wait 5 secs to complete the checks
      // Send a message to the content script to get the submission
      setTimeout(() => {
        sendMessageToContentScript('get-submission', { questionSlug });
      }, 5000);
    }
  },
  {
    urls: ['https://leetcode.com/problems/*/submit/'],
    types: ['xmlhttprequest'],
  },
);

// Listen for HackerRank submit request
chrome.webRequest.onCompleted.addListener(
  (details: chrome.webRequest.WebResponseCacheDetails) => {
    // Check if it's a POST request to submit the code
    if (
      details.method === 'POST' &&
      details.url.includes('/rest/contests/master/challenges/') &&
      details.url.includes('/submissions')
    ) {
      const challengeSlug = details.url.match(/\/challenges\/(.*?)\/submissions/)?.[1] ?? null;
      if (!challengeSlug) return;
      
      console.log('🎯 HackerRank submission detected:', challengeSlug);
      console.log('🔍 Request details - Tab ID:', details.tabId, 'URL:', details.url);
      
      // Wait 7 secs to complete the checks (HackerRank might need more time)
      setTimeout(() => {
        console.log('📤 Sending HackerRank message to tab:', details.tabId);
        
        // Send message to the specific tab that made the request
        if (details.tabId && details.tabId !== -1) {
          // Set up a timeout for the message
          const timeoutId = setTimeout(() => {
            console.warn('⚠️ HackerRank message timeout - content script may be slow');
          }, 30000); // 30 second timeout warning

          chrome.tabs.sendMessage(details.tabId, {
            type: 'get-hackerrank-submission',
            data: { challengeSlug }
          }, (response) => {
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              console.error('❌ HackerRank message failed:', chrome.runtime.lastError.message);
              
              // Retry once if the message failed
              const errorMessage = chrome.runtime.lastError.message || '';
              if (errorMessage.includes('port closed') || 
                  errorMessage.includes('Receiving end does not exist')) {
                console.log('🔄 Retrying HackerRank message after 2 seconds...');
                setTimeout(() => {
                  chrome.tabs.sendMessage(details.tabId, {
                    type: 'get-hackerrank-submission',
                    data: { challengeSlug }
                  }, (retryResponse) => {
                    if (chrome.runtime.lastError) {
                      console.error('❌ HackerRank retry message also failed:', chrome.runtime.lastError.message);
                    } else {
                      console.log('✅ HackerRank retry message succeeded:', retryResponse);
                    }
                  });
                }, 2000);
              }
            } else {
              if (response?.success) {
                console.log('✅ HackerRank message processed successfully:', response);
              } else {
                console.log('⚠️ HackerRank message processed but with issues:', response);
              }
            }
          });
        } else {
          console.error('❌ Invalid tab ID for HackerRank message:', details.tabId);
        }
      }, 7000);
    }
  },
  {
    urls: ['https://www.hackerrank.com/rest/contests/master/challenges/*/submissions'],
    types: ['xmlhttprequest'],
  },
);
export {};
