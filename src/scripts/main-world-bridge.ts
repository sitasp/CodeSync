import { getClientClass } from "../internal/clientDecorators";
import { BridgeMessage, BridgeMessageType } from "../types/bridge";
import "./MainWorldApi";

console.log('[CodeSync] Main world bridge script loaded.');

window.addEventListener('message', async (event) => {
    if (event.source !== window || event.data.type !== BridgeMessageType.FROM_SERVICE_WORKER) {
        return;
    }

    const message: BridgeMessage = event.data;
    console.log('[CodeSync Main World Bridge] Received message from service worker:', message);

    const ClientClass = getClientClass(message.className);
    if (ClientClass) {
        const instance = new ClientClass();
        const method = instance[message.methodName];
        if (typeof method === 'function') {
            method.apply(instance, message.args);
        } else {
            console.warn(`[CodeSync Main World Bridge] No method found for ${message.methodName} in ${message.className}`);
        }
    } else {
        console.warn(`[CodeSync Main World Bridge] No client class found for ${message.className}`);
    }
});
