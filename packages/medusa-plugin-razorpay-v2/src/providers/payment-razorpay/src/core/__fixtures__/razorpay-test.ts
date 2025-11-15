import type { PaymentIntentOptions, RazorpayOptions } from "../../types";
import RazorpayBase from "../razorpay-base";

export class RazorpayTest extends RazorpayBase {
    constructor(_, options: RazorpayOptions) {
        super(_, options);
    }

    get paymentIntentOptions(): PaymentIntentOptions {
        return {
            amount: 100,
            currency: "inr"
        };
    }
}
