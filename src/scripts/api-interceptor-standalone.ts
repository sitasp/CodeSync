// Standalone API Interceptor - Runs in page context to intercept GraphQL calls
// This avoids CSP issues by being a separate file instead of inline script

export {}; // Make this a module

(function() {
  console.log('🔧 LeetCode API interceptor injected successfully');

  // Store original functions
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  // Helper function to extract question slug from current URL
  function extractQuestionSlug() {
    const path = window.location.pathname;
    const match = path.match(/\/problems\/([^\/]+)/);
    return match ? match[1] : null;
  }

  // Helper function to check if response contains submission data
  function isSubmissionResponse(data: any) {
    return data && (
      data.submissionDetails || 
      (data.data && data.data.submissionDetails) ||
      (data.questionSubmissionList && data.questionSubmissionList.submissions) ||
      // Also check for submit response
      (data.data && data.data.submitCode) ||
      data.submitCode
    );
  }
  
  // Helper function to check if this looks like any submission-related GraphQL call
  function looksLikeSubmissionCall(url: string, data: any) {
    if (!data) return false;
    
    const dataStr = JSON.stringify(data).toLowerCase();
    return (
      dataStr.includes('submission') ||
      dataStr.includes('submitcode') ||
      dataStr.includes('submissiondetails') ||
      url.includes('submit')
    );
  }

  // Helper function to handle GraphQL responses (avoid code duplication)
  function handleGraphQLResponse(data: any, questionSlug: string | null, url: string, source: string) {
    if (!questionSlug) return;
    
    // Always send GraphQL responses for debugging
    window.postMessage({
      type: 'LEETCODE_GRAPHQL_RESPONSE',
      data: data,
      questionSlug: questionSlug,
      timestamp: Date.now(),
      source: source,
      url: url
    }, '*');
    
    // Check if this is submission-related
    if (isSubmissionResponse(data) || looksLikeSubmissionCall(url, data)) {
      // Send data to content script
      window.postMessage({
        type: 'LEETCODE_SUBMISSION_DATA',
        data: data,
        questionSlug: questionSlug,
        timestamp: Date.now(),
        source: source
      }, '*');
      
      console.log(`📡 Intercepted submission data via ${source} for:`, questionSlug);
    }
  }

  // Intercept fetch requests
  (window as any).fetch = function(...args: Parameters<typeof fetch>) {
    const url = args[0];
    
    return originalFetch.apply(this, args).then(response => {
      // Check if this is a GraphQL request to LeetCode
      if (typeof url === 'string' && 
          (url.includes('/graphql') || url.includes('graphql')) && 
          response.ok) {
        
        console.log('🌐 Intercepting fetch to:', url);
        
        // Clone response to avoid consuming the stream
        response.clone().json().then(data => {
          console.log('📦 Fetch response data:', data);
          
          const questionSlug = extractQuestionSlug();
          
          // Use the helper function to handle the response
          handleGraphQLResponse(data, questionSlug, url as string, 'fetch');
        }).catch(error => {
          console.log('Error parsing fetch response:', error);
        });
      }
      
      return response;
    });
  };

  // Intercept XMLHttpRequest
  (XMLHttpRequest.prototype as any).open = function(method: string, url: string) {
    (this as any)._url = url;
    (this as any)._method = method;
    return originalXHROpen.apply(this, arguments as any);
  };

  (XMLHttpRequest.prototype as any).send = function(_body?: any) {
    // Add load event listener before sending
    this.addEventListener('load', function(this: XMLHttpRequest) {
      const self = this as any;
      if (self._url && 
          (self._url.includes('/graphql') || self._url.includes('graphql')) && 
          self.status >= 200 && self.status < 300) {
        
        console.log('🌐 Intercepting XHR to:', self._url);
        
        try {
          let data;
          
          // Handle different response types
          if (self.responseType === '' || self.responseType === 'text') {
            data = JSON.parse(self.responseText);
          } else if (self.responseType === 'blob') {
            // Handle blob responses - convert to text first
            const blob = self.response;
            if (blob instanceof Blob) {
              blob.text().then(text => {
                try {
                  const blobData = JSON.parse(text);
                  console.log('📦 XHR blob response data:', blobData);
                  handleGraphQLResponse(blobData, questionSlug, self._url, 'xhr');
                } catch (error) {
                  console.log('Error parsing blob response:', error);
                }
              });
              return; // Exit early for blob handling
            }
          } else if (self.responseType === 'json') {
            data = self.response;
          } else {
            console.log('⚠️ Unsupported response type:', self.responseType);
            return;
          }
          
          console.log('📦 XHR response data:', data);
          
          const questionSlug = extractQuestionSlug();
          
          // Use the helper function to handle the response
          handleGraphQLResponse(data, questionSlug, self._url, 'xhr');
        } catch (error) {
          console.log('Error parsing XHR response:', error);
        }
      }
    });
    
    return originalXHRSend.apply(this, arguments as any);
  };
})();