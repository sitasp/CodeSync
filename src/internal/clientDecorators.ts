import { Method } from "axios";

// A type that represents a class constructor
type Constructor<T = any> = new (...args: any[]) => T;

// A map to store the registered client classes
const clientClasses = new Map<string, Constructor>();

/**
 * A decorator to mark a class as a client-side class.
 * @param target The class to mark as a client-side class.
 */
export function ClientClass(target: Constructor) {
    clientClasses.set(target.name, target);
}

/**
 * A decorator to mark a method as a client-side method.
 * @param target The class that contains the method.
 * @param propertyKey The name of the method.
 */
export function ClientMethod(target: any, propertyKey: string) {
    // We don't need to do anything here, but we could add some metadata if we wanted to.
}

/**
 * A function to get a client-side class by its name.
 * @param name The name of the client-side class.
 * @returns The client-side class, or undefined if it's not found.
 */
export function getClientClass(name: string): Constructor | undefined {
    return clientClasses.get(name);
}
