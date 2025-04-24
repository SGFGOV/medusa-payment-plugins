import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { UpdateRazorpayCustomerMetadataInput } from "..";
import { Modules } from "@medusajs/framework/utils";
import { ICustomerModuleService } from "@medusajs/framework/types";

export const updateCustomerMetadataStep = createStep(
    "create-customer-step",
    async (input: UpdateRazorpayCustomerMetadataInput, { container }) => {
        const customerService: ICustomerModuleService = container.resolve(
            Modules.CUSTOMER
        );

        // 1. create customer
        const customer = await customerService.retrieveCustomer(
            input.medusa_customer_id
        );

        // 2. create auth identity
        const { medusa_customer_id, ...rest } = input;
        const { razorpay } = rest as Record<string, string>;
        const registerResponse = await customerService.updateCustomers(
            medusa_customer_id,
            {
                metadata: {
                    ...customer.metadata,
                    razorpay: {
                        ...(razorpay as unknown as Record<string, string>)
                    }
                }
            }
        );

        // 4. do we want to authenticate immediately?
        //
        // const authenticationResponse = await authService.authenticate("emailpass", {
        //   body: {
        //     email: input.email,
        //     password: input.password,
        //   },
        // } as AuthenticationInput);

        return new StepResponse(
            { customer: customer, registerResponse },
            customer.id
        );
    }
);
