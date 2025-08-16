/**
 * Method decorator to mark a method as a remote handler.
 * This decorator simply adds a metadata flag to the method.
 */
export function RemoteMethod(alias?: string) { // Added alias parameter
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Add a metadata flag to the method's value
    if (descriptor.value) {
      descriptor.value.__isRemoteMethod = true;
      if (alias) {
        descriptor.value.__remoteMethodAlias = alias; // Store the alias
      }
    }
  };
}

// A global registry to keep track of all classes decorated with @RemoteClass
export const remoteClassConstructors: { new (...args: any[]): {} }[] = [];

/**
 * Class decorator to mark a class as containing remote methods.
 * It registers the class constructor in a global registry.
 */
export function RemoteClass(classAlias?: string) { // Added classAlias parameter
  return function <T extends { new (...args: any[]): {} }>(constructor: T) { // This is the actual decorator, called with the constructor
    remoteClassConstructors.push(constructor);
    if (classAlias) {
      (constructor as any).__remoteClassAlias = classAlias; // Store the class alias
    }
    return constructor; // Return the original constructor
  };
}