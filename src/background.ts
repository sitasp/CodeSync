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

// Listen for HackerRank submission POST requests and inject response interceptor
chrome.webRequest.onCompleted.addListener(
  (details: chrome.webRequest.WebResponseCacheDetails) => {
    if (details.method === 'POST' && details.statusCode === 200) {
      const challengeSlug = details.url.match(/\/challenges\/(.*?)\/submissions/)?.[1];
      if (!challengeSlug) return;
      
      console.log('🎯 HackerRank submission POST detected:', challengeSlug);
      console.log('🔍 Request details - Tab ID:', details.tabId, 'URL:', details.url);
      
      // Inject a script to intercept future API responses for this submission
      if (details.tabId && details.tabId !== -1) {
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          func: (challengeSlug: string) => {
            console.log('🔧 Setting up HackerRank API interception for:', challengeSlug);
            
            // Store original fetch and XMLHttpRequest to intercept responses
            if (!(window as any).hackerRankInterceptorInstalled) {
              // Intercept fetch API
              const originalFetch = window.fetch;
              
              window.fetch = function(...args) {
                const [resource, config] = args;
                const url = typeof resource === 'string' ? resource : 
                           resource instanceof Request ? resource.url : resource.toString();
                
                console.log('🔍 Fetch call intercepted:', url);
                
                return originalFetch.apply(this, args).then(response => {
                  // Check if this is a HackerRank API call
                  if (url.includes('/rest/contests/master/challenges/')) {
                    console.log('🎯 HackerRank API call detected:', url, 'Status:', response.status);
                    
                    // Clone the response so we can read it without consuming the original
                    const clonedResponse = response.clone();
                    
                    clonedResponse.json().then(data => {
                      console.log('📊 Full HackerRank API response:', data);
                      
                      // Check for submission status in different possible formats
                      const submissionData = data.model || data;
                      if (submissionData) {
                        console.log('🔍 Submission data found:', {
                          id: submissionData.id,
                          status: submissionData.status,
                          status_code: submissionData.status_code,
                          challenge_slug: submissionData.challenge_slug,
                          name: submissionData.name
                        });
                        
                        // Check if this is a completed submission
                        if (submissionData.status === 'Accepted' && submissionData.status_code === 1) {
                          console.log('🎉 HackerRank submission accepted! Dispatching event...');
                          
                          const event = new CustomEvent('hackerrank-submission-accepted', {
                            detail: {
                              challengeSlug: submissionData.challenge_slug || challengeSlug,
                              submissionData: submissionData
                            }
                          });
                          window.dispatchEvent(event);
                        } else {
                          console.log('⏳ HackerRank submission still processing:', {
                            status: submissionData.status,
                            status_code: submissionData.status_code
                          });
                        }
                      }
                    }).catch(err => {
                      console.error('❌ Failed to parse response:', err);
                      console.log('📄 Raw response text (first 500 chars):', response.clone().text().then(text => 
                        console.log(text.substring(0, 500))
                      ));
                    });
                  }
                  
                  return response;
                }).catch(error => {
                  console.error('❌ Fetch error:', error);
                  throw error;
                });
              };
              
              // Also try to intercept XMLHttpRequest (in case HackerRank uses XHR)
              try {
                const originalXHROpen = XMLHttpRequest.prototype.open;
                const originalXHRSend = XMLHttpRequest.prototype.send;
                
                XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
                  (this as any)._url = url;
                  return originalXHROpen.call(this, method, url, async ?? true, username, password);
                };
                
                XMLHttpRequest.prototype.send = function(data?: any) {
                  this.addEventListener('load', () => {
                    if ((this as any)._url && (this as any)._url.includes('/rest/contests/master/challenges/')) {
                      console.log('🎯 XHR HackerRank API call:', (this as any)._url, 'Status:', this.status);
                      
                      try {
                        const responseData = JSON.parse(this.responseText);
                        console.log('📊 XHR HackerRank response:', responseData);
                        
                        const submissionData = responseData.model || responseData;
                        if (submissionData && submissionData.status === 'Accepted' && submissionData.status_code === 1) {
                          console.log('🎉 HackerRank submission accepted via XHR!');
                          
                          const event = new CustomEvent('hackerrank-submission-accepted', {
                            detail: {
                              challengeSlug: submissionData.challenge_slug || challengeSlug,
                              submissionData: submissionData
                            }
                          });
                          window.dispatchEvent(event);
                        }
                      } catch (e) {
                        console.log('Could not parse XHR response as JSON:', e);
                      }
                    }
                  });
                  
                  return originalXHRSend.apply(this, [data]);
                };
                console.log('✅ XMLHttpRequest interceptor installed');
              } catch (e) {
                console.log('⚠️ Could not install XMLHttpRequest interceptor:', e);
              }
              
              (window as any).hackerRankInterceptorInstalled = true;
              console.log('✅ HackerRank fetch & XHR interceptors installed');
            }
          },
          args: [challengeSlug]
        }, (results) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Failed to inject HackerRank interceptor:', chrome.runtime.lastError.message);
          } else {
            console.log('✅ HackerRank interceptor script injected');
          }
        });
      }
    }
  },
  {
    urls: ['https://www.hackerrank.com/rest/contests/master/challenges/*/submissions'],
    types: ['xmlhttprequest'],
  },
);
export {};
