import { decoratorRegistry, urlMatches } from './apiDecorator';
import RequestContext from './requestContext';
import ResponseContext from './responseContext';

export type InterceptSource = 'fetch' | 'xhr';


/**
 * Lightweight, decorator-driven HTTP interceptor for page context.
 * Only triggers when a URL matches at least one registered @ApiInterceptor entry.
 */
export class HttpInterceptor {
  private originalFetch: typeof window.fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private active = false;

  start() {
    if (this.active) return;
    this.patchFetch();
    this.patchXHR();
    this.active = true;
    console.log('[CodeSync] HTTP Interceptor started');
  }

  stop() {
    if (!this.active) return;
    if (this.originalFetch) (window as any).fetch = this.originalFetch;
    if (this.originalXHROpen) (XMLHttpRequest.prototype as any).open = this.originalXHROpen;
    if (this.originalXHRSend) (XMLHttpRequest.prototype as any).send = this.originalXHRSend;
    this.active = false;
    console.log('[CodeSync] HTTP Interceptor stopped');
  }

  private hasAnyMatch(url: string): boolean {
    // console.log(`📝 [HttpInterceptor] Registry size: ${decoratorRegistry.length}`);
    // console.log(`📝 [HttpInterceptor] Available patterns:`, decoratorRegistry.map(e => ({
    //   pattern: e.pattern,
    //   isRegex: e.isRegex,
    //   methodName: e.methodName,
    //   hasInstance: !!e.instance
    // })));
    
    for (const e of decoratorRegistry) {
      const matches = urlMatches(e.pattern, e.isRegex, url);
      if (matches) return true;
    }
    return false;
  }

  private processResponse(requestContext: RequestContext, responseContext: ResponseContext) {
    // Call ONLY matching decorator handlers
    for (const e of decoratorRegistry) {
      if (!e.instance) {
        continue;
      }
      
      const matches = urlMatches(e.pattern, e.isRegex, requestContext.path || '');
      
      if (!matches) continue;
      
      try {
        console.log(`🎯 [HttpInterceptor] Pattern "${e.pattern}" matches "${requestContext.path}": ${matches}`);
        console.log(`📞 [HttpInterceptor] Calling handler: ${e.methodName}`);
        const fn = (e.instance as any)[e.methodName];
        if (typeof fn === 'function') {
          Promise.resolve(fn.call(e.instance, { requestContext, responseContext })).catch(err => {
            console.error(`❌ [CodeSync] Handler error in ${e.methodName}:`, err);
          });
        } else {
          console.error(`❌ [HttpInterceptor] Method ${e.methodName} is not a function`);
        }
      } catch (err) {
        console.error('❌ [CodeSync] Error dispatching handler', err);
      }
    }
  }

  private patchFetch() {
    this.originalFetch = window.fetch;
    const self = this;

    (window as any).fetch = function (...args: Parameters<typeof fetch>) {
      const input = args[0];
      const init = args[1] || {};
      const url = self.normalizeUrl(input);

      // Fast-path: if no handlers match this URL, skip all work
      if (!self.hasAnyMatch(url)) {
        return (self.originalFetch as any).apply(this, args);
      }

      return (self.originalFetch as any).apply(this, args).then(async (resp: Response) => {
        try {
          const clone = resp.clone();
          let data: any;
          try {
            data = await clone.json();
          } catch (e) {
            // If JSON parsing fails, try to get it as plain text.
            try {
              data = await clone.text();
            } catch (e) {
              // If both fail, we can't do much more.
              console.error("Could not read response body as JSON or text.", e);
              return resp;
            }
          }

          // Create RequestContext instance
          const requestHeaders: Record<string, string> = {};
          if (init.headers) {
            // Normalize headers (which can be a Headers object, an array, or a plain object)
            // into a simple Record<string, string> to ensure it's cloneable.
            const tempHeaders = new Headers(init.headers);
            tempHeaders.forEach((value, key) => {
              requestHeaders[key] = value;
            });
          }

          const requestContext = new RequestContext({
            method: init.method || 'GET',
            headers: requestHeaders,
            body: init.body,
            path: url
          });

          // Create ResponseContext instance  
          const responseHeaders: Record<string, string> = {};
          resp.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          const responseContext = new ResponseContext({
            statusCode: resp.status,
            headers: responseHeaders,
            body: data
          });

          self.processResponse(requestContext, responseContext);
        } catch (e) {
          // swallow parse errors silently to not break the page
        }
        return resp;
      });
    };
  }

  private patchXHR() {
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;

    const self = this;

    (XMLHttpRequest.prototype as any).open = function (method: string, url: string) {
      (this as any).__ls_url = url;
      (this as any).__ls_method = method;
      return (self.originalXHROpen as any).apply(this, arguments);
    };

    (XMLHttpRequest.prototype as any).send = function (body?: any) {
      const xhr = this as XMLHttpRequest & { __ls_url?: string; __ls_method?: string };

      xhr.addEventListener('load', async function () {
        const url = (xhr as any).__ls_url || '';
        if (!self.hasAnyMatch(url)) return; // skip if nothing matches
        if (xhr.status < 200 || xhr.status >= 300) return;

        try {
          let data: any;
          const response = (xhr as any).response;

          if (response instanceof Blob) {
            const text = await response.text();
            try {
              data = JSON.parse(text);
            } catch (e) {
              data = text;
            }
          } else {
            // Fallback for non-blob responses
            try {
              data = JSON.parse((xhr as any).responseText);
            } catch (e) {
              data = response || (xhr as any).responseText;
            }
          }

          // Create RequestContext instance
          const requestContext = new RequestContext({
            method: (xhr as any).__ls_method || 'GET',
            headers: {},
            body: body,
            path: url
          });

          // Create ResponseContext instance
          const responseHeaders: Record<string, string> = {};
          const responseHeadersStr = xhr.getAllResponseHeaders();
          if (responseHeadersStr) {
            responseHeadersStr.split('\r\n').forEach(line => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                responseHeaders[parts[0]] = parts[1];
              }
            });
          }

          const responseContext = new ResponseContext({
            statusCode: xhr.status,
            headers: responseHeaders,
            body: data
          });

          self.processResponse(requestContext, responseContext);
        } catch (e) {
          // ignore
        }
      });

      return (self.originalXHRSend as any).apply(this, arguments);
    };
  }

  private normalizeUrl(input: RequestInfo | URL): string {
    if (typeof input === "string") {
      return input;
    }
    if (input instanceof Request) {
      return input.url;
    }
    if (input instanceof URL) {
      return input.toString();
    }
    return "";
  }
}