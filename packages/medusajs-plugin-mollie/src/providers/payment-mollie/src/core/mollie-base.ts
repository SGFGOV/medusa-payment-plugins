// / Mollie SDK imports
import MollieClientProvider, {
    type MollieClient,
    PaymentStatus
} from "@mollie/api-client";

// / Medusa imports
import {
    AuthorizePaymentInput,
    AuthorizePaymentOutput,
    CancelPaymentInput,
    CancelPaymentOutput,
    CapturePaymentInput,
    CapturePaymentOutput,
    DeletePaymentInput,
    DeletePaymentOutput,
    InitiatePaymentInput,
    InitiatePaymentOutput
} from "@medusajs/framework/types";

import type {
    GetPaymentStatusInput,
    GetPaymentStatusOutput,
    RefundPaymentInput,
    RefundPaymentOutput,
    RetrievePaymentInput,
    RetrievePaymentOutput,
    UpdatePaymentInput,
    UpdatePaymentOutput,
    WebhookActionResult,
    ProviderWebhookPayload
} from "@medusajs/framework/types";

// / type imports
import type { MollieOptions, PaymentContextExtra } from "../types";

// / utility imports
import {
    constructMollieWebhookUrl,
    getFormattedAmount,
    getFormattedCurrencyCode,
    PaymentStatusMap
} from "../utils";
import {
    AbstractPaymentProvider,
    isDefined,
    PaymentSessionStatus,
    MedusaError,
    PaymentActions,
    BigNumber
} from "@medusajs/framework/utils";

class MollieBase extends AbstractPaymentProvider<MollieOptions> {
    protected container_: Record<string, unknown>;

    private mollieClient: MollieClient;
    private webhookUrl: string | undefined;

    static validateOptions(options: MollieOptions): void {
        if (!isDefined(options.apiKey)) {
            throw new Error(
                "Required option `apiKey` is missing in Mollie plugin options"
            );
        }

        if (!isDefined(options.providerId)) {
            throw new Error(
                "Required option `providerId` is missing in Mollie plugin options"
            );
        }
    }

    protected constructor(
        cradle: Record<string, unknown>,
        protected readonly options: MollieOptions
    ) {
        super(cradle);

        this.container_ = cradle;
        // get the final webhook url for mollie to call on payment events
        this.webhookUrl = constructMollieWebhookUrl(
            options.providerId,
            this.getIdentifier(),
            options?.webhookUrl
        );

        // / init mollieClient
        this.mollieClient = MollieClientProvider({
            apiKey: options.apiKey,
            versionStrings:
                "MedusaJS/" + (process.env.npm_package_version ?? "2.0.0") // todo ideally determine Medusa version dynamically
        });
    }

    protected getStatus(status: PaymentStatus): GetPaymentStatusOutput {
        return {
            status: PaymentStatusMap[status]
        };
    }

    async getPaymentStatus(
        input: GetPaymentStatusInput
    ): Promise<GetPaymentStatusOutput> {
        const id = input.data?.id as string;

        const payment = await this.mollieClient.payments.get(id);
        return {
            status: this.getStatus(payment.status).status
        };
    }

