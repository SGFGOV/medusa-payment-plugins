import type { MedusaContainer } from "@medusajs/framework/types";
import type { PaymentIntentOptions, RazorpayOptions } from "../../types";
import RazorpayBase from "../razorpay-base";
export class RazorpayTest extends RazorpayBase {

    constructor(container: MedusaContainer, options: RazorpayOptions) {
        super(container, options);
    }
    get paymentIntentOptions(): PaymentIntentOptions {
        return {
            amount: 100,
            currency: "inr"
        };
    }
}
