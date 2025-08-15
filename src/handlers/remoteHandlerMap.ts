import { remoteClassConstructors } from '../internal/remoteDecorators';

export const handlers: { [key: string]: (contexts: any) => void } = {};

// Populate the handlers map from registered remote classes
for (const RemoteClassConstructor of remoteClassConstructors) {
  const instance = new RemoteClassConstructor();
  const className = RemoteClassConstructor.name;

  for (const propertyName of Object.getOwnPropertyNames(RemoteClassConstructor.prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(RemoteClassConstructor.prototype, propertyName);

    if (descriptor && typeof descriptor.value === 'function' && descriptor.value.__isRemoteMethod) {
      const handlerId = `${className}:${propertyName}`;
      handlers[handlerId] = descriptor.value.bind(instance);
      console.log(`✅ Registered remote handler: ${handlerId}`);
    }
  }
}