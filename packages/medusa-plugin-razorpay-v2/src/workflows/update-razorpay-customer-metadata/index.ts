import {
    createWorkflow,
    WorkflowResponse
} from "@medusajs/framework/workflows-sdk";

import { updateCustomerMetadataStep } from "./steps/update-customer";

export type UpdateRazorpayCustomerMetadataInput = {
    medusa_customer_id: string;
} & Record<string, unknown>;

export const updateRazorpayCustomerMetadataWorkflow = createWorkflow(
    "update-razorpay-customer-metadata",
    (input: UpdateRazorpayCustomerMetadataInput) => {
        const { customer, registerResponse } =
            updateCustomerMetadataStep(input);

        return new WorkflowResponse({
            customer,
            registerResponse
        });
    }
);
