import RazorpayBase from "../core/razorpay-base";
import { type PaymentIntentOptions, PaymentProviderKeys } from "../types";

class RazorpayProviderService extends RazorpayBase {
    static identifier = PaymentProviderKeys.RAZORPAY;

    get paymentIntentOptions(): PaymentIntentOptions {
        return {} as PaymentIntentOptions;
    }
}

export default RazorpayProviderService;
