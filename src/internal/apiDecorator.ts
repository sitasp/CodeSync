/**
 * Minimal decorator registry + factory.
 * Works with TypeScript experimental decorators (enable in tsconfig).
 */

import RequestContext from './requestContext';
import ResponseContext from './responseContext';

export type InterceptorHandler = (contexts: {
  requestContext: RequestContext;
  responseContext: ResponseContext;
}) => void | Promise<void>;

export interface RegistryEntry {
  pattern: string;                // simple substring or regex source
  isRegex: boolean;               // whether pattern is regex
  instance: any;                  // class instance that owns the handler
  methodName: string;             // handler method name on instance
}

/** Global in-page registry for @ApiInterceptor handlers */
export const decoratorRegistry: RegistryEntry[] = [];

/**
 * Helper: match URL with either substring or regex.
 */
export function urlMatches(pattern: string, isRegex: boolean, url: string): boolean {
  if (!url) return false;
  if (isRegex) {
    try {
      const re = new RegExp(pattern);
      return re.test(url);
    } catch {
      return false;
    }
  }
  return url.includes(pattern);
}

/**
 * Decorator factory. Example:
 *   @ApiInterceptor('/submissions/detail')
 *   onSubmission(resp) { ... }
 *
 * To execute in the service worker:
 *   @ApiInterceptor('/submissions/detail', { remote: true })
 *
 * Regex mode:
 *   @ApiInterceptor(/graphql\\?operationName=xxxx/)
 */
export function ApiInterceptor(pattern: string | RegExp, options: { remote?: boolean } = {}) {
  const isRegex = pattern instanceof RegExp;
  const pat = isRegex ? (pattern as RegExp).source : String(pattern);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // We only push metadata here. The concrete instance is bound later
    // when the owning class is instantiated.
    const ctor = target.constructor as { __pendingDecorators?: RegistryEntry[] };
    if (!ctor.__pendingDecorators) ctor.__pendingDecorators = [];
    ctor.__pendingDecorators.push({
      pattern: pat,
      isRegex,
      // instance will be set at bind time
      instance: null,
      methodName: propertyKey,
    } as RegistryEntry);

    // If the 'remote' option is true, we replace the decorated method
    // with a proxy that posts a message to the window.
    if (options.remote) {
      descriptor.value = function (contexts: {
        requestContext: RequestContext;
        responseContext: ResponseContext;
      }) {
        // Use a static className property if available, falling back to constructor.name.
        // This provides a stable identifier that survives minification.
        const className = (this.constructor as any).className || this.constructor.name;

        console.log(
          `[ApiDecorator] Posting message for remote handler ${className}.${propertyKey}.`,
        );

        const serializableContexts = {
          requestContext: {
            headers: contexts.requestContext.headers,
            payload: contexts.requestContext.payload,
            queryParams: contexts.requestContext.queryParams,
            path: contexts.requestContext.path,
            method: contexts.requestContext.method,
            urlParams: contexts.requestContext.urlParams,
          },
          responseContext: {
            headers: contexts.responseContext.headers,
            payload: contexts.responseContext.payload,
            statusCode: contexts.responseContext.statusCode,
          },
        };

        window.postMessage(
          {
            type: 'FROM_PAGE_SCRIPT',
            handlerId: `${className}:${propertyKey}`,
            contexts: serializableContexts,
          },
          window.location.origin,
        );
      };
    }
  };
}


/**
 * Bind pending decorator entries on a class constructor to a concrete instance.
 * Call this once right after `new YourHandlers()`.
 */
export function bindDecorators(instance: any) {
  console.log('🔗 [ApiDecorator] Binding decorators for instance:', instance.constructor.name);

  const ctor = instance?.constructor as { __pendingDecorators?: RegistryEntry[] };
  const pending = ctor?.__pendingDecorators;

  if (!pending || !pending.length) {
    return; // No decorators to bind
  }

  console.log(`📋 [ApiDecorator] Found ${pending.length} pending decorators:`, pending.map(p => ({ pattern: p.pattern, method: p.methodName })));

  for (const entry of pending) {
    const boundEntry = { ...entry, instance };
    decoratorRegistry.push(boundEntry);
    console.log(`✅ [ApiDecorator] Registered: ${entry.pattern} -> ${entry.methodName}`);
  }

  // Important: Clear pending decorators from the class constructor.
  // This prevents accidental re-registration if bindDecorators is called
  // with multiple different instances of the same handler class.
  ctor.__pendingDecorators = [];

  console.log(`📊 [ApiDecorator] Total registered handlers: ${decoratorRegistry.length}`);
}