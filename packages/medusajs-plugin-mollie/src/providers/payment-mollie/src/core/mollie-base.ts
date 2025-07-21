import { EOL } from "os";

// / Mollie SDK imports
import MollieClientProvider, {
    type MollieClient,
    type Payment,
    PaymentStatus
} from "@mollie/api-client";

// / Medusa imports
import {
    AbstractPaymentProvider,
    BigNumber,
    isDefined,
    isPaymentProviderError,
    PaymentActions,
    PaymentSessionStatus
} from "@medusajs/framework/utils";

import type {
    CreatePaymentProviderSession,
    PaymentProviderError,
    PaymentProviderSessionResponse,
    ProviderWebhookPayload,
    UpdatePaymentProviderSession,
    WebhookActionResult
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
        // @ts-ignore
        super(...arguments);

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

    /**
     * @dev returns Mollie to Medusa payment status. if status does not match with the map it returns PENDING
     */
    protected getStatus(status: PaymentStatus) {
        return PaymentStatusMap[status] || PaymentSessionStatus.PENDING;
    }

    async getPaymentStatus(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentSessionStatus> {
        const id = paymentSessionData.id as string;

        const payment = await this.mollieClient.payments.get(id);
        return this.getStatus(payment.status);
    }

    async initiatePayment(
        input: CreatePaymentProviderSession
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
        const {
            session_id,
            email: billingEmail
            // TODO: consume this when creating payment
            // customer
        } = input.context;
        const { currency_code, amount } = input;

        /**
         * @see — https://docs.mollie.com/reference/v2/payments-api/get-payment?path=webhookUrl#response
         */
        const webhookUrl = this.webhookUrl;

        // / extra inputs set while requesting initiatePayment from the store
        const extra = input.context.extra as PaymentContextExtra;

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
                    billingEmail,
                    amount: {
                        currency: getFormattedCurrencyCode(currency_code),
                        value: getFormattedAmount(amount as number)
                    },
                    metadata: {
                        session_id: session_id
                    }
                })) as unknown as Record<string, unknown>;
            return {
                data: createPaymentResponse
            };
        } catch (error) {
            return this.buildError(
                "An error occurred in InitiatePayment during the creation",
                error
            );
        }
    }

    async authorizePayment(
        paymentSessionData: Record<string, unknown>,
        context: Record<string, unknown>
    ): Promise<
        | PaymentProviderError
        | {
              status: PaymentSessionStatus;
              data: PaymentProviderSessionResponse["data"];
          }
    > {
        const updatedPaymentSession = (await this.retrievePayment(
            paymentSessionData
        )) as unknown as Payment;

        return {
            data: updatedPaymentSession as unknown as Record<string, unknown>,
            status: this.getStatus(updatedPaymentSession.status)
        };
    }

    async cancelPayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        try {
            // / fetch payment object from API
            const payment = await this.retrievePayment(paymentSessionData);

            // / extract status
            const status = (payment as unknown as Payment).status;
            // / for which other PaymentStatus we cannot cancel a payment?
            if (!["open", "pending", "authorized"].includes(status)) {
                // / if payment has been canceled or paid return updated payment object
                return payment;
            }

            const id = paymentSessionData.id as string;
            const cancelPayment = (await this.mollieClient.payments.cancel(
                id
            )) as unknown as PaymentProviderSessionResponse["data"];

            return cancelPayment;
        } catch (error) {
            return this.buildError("An error occurred in cancelPayment", error);
        }
    }
    async capturePayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        try {
            // / do we need to refetch latest status from mollie api?
            if (paymentSessionData.status != "authorized") {
                // if status is not authorized return with incoming data.
                // what will be issues use this flow?
                return paymentSessionData;
            }

            const id = paymentSessionData.id as string;
            const payment = await this.mollieClient.paymentCaptures.create({
                paymentId: id
            });

            // / should we return payment object or capture?
            return payment as unknown as PaymentProviderSessionResponse["data"];
        } catch (error) {
            return this.buildError(
                "An error occurred in capturePayment",
                error
            );
        }
    }
    async deletePayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        return await this.cancelPayment(paymentSessionData);
    }

    async refundPayment(
        paymentSessionData: Record<string, unknown>,
        refundAmount: number
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        const id = paymentSessionData.id as string;
        try {
            const { currency } = paymentSessionData;
            await this.mollieClient.paymentRefunds.create({
                paymentId: id,
                amount: {
                    currency: currency as string,
                    value: getFormattedAmount(refundAmount)
                }
            });
        } catch (error) {
            return this.buildError("An error occurred in refundPayment", error);
        }
        return paymentSessionData;
    }

    async retrievePayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        try {
            const id = paymentSessionData.id as string;
            const payment = await this.mollieClient.payments.get(id);
            payment.amount.value = getFormattedAmount(
                Number(payment.amount.value)
            );
            payment.amount.currency = getFormattedCurrencyCode(
                payment.amount.currency
            );

            return payment as unknown as PaymentProviderSessionResponse["data"];
        } catch (error) {
            return this.buildError(
                "An error occurred in retrievePayment",
                error
            );
        }
    }

    // / TODO: Implement this
    // / https://docs.mollie.com/reference/update-payment
    async updatePayment(
        input: UpdatePaymentProviderSession
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
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
                        session_id: (payment.metadata as Record<string, any>)
                            .session_id,
                        amount: new BigNumber(payment.amount.value)
                    }
                };

            case "failed":
                return {
                    action: PaymentActions.FAILED,
                    data: {
                        session_id: (payment.metadata as Record<string, any>)
                            .session_id,
                        amount: new BigNumber(payment.amount.value)
                    }
                };
            case "canceled":
                return {
                    action: PaymentActions.FAILED,
                    data: {
                        session_id: (payment.metadata as Record<string, any>)
                            .session_id,
                        amount: new BigNumber(payment.amount.value)
                    }
                };
            default:
                return { action: PaymentActions.NOT_SUPPORTED };
        }
    }
    protected buildError(
        message: string,
        error: PaymentProviderError | Error
    ): PaymentProviderError {
        return {
            error: message,
            code: "code" in error ? error.code : "unknown",

            detail: isPaymentProviderError(error)
                ? `${error.error}${EOL}${error.detail ?? ""}`
                : "detail" in error
                ? error.detail
                : error.message ?? ""
        };
    }
}

export default MollieBase;
