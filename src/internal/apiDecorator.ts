import RequestContext from './requestContext';
import ResponseContext from './responseContext';

export type InterceptorHandler = (contexts: {
  requestContext: RequestContext;
  responseContext: ResponseContext;
}) => void | Promise<void>;

export interface RegistryEntry {
  pattern: string; // simple substring or regex source
  isRegex: boolean; // whether pattern is regex
  instance: any; // class instance that owns the handler
  methodName: string; // handler method name on instance
}

/** Global in-page registry for @ApiInterceptor handlers */
export const decoratorRegistry: RegistryEntry[] = [];

/**
 * Helper: match URL with either substring or regex.
 */
export function urlMatches(
  pattern: string,
  isRegex: boolean,
  url: string,
): boolean {
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
 * Decorator factory.
 */
export function ApiInterceptor(pattern: string | RegExp) {
  const isRegex = pattern instanceof RegExp;
  const pat = isRegex ? (pattern as RegExp).source : String(pattern);

  return function (target: any, propertyKey: string) {
    const ctor = target.constructor as { __pendingDecorators?: RegistryEntry[] };
    if (!ctor.__pendingDecorators) ctor.__pendingDecorators = [];
    ctor.__pendingDecorators.push({
      pattern: pat,
      isRegex,
      instance: null, // instance will be set at bind time
      methodName: propertyKey,
    } as RegistryEntry);
  };
}

/**
 * Bind pending decorator entries on a class constructor to a concrete instance.
 */
export function bindDecorators(instance: any) {
  console.log(
    '🔗 [ApiDecorator] Binding decorators for instance:',
    instance.constructor.name,
  );

  const ctor = instance?.constructor as { __pendingDecorators?: RegistryEntry[] };
  const pending = ctor.__pendingDecorators || [];

  console.log(
    `📋 [ApiDecorator] Found ${pending.length} pending decorators:`,
    pending.map((p) => ({ pattern: p.pattern, method: p.methodName })),
  );

  for (const entry of pending) {
    const boundEntry = { ...entry, instance };
    decoratorRegistry.push(boundEntry);
    console.log(`✅ [ApiDecorator] Registered: ${entry.pattern} -> ${entry.methodName}`);
  }

  console.log(
    `📊 [ApiDecorator] Total registered handlers: ${decoratorRegistry.length}`,
  );
}
