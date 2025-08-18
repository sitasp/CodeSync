import { ClientClass, ClientMethod } from "../internal/clientDecorators";

@ClientClass
export class MainWorldApi {
    @ClientMethod
    showNotification(message: string) {
        alert(message);
    }
}
