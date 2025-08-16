import { remoteClassConstructors } from '../internal/remoteDecorators';
import './leetcode/LeetCodeRemoteHandlers'; // Import to ensure decorator runs

export const handlers: { [key: string]: (contexts: any) => void } = {};

// Populate the handlers map from registered remote classes
for (const RemoteClassConstructor of remoteClassConstructors) {
  const instance = new RemoteClassConstructor();
  const classPrefix = (RemoteClassConstructor as any).__remoteClassAlias || RemoteClassConstructor.name;

  for (const propertyName of Object.getOwnPropertyNames(RemoteClassConstructor.prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(RemoteClassConstructor.prototype, propertyName);

    if (descriptor && typeof descriptor.value === 'function' && descriptor.value.__isRemoteMethod) {
      const methodSuffix = (descriptor.value as any).__remoteMethodAlias || propertyName;
      const handlerId = `${classPrefix}:${methodSuffix}`;
      handlers[handlerId] = descriptor.value.bind(instance);
      console.log(`✅ Registered remote handler: ${handlerId}`);
    }
  }
}