import MollieBase from "../core/mollie-base";
import { type MollieOptions, PaymentProviderKeys } from "../types";

class MollieProviderService extends MollieBase {
    static identifier = PaymentProviderKeys.MOLLIE;

    constructor(_, options: MollieOptions) {
        super(_, options);
    }
}

export default MollieProviderService;
