import { Logger } from "@medusajs/types/dist/logger";
import { BtcOptions } from "../types";
import crypto from "node:crypto";
import _ from "lodash";
import {
    ICustomerModuleService,
    MedusaContainer
} from "@medusajs/framework/types";
import {
    InitiatePaymentInput,
    InitiatePaymentOutput,
    ProviderWebhookPayload,
    WebhookActionResult,
    PaymentProviderInput,
    PaymentSessionStatus,
    GetPaymentStatusOutput
} from "@medusajs/types/dist/payment";
import {
    AbstractPaymentProvider,
    ContainerRegistrationKeys,
    Modules,
    PaymentActions,
    MedusaError
} from "@medusajs/framework/utils";
import { getAmountFromSmallestUnit } from "../utils/get-smallest-unit";
import {
    InvoicesApi as Btcpay,
    InvoiceData,
    InvoiceStatus,
    InvoiceStatusMark,
    WebhookInvoiceEvent,
    WebhookInvoiceReceivedPaymentEvent,
    InvoiceIdRefundBody,
    StoresApi,
    StoreId,
    CreateInvoiceRequest
} from "./api";
/**
 * The paymentIntent object corresponds to a btcpay order.
 *
 */

class BtcpayBase extends AbstractPaymentProvider<BtcOptions> {
    static identifier = "btcpay";

    protected readonly options_: BtcOptions;
    protected btcpay_: Btcpay;
    protected logger: Logger;
    customerService: ICustomerModuleService;
    btcadmin_: StoresApi;

    protected constructor(container: MedusaContainer, options: BtcOptions) {
        super(container, options);

        this.options_ = options;
        this.logger = container.resolve(
            ContainerRegistrationKeys.LOGGER
        ) as Logger;
        this.customerService = container.resolve(Modules.CUSTOMER) as any;
        this.options_ = options;
        this.btcpay_ = new Btcpay(options);
        this.btcadmin_ = new StoresApi(options);
    }

    async initiatePayment(
        input: InitiatePaymentInput
    ): Promise<InitiatePaymentOutput> {
        const { amount, currency_code, context: customerDetails } = input;

        // assuming you have a client that initializes the payment
        const detailedCustomer = await this.customerService.retrieveCustomer(
            customerDetails?.customer?.id as string
        );

        if (!detailedCustomer) {
            throw new Error("Customer not found");
        }
        const store = await this.btcadmin_.storesGetStore(
            detailedCustomer?.metadata.store_id as string
        );
        if (!store) {
            throw new Error("Store not found");
        }
        const storeId = store.id! as string;
        const body: CreateInvoiceRequest = {
            amount: amount.toString(),
            currency: currency_code,
            additionalSearchTerms: [
                `session_id:${customerDetails?.idempotency_key},
                customer_id:${customerDetails?.customer?.id}`,
                `email:${customerDetails?.customer?.email ?? ""}`
            ]
        };
        const response = await this.btcpay_.invoicesCreateInvoice(
            body,
            storeId
        );

        return {
            ...response,
            initial_data: input
        } as InitiatePaymentOutput;
    }
    async getPaymentStatus(
        input: PaymentProviderInput
    ): Promise<GetPaymentStatusOutput> {
        const btcpayId = input.data?.id as string;

        if (!btcpayId) {
            throw new Error("Btcpay ID is required to get payment status");
        }
        // assuming you have a client that retrieves the payment status
        const invoice = await this.btcpay_.invoicesGetInvoice(
            btcpayId!,
            input.data?.storeId as string
        );

        switch (invoice.status) {
            case InvoiceStatus.Processing:
                return { status: "authorized" };
            case InvoiceStatus.Settled:
                return { status: "captured" };
            case InvoiceStatus.Invalid:
            case InvoiceStatus.Expired:
                return { status: "canceled" };
            case InvoiceStatus.New:
            default:
                return { status: "pending" };
        }
    }