    async initiatePayment(
        input: InitiatePaymentInput
    ): Promise<InitiatePaymentOutput> {
        const {
            idempotency_key: session_id,
            customer,
            account_holder
        } = input.context ?? {};
        const email = customer?.email ?? account_holder?.data?.email;
        const { currency_code, amount } = input;

        /**
         * @see — https://docs.mollie.com/reference/v2/payments-api/get-payment?path=webhookUrl#response
         */
        const webhookUrl = this.webhookUrl;

        // / extra inputs set while requesting initiatePayment from the store
        const extra = input.data?.extra as PaymentContextExtra;

        const description = (extra?.paymentDescription ??
            this.options?.paymentDescription) as string;

        /**
         * @see — https://docs.mollie.com/reference/v2/payments-api/create-payment?path=method#parameters
         */
        const method = extra?.method;

        /**
         * @see — https://docs.mollie.com/reference/v2/payments-api/get-payment?path=redirectUrl#response
         */
        const redirectUrl = extra?.redirectUrl;

        try {
            const createPaymentResponse =
                (await this.mollieClient.payments.create({
                    description,
                    method,
                    webhookUrl,
                    redirectUrl,
                    billingEmail: email as string,
                    amount: {
                        currency: getFormattedCurrencyCode(currency_code),
                        value: getFormattedAmount(amount as number)
                    },
                    metadata: {
                        session_id: session_id as string
                    }
                })) as unknown as Record<string, unknown>;
            return {
                data: createPaymentResponse,
                id: createPaymentResponse.id as string
            };
        } catch (error) {
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                "An error occurred in InitiatePayment during the creation"
            );
        }
    }

    async authorizePayment(
        input: AuthorizePaymentInput
    ): Promise<AuthorizePaymentOutput> {
        const updatedPaymentSession = await this.retrievePayment(input);

        return {
            data: updatedPaymentSession.data as unknown as Record<
                string,
                unknown
            >,
            status: PaymentSessionStatus.AUTHORIZED
        };
    }

    async cancelPayment(
        input: CancelPaymentInput
    ): Promise<CancelPaymentOutput> {
        try {
            // / fetch payment object from API
            const payment = await this.retrievePayment(input);

            const status = payment.data?.status as string;
            // / for which other PaymentStatus we cannot cancel a payment?
            if (!["open", "pending", "authorized"].includes(status)) {
                // / if payment has been canceled or paid return updated payment object
                return payment;
            }

            const id = input.data?.id as string;
            const cancelPayment = await this.mollieClient.payments.cancel(id);

            return {
                data: cancelPayment as unknown as Record<string, unknown>
            };
        } catch (error) {
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                "An error occurred in cancelPayment"
            );
        }
    }
    async capturePayment(
        input: CapturePaymentInput
    ): Promise<CapturePaymentOutput> {
        try {
            // / do we need to refetch latest status from mollie api?
            if (input.data?.status != PaymentSessionStatus.AUTHORIZED) {
                // if status is not authorized return with incoming data.
                // what will be issues use this flow?
                return input;
            }

            const id = input.data?.id as string;
            const payment = await this.mollieClient.paymentCaptures.create({
                paymentId: id
            });

            // / should we return payment object or capture?
            return {
                data: payment as unknown as Record<string, unknown>
            };
        } catch (error) {
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                "An error occurred in capturePayment"
            );
        }
    }
    async deletePayment(
        input: DeletePaymentInput
    ): Promise<DeletePaymentOutput> {
        return await this.cancelPayment(input);
    }

    async refundPayment(
        input: RefundPaymentInput
    ): Promise<RefundPaymentOutput> {
        const id = input.data?.id as string;
        const { amount } = input;
        try {
            const refund = await this.mollieClient.paymentRefunds.create({
                paymentId: id,
                amount: {
                    currency: getFormattedCurrencyCode("EUR"),
                    value: getFormattedAmount(amount as number)
                }
            });
            return {
                data: refund as unknown as Record<string, unknown>
            };
        } catch (error) {
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                "An error occurred in refundPayment"
            );
        }
    }

    async retrievePayment(
        input: RetrievePaymentInput
    ): Promise<RetrievePaymentOutput> {
        try {
            const id = input.data?.id as string;
            const payment = await this.mollieClient.payments.get(id);
            payment.amount.value = getFormattedAmount(
                Number(payment.amount.value)
            );
            payment.amount.currency = getFormattedCurrencyCode(
                payment.amount.currency
            );

            return {
                data: payment as unknown as Record<string, unknown>
            };
        } catch (error) {
            throw new MedusaError(
                MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
                "An error occurred in retrievePayment"
            );
        }
    }

    // / TODO: Implement this
    // / https://docs.mollie.com/reference/update-payment
    async updatePayment(
        input: UpdatePaymentInput
    ): Promise<UpdatePaymentOutput> {
        const {
            // context,
            data // currency_code, amount
        } = input;

        return { data };

        // try {
        //   const id = data.id as string;
        //   const sessionData = (await this.mollieClient.payments.update(id, {
        //   })) as unknown as PaymentProviderSessionResponse["data"];
        //   return { data: sessionData };
        // } catch (error) {
        //   return this.buildError("An error occurred in updatePayment", error);
        // }
    }

    async getWebhookActionAndData(
        webhookData: ProviderWebhookPayload["payload"]
    ): Promise<WebhookActionResult> {
        const { data } = webhookData;

        const payment = await this.mollieClient.payments.get(data.id as string);

        const sessionId = (payment.metadata as Record<string, string>)
            .session_id;

        switch (payment.status) {
            // / do we need `paid` case?
            // case "paid":
            //   return {
            //     action: PaymentActions.SUCCESSFUL,
            //     data: {
            //       session_id: (payment.metadata as Record<string, any>).session_id,
            //       amount: new BigNumber(payment.amount.value),
            //     },
            //   };
            case "authorized":
                return {
                    action: PaymentActions.AUTHORIZED,
                    data: {
                        session_id: sessionId,
                        amount: new BigNumber(payment.amount.value)
                    }
                };

            case "failed":
                return {
                    action: PaymentActions.FAILED,
                    data: {
                        session_id: sessionId,
                        amount: new BigNumber(payment.amount.value)
                    }
                };
            case "canceled":
                return {
                    action: PaymentActions.FAILED,
                    data: {
                        session_id: sessionId,
                        amount: new BigNumber(payment.amount.value)
                    }
                };
            default:
                return { action: PaymentActions.NOT_SUPPORTED };
        }
    }
}

export default MollieBase;
