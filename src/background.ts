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

// SubmissionCache class for managing cached submission data
class SubmissionCache {
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    expires: number;
  }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttlMs
    });
    console.log(`📦 Cached submission data for: ${key}`);
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (item && item.expires > Date.now()) {
      console.log(`✅ Retrieved cached data for: ${key}`);
      return item.data;
    }
    
    if (item) {
      this.cache.delete(key); // Auto-cleanup expired
      console.log(`🗑️ Removed expired cache for: ${key}`);
    }
    return null;
  }

  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    this.cache.forEach((value, key) => {
      if (value.expires <= now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Initialize the submission cache
const submissionCache = new SubmissionCache();

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
  } else if (request.type === 'CACHE_SUBMISSION_DATA') {
    // Cache submission data received from content script
    const { questionSlug, submissionData, timestamp } = request;
    if (questionSlug && submissionData) {
      submissionCache.set(questionSlug, {
        submissionData,
        timestamp,
        questionSlug
      });
    }
  }
  /* Will be used if we want to get messages from content scripts to background script */
  sendResponse({ status: 'OK' });
});
// Remove cookie management - no longer needed with API interception approach
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

export {};