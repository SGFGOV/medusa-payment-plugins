import type { PaymentIntentOptions } from "../../types";
import RazorpayBase from "../razorpay-base";
export class RazorpayTest extends RazorpayBase {
    get paymentIntentOptions(): PaymentIntentOptions {
        return {
            amount: 100,
            currency: "inr"
        };
    }
}
