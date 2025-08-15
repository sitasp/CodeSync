// LeetCode API Interceptor - Entry point script for LeetCode HTTP interception
// This script is injected into leetcode.com pages via manifest.json

import { bindDecorators } from '../internal/apiDecorator';
import { HttpInterceptor } from '../internal/httpInterceptor';
import { LeetCodeApiHandlers } from '../handlers/LeetCodeHandlers';

export {}; // Make this a module

// ---- Bootstrap (runs when script is injected on leetcode.com) ----
(function bootstrap() {
  console.log('🚀 LeetCode API Interceptor script starting...');
  console.log('🌍 Current URL:', window.location.href);
  console.log('🏠 Current hostname:', window.location.hostname);

  try {
    // Instantiate handler class and bind decorators FIRST
    console.log('🏗️ Creating LeetCode handlers and binding decorators...');
    const handlers = new LeetCodeApiHandlers();
    bindDecorators(handlers);
    console.log('🔗 Decorators bound.');

    // Now, create and start the interceptor
    console.log('📡 Creating HTTP interceptor...');
    const http = new HttpInterceptor();

    console.log('🔌 Starting HTTP interceptor...');
    http.start();

    console.log('✅ [LeetSync] lcInterceptor initialized successfully');
    console.log('🔍 Checking if fetch is patched:', typeof window.fetch);
    console.log('🔍 Checking if XMLHttpRequest is patched:', typeof XMLHttpRequest);
  } catch (e) {
    console.error('❌ [LeetSync] bootstrap error', e);
    if (e instanceof Error) {
      console.error('❌ Error stack:', e.stack);
    }
  }
})();
