import MollieBase from "../core/mollie-base";
import { type MollieOptions, PaymentProviderKeys } from "../types";

class MollieIdealProviderService extends MollieBase {
    static identifier = PaymentProviderKeys.IDEAL;

    constructor(_, options: MollieOptions) {
        super(_, options);
    }
}

export default MollieIdealProviderService;
