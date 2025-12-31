import type { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function getPublishableKey({
    container
}: ExecArgs): Promise<void> {
    const apiKeyModule = container.resolve(Modules.API_KEY);
    const keys = await apiKeyModule.listApiKeys({ type: "publishable" });

    if (keys && keys.length > 0) {
        // The token is available in the key object
        const key = keys[0];
        // In Medusa v2, the token might be in the key object directly
        console.log(key.token || key.id || "");
    } else {
        console.log("");
    }
}
