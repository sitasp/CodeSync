export async function handleLeetCodeTabUpdate(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
) {

  const tabBaseUrl = 'leetcode.com';
  const scriptPath = 'static/scripts/leetcode.js';

  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes(tabBaseUrl)
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
          files: [scriptPath],
          world: 'MAIN',
        });
        console.log('✅ Injected ' + scriptPath + ' into the main world.');
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
}