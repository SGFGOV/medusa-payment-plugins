import { Logger } from "@medusajs/types/dist/logger";
import { BtcOptions } from "../types";
import crypto from "node:crypto";
import _ from "lodash";
import {
    ICustomerModuleService,
    MedusaContainer,
    RemoteQueryFunction
} from "@medusajs/framework/types";
import {
    InitiatePaymentInput,
    InitiatePaymentOutput,
    ProviderWebhookPayload,
    WebhookActionResult,
    PaymentProviderInput,
    PaymentSessionStatus,
    GetPaymentStatusOutput,
    AuthorizePaymentInput,
    AuthorizePaymentOutput,
    CapturePaymentInput,
    CapturePaymentOutput,
    CancelPaymentInput,
    CancelPaymentOutput,
    DeletePaymentInput,
    DeletePaymentOutput,
    RefundPaymentInput,
    RefundPaymentOutput,
    RetrievePaymentInput,
    RetrievePaymentOutput,
    UpdatePaymentInput,
    UpdatePaymentOutput,
    IPaymentModuleService,
    PaymentSessionDTO
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
    StoresRatesApi,
    CreateInvoiceRequest
} from "./api";
import { isContext } from "node:vm";
import { Query } from "@medusajs/framework";
import { Connection, EntityManager } from "@mikro-orm/knex";
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
    btcRatesApi_: StoresRatesApi;
    paymentService: IPaymentModuleService;
    query: Query;
    manager: EntityManager;

    protected constructor(container: MedusaContainer, options: BtcOptions) {
        super(container, options);

        this.options_ = options;
        this.logger = container[ContainerRegistrationKeys.LOGGER] as Logger;
        this.manager = container[
            ContainerRegistrationKeys.MANAGER
        ] as EntityManager;
        // try {
        //     this.query = container[ContainerRegistrationKeys.QUERY] as Query;
        // } catch (error) {
        //     this.logger.error("Query is not present in the container");
        //     throw new MedusaError(
        //         MedusaError.Types.INVALID_DATA,
        //         "Query is not present in the container"
        //     );
        // }
        this.paymentService = container[
            Modules.PAYMENT
        ] as IPaymentModuleService;
        this.customerService = container[
            Modules.CUSTOMER
        ] as ICustomerModuleService;
        this.options_ = options;
        this.btcpay_ = new Btcpay(options, options.basePath, fetch);
        this.btcadmin_ = new StoresApi(options, options.basePath, fetch);
        this.btcRatesApi_ = new StoresRatesApi(
            options,
            options.basePath,
            fetch
        );
    }

    async getEntityFromTable<T>(
        table_name: string,
        id: string[],
        field = "id"
    ): Promise<T[]> {
        const connection = this.container[
            ContainerRegistrationKeys.PG_CONNECTION
        ] as any;
        const manager = this.container[
            ContainerRegistrationKeys.MANAGER
        ] as EntityManager;
        const items = await connection
            .table(table_name)
            .select("*")
            .where(field, "in", id);
        return items as T[];
    }
    async getAllEntityFromTable<T>(table_name: string): Promise<T[]> {
        const connection = this.container[
            ContainerRegistrationKeys.PG_CONNECTION
        ] as any;
        const manager = this.container[
            ContainerRegistrationKeys.MANAGER
        ] as EntityManager;
        const items = await connection.table(table_name).select("*");

        return items as T[];
    }
    private async getCartId(idempotency_key: string): Promise<string> {
        const ps = await this.paymentService.retrievePaymentSession(
            idempotency_key!
        );

        const cart_payment_collections = await this.getEntityFromTable<{
            cart_id: string;
            payment_collection_id: string;
            id: string;
        }>(
            "cart_payment_collection",
            [ps.payment_collection_id],
            "payment_collection_id"
        );
        const cartId = cart_payment_collections[0]?.cart_id as string;
        return cartId;
    }
    async initiatePayment(
        input: InitiatePaymentInput
    ): Promise<InitiatePaymentOutput> {
        const { amount, currency_code, context: context } = input;
        if (!context?.idempotency_key) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Idempotency key is required to initiate payment"
            );
        }
        const cartId = await this.getCartId(context?.idempotency_key as string);
        // paymentCollections[0].cart

        let btStore;
        // assuming you have a client that initializes the payment
        if (!context?.customer?.id) {
            this.logger.warn("Customer ID is required to initiate payment");
        } else {
            const detailedCustomer =
                await this.customerService.retrieveCustomer(
                    context?.customer?.id as string
                );

            if (!detailedCustomer) {
                throw new Error("Customer not found");
            }
            btStore = await this.btcadmin_.storesGetStore(
                detailedCustomer?.metadata.store_id as string
            );
        }
        if (!btStore) {
            btStore = await this.btcadmin_.storesGetStore(
                this.options_.default_store_id as string
            );
        }

        if (!btStore) {
            throw new Error("Store not found");
        }
        const storeId = btStore.id! as string;
        const redirectUrl = `${this.options_.storefront_url}/processing?cart=${cartId}`;
        // const urlEncodedRedirect = encodeURIComponent(redirection)

        const body: CreateInvoiceRequest = {
            amount: amount.toString(),
            currency: currency_code,
            checkout: {
                redirectURL: redirectUrl
            },
            additionalSearchTerms: [
                `session_id:${context?.idempotency_key},
                customer_id:${context?.customer?.id}`,
                `email:${context?.customer?.email ?? ""}`
            ]
        };
        const response = await this.btcpay_.invoicesCreateInvoice(
            body,
            storeId
        );
        const id = input.context?.idempotency_key as string;
        const invoiceData = await this.updateBtcInvoiceMetadata(
            response.id!,
            storeId,
            {
                medusa_payment_session_id: id
            }
        );
        const paymentSessionUpdateRequest = {
            id: id,
            data: { btc_invoice: invoiceData },
            currency_code,
            amount
        };
        const updatedSession = await this.paymentService.updatePaymentSession(
            paymentSessionUpdateRequest
        );

        if (!updatedSession) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Failed to update payment session"
            );
        }

        return paymentSessionUpdateRequest;
    }

    async getPaymentSessionAndInvoiceFromInput(
        input:
            | AuthorizePaymentInput
            | CapturePaymentInput
            | CancelPaymentInput
            | DeletePaymentInput
            | RefundPaymentInput
            | RetrievePaymentInput
            | UpdatePaymentInput
    ): Promise<{
        paymentSession: PaymentSessionDTO;
        btc_invoice: InvoiceData;
    }> {
        let { data, context } = input;
        if (!data?.btc_invoice) {
            if (data && data?.storeId && data?.id) {
                data = {
                    ...data,
                    btc_invoice: await this.btcpay_.invoicesGetInvoice(
                        data.id as string,
                        data.storeId as string
                    )
                };
            }
        }
        let { btc_invoice } = data as { btc_invoice: InvoiceData };

        const paymentSessionId =
            (btc_invoice?.metadata as Record<string, string>)
                ?.medusa_payment_session_id ?? context?.idempotency_key;

        let paymentSession = await this.paymentService.retrievePaymentSession(
            paymentSessionId
        );
        if (!btc_invoice) {
            btc_invoice = paymentSession?.data?.btc_invoice as InvoiceData;
        }
        if (btc_invoice) {
            const btc_invoice_latest = await this.btcpay_.invoicesGetInvoice(
                btc_invoice.id as string,
                btc_invoice.storeId as string
            );
            if (btc_invoice_latest.status != btc_invoice.status) {
                {
                    paymentSession =
                        await this.paymentService.updatePaymentSession({
                            id: paymentSessionId,
                            data: { btc_invoice: btc_invoice_latest },
                            currency_code: paymentSession.currency_code,
                            amount: paymentSession.amount
                        });
                    btc_invoice = btc_invoice_latest;
                }
            }
        }

        if (!paymentSession) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Payment session with ID ${paymentSessionId} not found`
            );
        }
        if (!btc_invoice) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                "Btc invoice with ID is not found"
            );
        }
        return {
            paymentSession,
            btc_invoice
        };
    }

    async authorizePayment(
        input: AuthorizePaymentInput
    ): Promise<AuthorizePaymentOutput> {
        let { paymentSession, btc_invoice } =
            await this.getPaymentSessionAndInvoiceFromInput(input);

        let invoiceData = await this.btcpay_.invoicesGetInvoice(
            btc_invoice.id as string,
            btc_invoice.storeId as string
        );
        if (!invoiceData) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Invoice with ID ${btc_invoice.id} not found`
            );
        }

        paymentSession = await this.paymentService.updatePaymentSession({
            id: paymentSession.id,
            data: { btc_invoice: invoiceData },
            currency_code: paymentSession.currency_code,
            amount: paymentSession.amount
        });

        invoiceData = await this.updateBtcInvoiceMetadata(
            btc_invoice.id as string,
            btc_invoice.storeId as string,
            {
                medusa_payment_session_id: paymentSession.id
            }
        );
        return {
            status:
                invoiceData.status == InvoiceStatus.Processing
                    ? "authorized"
                    : invoiceData.status == InvoiceStatus.Settled
                    ? "captured"
                    : "pending",
            data: {
                btc_invoice: invoiceData
            }
        };
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

    async getOutstandingAmount(
        sessionId: string,
        btcStoreId: string,
        btcInvoiceId: string,
        receivedValue: number
    ): Promise<number | undefined> {
        const btcpayInvoice = await this.btcpay_.invoicesGetInvoice(
            btcInvoiceId,
            btcStoreId
        );
        if (!sessionId) {
            this.logger.error(
                "Session ID is not present in the invoice metadata"
            );
            return;
        }
        const rates = await this.btcRatesApi_.storesGetStoreRates(btcStoreId);
        if (!rates) {
            this.logger.error(
                "Rates are not present in the store, please configure rates in your store"
            );
            return;
        }

        if (sessionId && rates) {
            const ps = await this.paymentService.retrievePaymentSession(
                sessionId
            );
            const storeCurrency =
                ps.currency_code?.toUpperCase() ??
                btcpayInvoice.currency?.toUpperCase() ??
                "USD";
            const targetCurrency = (
                this.options_.crypto_currency ?? "BTC"
            ).toUpperCase();
            const targetCurrencyPair = `${storeCurrency}_${targetCurrency}`;

            const CURRENCY_RATE = rates.find(
                (rate) => rate.currencyPair === targetCurrencyPair
            )?.rate;

            const CURRENCY_RATE_NUMBER = parseFloat(CURRENCY_RATE ?? "0");

            const outstanding =
                parseFloat(btcpayInvoice.amount ?? "0") * CURRENCY_RATE_NUMBER -
                receivedValue;
            return outstanding;
        }
    }

    async validateSignature(
        webhookData: ProviderWebhookPayload["payload"]
    ): Promise<WebhookActionResult | undefined> {
        const sigHeaderName = "BTCPAY-SIG".toLowerCase();
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
        }
    }

    private async handleWebhookEvents_({
        event,
        session_id,
        amountCollected,
        btc_invoice
    }: {
        event: string;
        session_id: string;
        amountCollected: number;
        btc_invoice: InvoiceData;
    }): Promise<WebhookActionResult> {
        switch (event) {
            // payment authorization is handled in checkout flow. webhook not

            case "InvoiceCreated": {
                return {
                    action: PaymentActions.NOT_SUPPORTED,
                    data: {
                        session_id: session_id,
                        amount: amountCollected
                    }
                };
            }

            case "InvoicePaymentSettled":
            case "InvoiceSettled":
                await this.paymentService.updatePaymentSession({
                    id: session_id,
                    data: { btc_invoice },
                    currency_code: btc_invoice.currency as string,
                    amount: amountCollected
                });
                return {
                    action: PaymentActions.SUCCESSFUL,
                    data: {
                        session_id,

                        amount: amountCollected
                    }
                };
            case "InvoiceReceivedPayment":
            case "InvoiceProcessing":
                await this.paymentService.updatePaymentSession({
                    id: session_id,
                    data: { btc_invoice },
                    currency_code: btc_invoice.currency as string,
                    amount: amountCollected
                });
                return {
                    action: PaymentActions.AUTHORIZED,
                    data: {
                        session_id,

                        amount: amountCollected
                    }
                };
            case "InvoiceInvalid":
            case "InvoiceExpired":
                // TODO: notify customer of failed payment
                await this.paymentService.updatePaymentSession({
                    id: session_id,
                    data: { btc_invoice },
                    currency_code: btc_invoice.currency as string,
                    amount: amountCollected
                });
                return {
                    action: PaymentActions.FAILED,
                    data: {
                        session_id,
                        amount: amountCollected
                    }
                };

            default:
                return { action: PaymentActions.NOT_SUPPORTED };
        }
    }

    async getWebhookActionAndData(
        webhookData: ProviderWebhookPayload["payload"]
    ): Promise<WebhookActionResult> {
        const signautreValidation = await this.validateSignature(webhookData);
        if (signautreValidation?.action == PaymentActions.FAILED) {
            return signautreValidation;
        }
        const logger = this.logger;

        logger.info(
            `Received Btcpay webhook body as object : ${JSON.stringify(
                webhookData.data
            )}`
        );
        const paymentEvent = webhookData.data as WebhookInvoiceEvent;
        const event = paymentEvent.type;
        if (!event) {
            logger.error("Event type is not present in the webhook data");
            return { action: PaymentActions.FAILED };
        }
        const allowedEvents = [
            "InvoiceCreated",
            "InvoiceReceivedPayment",
            "InvoiceSettled",
            "InvoicePaymentSettled",
            "InvoiceProcessing",
            "InvoiceInvalid",
            "InvoiceExpired"
        ];
        if (!allowedEvents.includes(event)) {
            logger.error(
                `Event type ${event} is not supported in the webhook data`
            );
            return { action: PaymentActions.NOT_SUPPORTED };
        }

        const btcpayInvoice = await this.btcpay_.invoicesGetInvoice(
            paymentEvent.invoiceId!,
            paymentEvent.storeId!
        );

        const receivedValue = parseFloat(
            (paymentEvent as WebhookInvoiceReceivedPaymentEvent).payment
                ?.value ?? "0"
        );
        const session_id = (btcpayInvoice.metadata as any)
            .medusa_payment_session_id as string;

        if (!session_id && event != "InvoiceCreated") {
            logger.error("Session ID is not present in the invoice metadata");
            return { action: PaymentActions.FAILED };
        }

        /** sometimes this even fires before the order is updated in the remote system */
        let outstanding = 0;
        if (paymentEvent.type != "InvoiceCreated") {
            const outstandingData = await this.getOutstandingAmount(
                session_id,
                paymentEvent.storeId!,
                paymentEvent.invoiceId!,
                receivedValue
            );
            if (outstandingData != undefined) {
                outstanding = outstandingData;
            }
        }

        const amountCollected = getAmountFromSmallestUnit(
            btcpayInvoice.amount!.toString(),
            btcpayInvoice.currency!
        );
        const result = await this.handleWebhookEvents_({
            event,
            session_id,
            amountCollected,
            btc_invoice: btcpayInvoice
        });
        return result;
    }
    static validateOptions(options: BtcOptions): void {
        if (!options.storefront_url) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Storefront URL is required in the provider's options."
            );
        }
        if(!options.refundVariant){
            throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Refund rate isn't set")
        }
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
        input: CapturePaymentInput
    ): Promise<CapturePaymentOutput> {
        let { btc_invoice, paymentSession } =
            await this.getPaymentSessionAndInvoiceFromInput(input);

        if (btc_invoice.status != InvoiceStatus.Settled) {
            throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                `Invoice with ID ${btc_invoice.id} is not settled`
            );
        }

        paymentSession = await this.paymentService.updatePaymentSession({
            id: paymentSession.id,
            data: { btc_invoice },
            currency_code: paymentSession.currency_code,
            amount: paymentSession.amount
        });

        return {
            data: { btc_invoice }
        };
    }

    async updateBtcInvoiceMetadata(
        invoiceId: string,
        storeId: string,
        metadata: Record<string, unknown>
    ): Promise<InvoiceData> {
        let invoiceData = await this.btcpay_.invoicesGetInvoice(
            invoiceId,
            storeId
        );
        if (!invoiceData) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Invoice with ID ${invoiceId} not found`
            );
        }
        invoiceData = await this.btcpay_.invoicesUpdateInvoice(
            {
                metadata: {
                    ...invoiceData.metadata,
                    ...metadata
                }
            },
            invoiceId,
            storeId
        );
        return invoiceData;
    }

    async cancelPayment(
        input: CancelPaymentInput
    ): Promise<CancelPaymentOutput> {
        const { data, context } = input;
        let { btc_invoice, paymentSession } =
            await this.getPaymentSessionAndInvoiceFromInput(input);
        if (!btc_invoice?.id) {
            return input;
        }
        let invoice = await this.btcpay_.invoicesMarkInvoiceStatus(
            {
                status: InvoiceStatusMark.Invalid
            },
            btc_invoice.id as string,
            btc_invoice.storeId as string
        );
        invoice = (
            await this.btcpay_.invoicesArchiveInvoice(
                btc_invoice.id as string,
                btc_invoice.storeId as string
            )
        ).json() as InvoiceData;
        paymentSession = await this.paymentService.updatePaymentSession({
            id: paymentSession.id,
            data: { btc_invoice: invoice },
            currency_code: paymentSession.currency_code,
            amount: paymentSession.amount
        });

        return {
            data: { btc_invoice: invoice }
        };
    }
    async deletePayment(
        input: DeletePaymentInput
    ): Promise<DeletePaymentOutput> {
        if (!input?.data?.btc_invoice) {
            return input;
        }
        let { btc_invoice, paymentSession } =
            await this.getPaymentSessionAndInvoiceFromInput(input);
        if (!btc_invoice?.id) {
            return input;
        }

        const invoice = await this.btcpay_.invoicesArchiveInvoice(
            btc_invoice.id as string,
            btc_invoice.storeId as string
        );

        paymentSession = await this.paymentService.updatePaymentSession({
            id: paymentSession.id,
            data: { btc_invoice: invoice },
            currency_code: paymentSession.currency_code,
            amount: paymentSession.amount
        });

        return {
            data: { btc_invoice: invoice }
        };
    }
    async refundPayment(
        input: RefundPaymentInput
    ): Promise<RefundPaymentOutput> {
        const { data, context, amount: refundAmount } = input;

        const { btc_invoice, paymentSession } =
            await this.getPaymentSessionAndInvoiceFromInput(input);

        const customInfo  = this.options_.refundVariant == InvoiceIdRefundBody.RefundVariantEnum.Custom?
        {customAmount:         refundAmount.toString(),
        customCurrency: btc_invoice.currency}:{

        }

        const btcRefundStrategy:InvoiceIdRefundBody = {
            payoutMethodId: "BTC-CHAIN",
            refundVariant: this.options_.refundVariant ??
              InvoiceIdRefundBody.RefundVariantEnum.OverpaidAmount,
            subtractPercentage: this.options_.refund_charges_percentage,
            ...customInfo,
        }

        const invoiceData = await this.btcpay_.invoicesRefund(
            btcRefundStrategy,
            btc_invoice.id as string,
            btc_invoice.storeId as string
        );
        return {
            data: { btc_invoice:invoiceData }
        };
    }
    async retrievePayment(
        input: RetrievePaymentInput
    ): Promise<RetrievePaymentOutput> {
        const { data, context } = input;
        const { btc_invoice, paymentSession } =
            await this.getPaymentSessionAndInvoiceFromInput(input);

        return {
            data: { btc_invoice }
        };
    }
    async updatePayment(
        input: UpdatePaymentInput
    ): Promise<UpdatePaymentOutput> {
        const { btc_invoice, paymentSession } =
            await this.getPaymentSessionAndInvoiceFromInput(input);
        const invoiceData = await this.updateBtcInvoiceMetadata(
            btc_invoice.id as string,
            btc_invoice.storeId as string,
            {
                ...btc_invoice.metadata,
                medusa_payment_session_id:
                    (btc_invoice.metadata as Record<string, unknown>)
                        ?.medusa_payment_session_id ??
                    input?.context?.idempotency_key
            }
        );
        return {
            data: { btc_invoice: invoiceData }
        };
    }
}

export default BtcpayBase;