    async getWebhookActionAndData(
        webhookData: ProviderWebhookPayload["payload"]
    ): Promise<WebhookActionResult> {
        const sigHeaderName = "BTCPAY-SIG";
        const webhookSignature = webhookData.headers[sigHeaderName] as string;
        const sigHashAlg = "sha256";

        const webhookSecret =
            this.options_?.webhook_secret ||
            process.env.btcpay_WEBHOOK_SECRET ||
            process.env.btcpay_TEST_WEBHOOK_SECRET;
        if (!webhookData.rawData) {
            this.logger.error(
                "Btcpay webhook rawData is not present in the request"
            );
            return { action: PaymentActions.FAILED };
        }

        const rawData = webhookData.rawData;
        const checksum = Buffer.from(webhookSignature ?? "", "utf8");
        const hmac = crypto.createHmac(sigHashAlg, webhookSecret as string);
        const digest = Buffer.from(
            sigHashAlg + "=" + hmac.update(rawData).digest("hex"),
            "utf8"
        );
        if (
            checksum.length !== digest.length ||
            !crypto.timingSafeEqual(digest, checksum)
        ) {
            this.logger.error(
                `Request body digest (${digest}) did not match ${sigHeaderName} (${checksum})`
            );
            return { action: PaymentActions.FAILED };
        } else {
            // Your own processing code goes here. E.g. update your internal order id depending on the invoice payment status.
        }
        const logger = this.logger;
        const data = webhookData.data;

        logger.info(
            `Received Btcpay webhook body as object : ${JSON.stringify(
                webhookData.data
            )}`
        );
        const paymentEvent = webhookData.data as WebhookInvoiceEvent;
        const event = paymentEvent.type;

        const btcpayInvoice = await this.btcpay_.invoicesGetInvoice(
            paymentEvent.invoiceId!,
            paymentEvent.storeId!
        );
        /** sometimes this even fires before the order is updated in the remote system */
        let outstanding = 0;
        outstanding =
            parseFloat(btcpayInvoice.amount ?? "0") -
            parseFloat(
                (paymentEvent as WebhookInvoiceReceivedPaymentEvent).payment
                    ?.value ?? "0"
            );

        switch (event) {
            // payment authorization is handled in checkout flow. webhook not

            case "InvoiceCreated": {
                const paymentEvent = data as WebhookInvoiceEvent;
                return {
                    action: PaymentActions.NOT_SUPPORTED,
                    data: {
                        session_id: (paymentEvent.metadata as any)
                            .session_id as string,
                        amount: getAmountFromSmallestUnit(
                            btcpayInvoice.amount!.toString(),
                            btcpayInvoice.currency!
                        )
                    }
                };
            }

            case "InvoicePaymentSettled":
            case "InvoiceSettled":
                return {
                    action: PaymentActions.SUCCESSFUL,
                    data: {
                        session_id: paymentEvent.invoiceId as string,

                        amount: outstanding
                    }
                };
            case "InvoiceReceivedPayment":
            case "InvoiceProcessing":
                return {
                    action: PaymentActions.AUTHORIZED,
                    data: {
                        session_id: paymentEvent.invoiceId as string,

                        amount: outstanding
                    }
                };
            case "InvoiceInvalid":
            case "InvoiceExpired":
                // TODO: notify customer of failed payment

                return {
                    action: PaymentActions.FAILED,
                    data: {
                        session_id: paymentEvent.invoiceId as string,

                        amount: outstanding
                    }
                };
                break;

            default:
                return { action: PaymentActions.NOT_SUPPORTED };
        }
    }
    static validateOptions(options: BtcOptions): void {
        if (!options.apiKey) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "API key is required in the provider's options."
            );
        }
        const refundCharges = parseFloat(options.refund_charges_percentage);
        if (
            _.isNaN(refundCharges) ||
            refundCharges < 0 ||
            refundCharges > 100
        ) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Refund charges percentage must be a number between 0 and 100."
            );
        }

        if (!options.webhook_secret) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Webhook secret is required in the provider's options."
            );
        }
        if (!options.basePath) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Base path is required in the provider's options."
            );
        }
    }
    async capturePayment(
        paymentData: PaymentProviderInput
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        const { data, context } = paymentData;
        await this.btcpay_.invoicesMarkInvoiceStatus(
            {
                status: InvoiceStatusMark.Settled
            },
            data.id!,
            data.storeId!
        );
        return {
            ...paymentData
        };
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
        const invoiceData = await this.btcpay_.invoicesUpdateInvoice(
            {
                metadata: {
                    session_id: context?.session_id as string,
                    customer_id: context?.customer_id as string
                }
            },
            paymentSessionData.id as string,
            paymentSessionData.storeId as string
        );

        return {
            status: "pending",
            data: { ...invoiceData }
        };
    }
    async cancelPayment(
        paymentData: Record<string, unknown>
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        let invoiceData = await this.btcpay_.invoicesMarkInvoiceStatus(
            {
                status: InvoiceStatusMark.Invalid
            },
            paymentData.id as string,
            paymentData.storeId as string
        );
        invoiceData = (
            await this.btcpay_.invoicesArchiveInvoice(
                paymentData.id as string,
                paymentData.storeId as string
            )
        ).json() as InvoiceData;
        return {
            data: invoiceData
        };
    }
    async deletePayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        const invoice = await this.btcpay_.invoicesArchiveInvoice(
            paymentSessionData.id as string,
            paymentSessionData.storeId as string
        );
        return {
            data: invoice
        };
    }
    async refundPayment(
        paymentData: Record<string, unknown>,
        refundAmount: number
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        const invoiceData = await this.btcpay_.invoicesRefund(
            {
                payoutMethodId: "BTC-LN",
                refundVariant: InvoiceIdRefundBody.RefundVariantEnum.RateThen,
                subtractPercentage: this.options_.refund_charges_percentage,
                customAmount: refundAmount.toString(),
                customCurrency: paymentData.currency as string
            },
            paymentData.id as string,
            paymentData.storeId as string
        );
        return {
            data: invoiceData
        };
    }
    async retrievePayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
        throw new Error("Method not implemented.");
    }
    async updatePayment(
        context: UpdatePaymentProviderSession
    ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
        throw new Error("Method not implemented.");
    }
}

export default BtcpayBase;
