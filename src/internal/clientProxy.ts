import { BridgeMessage, BridgeMessageType } from "../types/bridge";

export function createClientProxy<T extends object>(className: string): T {
    const proxy = new Proxy({} as T, {
        get: (target, prop, receiver) => {
            if (typeof prop === 'string') {
                return (...args: any[]) => {
                    const message: BridgeMessage = {
                        type: BridgeMessageType.FROM_SERVICE_WORKER,
                        className,
                        methodName: prop,
                        args,
                    };
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0] && tabs[0].id) {
                            chrome.tabs.sendMessage(tabs[0].id, message);
                        }
                    });
                };
            }
            return Reflect.get(target, prop, receiver);
        },
    });
    return proxy;
}
