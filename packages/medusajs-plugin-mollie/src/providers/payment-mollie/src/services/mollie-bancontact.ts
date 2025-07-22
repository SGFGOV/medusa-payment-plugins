import MollieBase from "../core/mollie-base";
import { type MollieOptions, PaymentProviderKeys } from "../types";

class MollieBancontactProviderService extends MollieBase {
    static identifier = PaymentProviderKeys.BANCONTACT;

    constructor(_, options: MollieOptions) {
        super(_, options);
    }
}

export default MollieBancontactProviderService;
