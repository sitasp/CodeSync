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
    console.log('[LeetSync] HTTP Interceptor started');
  }

  stop() {
    if (!this.active) return;
    if (this.originalFetch) (window as any).fetch = this.originalFetch;
    if (this.originalXHROpen)
      (XMLHttpRequest.prototype as any).open = this.originalXHROpen;
    if (this.originalXHRSend)
      (XMLHttpRequest.prototype as any).send = this.originalXHRSend;
    this.active = false;
    console.log('[LeetSync] HTTP Interceptor stopped');
  }

  private hasAnyMatch(url: string): boolean {
    for (const e of decoratorRegistry) {
      if (urlMatches(e.pattern, e.isRegex, url)) return true;
    }
    return false;
  }

  private processResponse(
    requestContext: RequestContext,
    responseContext: ResponseContext,
  ) {
    // Call ONLY matching decorator handlers
    for (const e of decoratorRegistry) {
      if (!e.instance) {
        continue;
      }

      const matches = urlMatches(e.pattern, e.isRegex, requestContext.path || '');
      if (!matches) continue;

      try {
        const fn = (e.instance as any)[e.methodName];
        if (typeof fn === 'function') {
          Promise.resolve(
            fn.call(e.instance, { requestContext, responseContext }),
          ).catch((err) => {
            console.error(`❌ [LeetSync] Handler error in ${e.methodName}:`, err);
          });
        } else {
          console.error(
            `❌ [HttpInterceptor] Method ${e.methodName} is not a function`,
          );
        }
      } catch (err) {
        console.error('❌ [LeetSync] Error dispatching handler', err);
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

      if (!self.hasAnyMatch(url)) {
        return (self.originalFetch as any).apply(this, args);
      }

      return (self.originalFetch as any)
        .apply(this, args)
        .then(async (resp: Response) => {
          try {
            const clone = resp.clone();
            let data: any;
            const ct = clone.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              data = await clone.json();
            } else if (ct.startsWith('text/')) {
              data = await clone.text();
            } else {
              return resp;
            }

            const requestContext = new RequestContext({
              method: init.method || 'GET',
              headers: (init.headers as any) || {},
              body: init.body,
              path: url,
            });

            const responseHeaders: Record<string, string> = {};
            resp.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });

            const responseContext = new ResponseContext({
              statusCode: resp.status,
              headers: responseHeaders,
              body: data,
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

    (XMLHttpRequest.prototype as any).open = function (
      method: string,
      url: string,
    ) {
      (this as any).__ls_url = url;
      (this as any).__ls_method = method;
      return (self.originalXHROpen as any).apply(this, arguments);
    };

    (XMLHttpRequest.prototype as any).send = function (body?: any) {
      const xhr =
        this as XMLHttpRequest & { __ls_url?: string; __ls_method?: string };

      xhr.addEventListener('load', function () {
        const url = (xhr as any).__ls_url || '';
        if (!self.hasAnyMatch(url)) return;
        if (xhr.status < 200 || xhr.status >= 300) return;

        try {
          let data: any = null;
          if ((xhr as any).responseType === 'json') {
            data = (xhr as any).response;
          } else if (
            (xhr as any).responseType === '' ||
            (xhr as any).responseType === 'text'
          ) {
            const txt = (xhr as any).responseText;
            try {
              data = JSON.parse(txt);
            } catch {
              data = txt; // non-JSON text
            }
          }

          const requestContext = new RequestContext({
            method: (xhr as any).__ls_method || 'GET',
            headers: {},
            body: body,
            path: url,
          });

          const responseHeaders: Record<string, string> = {};
          const responseHeadersStr = xhr.getAllResponseHeaders();
          if (responseHeadersStr) {
            responseHeadersStr.split('\r\n').forEach((line) => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                responseHeaders[parts[0]] = parts[1];
              }
            });
          }

          const responseContext = new ResponseContext({
            statusCode: xhr.status,
            headers: responseHeaders,
            body: data,
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
    if (typeof input === 'string') {
      return input;
    }
    if (input instanceof Request) {
      return input.url;
    }
    if (input instanceof URL) {
      return input.toString();
    }
    return '';
  }
}
