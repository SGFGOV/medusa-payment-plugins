import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { MollieProviderService } from "./services";
import MollieBancontactProviderService from "./services/mollie-bancontact";
import MollieCreditcardProviderService from "./services/mollie-creditcard";
import MollieIdealProviderService from "./services/mollie-ideal";

const services = [
    MollieProviderService,
    MollieBancontactProviderService,
    MollieCreditcardProviderService,
    MollieIdealProviderService
];

export default ModuleProvider(Modules.PAYMENT, {
    services
});
