// API Interceptor - Captures LeetCode GraphQL responses
// This script runs in the page context to intercept fetch/XMLHttpRequest calls

export function injectAPIInterceptor() {
  console.log('🚀 Starting API interceptor injection...');
  
  try {
    // Create script element that loads the standalone interceptor
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('static/scripts/provider/leetcode/api-interceptor-standalone.js');
    script.type = 'text/javascript';
    
    // Inject the script into the page context
    const target = document.head || document.documentElement || document.body;
    if (!target) {
      console.error('❌ No DOM element available for script injection');
      return;
    }
    
    script.onload = () => {
      console.log('✅ API interceptor script loaded successfully');
      script.remove(); // Clean up after loading
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load API interceptor script:', error);
    };
    
    target.appendChild(script);
    console.log('✅ API interceptor script injection initiated');
    
  } catch (error) {
    console.error('❌ Failed to inject API interceptor:', error);
  }
}