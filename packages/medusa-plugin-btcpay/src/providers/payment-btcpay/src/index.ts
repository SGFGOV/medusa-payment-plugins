import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { BtcpayProviderService } from "./services";

const services = [BtcpayProviderService];

export default ModuleProvider(Modules.PAYMENT, {
    services
});
