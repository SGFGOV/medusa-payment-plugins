import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { MollieProviderService } from "./src/services";
import MollieBancontactProviderService from "./src/services/mollie-bancontact";
import MollieCreditcardProviderService from "./src/services/mollie-creditcard";
import MollieIdealProviderService from "./src/services/mollie-ideal";

const services = [
    MollieProviderService,
    MollieBancontactProviderService,
    MollieCreditcardProviderService,
    MollieIdealProviderService
];

export default ModuleProvider(Modules.PAYMENT, {
    services
});
