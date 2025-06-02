import {
    AbstractPaymentProvider,
    ContainerRegistrationKeys,
    isDefined,
    MedusaError,
    MedusaErrorCodes,
    MedusaErrorTypes,
    Modules,
    PaymentActions,
    PaymentSessionStatus
} from "@medusajs/framework/utils";
import {
    CapturePaymentInput,
    CapturePaymentOutput,
    AuthorizePaymentInput,
    AuthorizePaymentOutput,
    CancelPaymentInput,
    CancelPaymentOutput,
    InitiatePaymentInput,
    InitiatePaymentOutput,
    DeletePaymentInput,
    DeletePaymentOutput,
    GetPaymentStatusInput,
    GetPaymentStatusOutput,
    RefundPaymentInput,
    RefundPaymentOutput,
    RetrievePaymentInput,
    RetrievePaymentOutput,
    UpdatePaymentInput,
    UpdatePaymentOutput,
    ProviderWebhookPayload,
    WebhookActionResult,
    ICartModuleService,
    ICustomerModuleService,
    IPaymentModuleService,
    Logger,
    MedusaContainer,
    CartDTO,
    PaymentSessionDTO,
    CustomerDTO,
    CartAddressDTO,
    CreateAccountHolderOutput,
    CreateAccountHolderInput,
    UpdateAccountHolderInput,
    DeleteAccountHolderOutput,
    DeleteAccountHolderInput,
    SavePaymentMethodOutput,
    SavePaymentMethodInput,
    UpdateAccountHolderOutput,
    PaymentCustomerDTO,
    PaymentAccountHolderDTO
} from "@medusajs/types";
import {
    Options,
    RazorpayOptions,
    RazorpayProviderConfig,
    WebhookEventData
} from "../types";
import Razorpay from "razorpay";
import { getAmountFromSmallestUnit } from "../utils/get-smallest-unit";
import { Orders } from "razorpay/dist/types/orders";
import { Customers } from "razorpay/dist/types/customers";
import { updateRazorpayCustomerMetadataWorkflow } from "../workflows/update-razorpay-customer-metadata";
import { IMap } from "razorpay/dist/types/api";
import { Payments } from "razorpay/dist/types/payments";

class RazorpayBase extends AbstractPaymentProvider<RazorpayOptions> {
    protected readonly options_: RazorpayProviderConfig & Options;
    protected razorpay_: Razorpay;
    logger: Logger;
    container_: MedusaContainer;
    customerService: ICustomerModuleService;
    paymentService: IPaymentModuleService;
    protected constructor(container: MedusaContainer, options) {
        super(container, options);

        this.options_ = options;
        this.logger = container[ContainerRegistrationKeys.LOGGER];
        this.customerService = container[Modules.CUSTOMER];
        this.paymentService = container[Modules.PAYMENT];

        this.container_ = container;
        this.options_ = options;

        this.init();
    }

    protected init(): void {
        const provider = this.options_.providers?.find(
            (p) => p.id == RazorpayBase.identifier
        );
        if (!provider && !this.options_.key_id) {
            throw new MedusaError(
                MedusaErrorTypes.INVALID_ARGUMENT,
                "razorpay not configured",
                MedusaErrorCodes.CART_INCOMPATIBLE_STATE
            );
        }
        this.razorpay_ =
            this.razorpay_ ||
            new Razorpay({
                key_id: this.options_.key_id ?? provider?.options.key_id,
                key_secret:
                    this.options_.key_secret ?? provider?.options.key_secret,
                headers: {
                    "Content-Type": "application/json",
                    "X-Razorpay-Account":
                        this.options_.razorpay_account ??
                        provider?.options.razorpay_account ??
                        undefined
                }
            });
    }

    static validateOptions(options: RazorpayOptions): void {
        if (!isDefined(options.key_id)!) {
            throw new Error(
                "Required option `key_id` is missing in Razorpay plugin"
            );
        }
        if (!isDefined(options.key_secret)!) {
            throw new Error(
                "Required option `key_secret` is missing in Razorpay plugin"
            );
        }
        if (!isDefined(options.razorpay_account)!) {
            throw new Error(
                "Required option `razorpay_account` is missing in Razorpay plugin"
            );
        }
        if (!isDefined(options.automatic_expiry_period)!) {
            if (!isDefined(options.manual_expiry_period)!) {
                throw new Error(
                    "Required option `manual_expiry_period` is missing in Razorpay plugin"
                );
            }
            throw new Error(
                "Required option `automatic_expiry_period` is missing in Razorpay plugin"
            );
        }

        if (!isDefined(options.webhook_secret)!) {
            throw new Error(
                "Required option `webhook_secret` is missing in Razorpay plugin"
            );
        }
    }

    // async getEntityFromTable<T>(
    //     table_name: string,
    //     id: string[],
    //     field = "id"
    // ): Promise<T[]> {
    //     const connection = this.container[
    //         ContainerRegistrationKeys.PG_CONNECTION
    //     ] as any;
    //     const items = await connection
    //         .table(table_name)
    //         .select("*")
    //         .where(field, "in", id);
    //     return items as T[];
    // }
    // async getAllEntityFromTable<T>(table_name: string): Promise<T[]> {
    //     const connection = this.container[
    //         ContainerRegistrationKeys.PG_CONNECTION
    //     ] as any;
    //     const items = await connection.table(table_name).select("*");

    //     return items as T[];
    // }
    // private async getCartId(idempotency_key: string): Promise<string> {
    //     const ps = await this.paymentService.retrievePaymentSession(
    //         idempotency_key!
    //     );

    //     const cart_payment_collections = await this.getEntityFromTable<{
    //         cart_id: string;
    //         payment_collection_id: string;
    //         id: string;
    //     }>(
    //         "cart_payment_collection",
    //         [ps.payment_collection_id],
    //         "payment_collection_id"
    //     );
    //     const cartId = cart_payment_collections[0]?.cart_id as string;
    //     return cartId;
    // }

    async capturePayment(
        input: CapturePaymentInput
    ): Promise<CapturePaymentOutput> {
        const { razorpayOrder, paymentSession } =
            await this.getPaymentSessionAndOrderFromInput(input);
        const paymentsResponse = await this.razorpay_.orders.fetchPayments(
            razorpayOrder.id as string
        );
        const possibleCaptures = paymentsResponse.items?.filter(
            (item) => item.status == "authorized"
        );
        const result = possibleCaptures?.map(async (payment) => {
            const { id, amount, currency } = payment;
            const toPay =
                getAmountFromSmallestUnit(
                    Math.round(parseInt(amount.toString())),
                    currency.toUpperCase()
                ) * 100;
            const paymentCaptured = await this.razorpay_.payments.capture(
                id,
                toPay,
                currency as string
            );
            return paymentCaptured;
        });
        if (result) {
            const payments = await Promise.all(result);
            const res = payments.reduce(
                (acc, curr) => ((acc[curr.id] = curr), acc),
                {}
            );
            // (paymentSessionData as unknown as Orders.RazorpayOrder).payments =
            //     res;

            const syncResult = await this.syncPaymentSession(
                paymentSession.id,
                razorpayOrder.id as string
            );
            const returrnedResult: CapturePaymentOutput = {
                data: {
                    razorpayOrder: syncResult.razorpayOrder
                }
            };
            return returrnedResult;
        } else {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `No payments found for order ${razorpayOrder.id}`
            );
        }
    }
    async authorizePayment(
        input: AuthorizePaymentInput
    ): Promise<AuthorizePaymentOutput> {
        const { razorpayOrder, paymentSession } =
            await this.getPaymentSessionAndOrderFromInput(input);

        const paymentStatusRequest: GetPaymentStatusInput = {
            ...input
        };
        const status = await this.getPaymentStatus(paymentStatusRequest);

        const result = await this.syncPaymentSession(
            paymentSession.id,
            razorpayOrder.id as string
        );

        if (status.status == PaymentSessionStatus.AUTHORIZED && this.options_.auto_capture) {
            status.status = PaymentSessionStatus.CAPTURED;
        }

        return {
            data: {
                razorpayOrder: result.razorpayOrder
            },
            status: status.status
        };
    }
    async cancelPayment(
        input: CancelPaymentInput
    ): Promise<CancelPaymentOutput> {
        
        const { razorpayOrder, paymentSession } =
            await this.getPaymentSessionAndOrderFromInput(input);

        const fetchPayments = await this.razorpay_.orders.fetchPayments(
            razorpayOrder.id as string
        );
        const capturedPayments = fetchPayments.items?.filter(
            (item) => item.status == "captured"
        );

        if(capturedPayments.length != 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Cannot cancel a payment that has been captured"
            );
        }

        const possibleRefunds = fetchPayments.items?.filter(
            (item) => item.status == "authorized"
        );

        const result = await Promise.all(possibleRefunds?.map(async (payment) => {
            const { id, amount, currency } = payment;
            const toPay =
                getAmountFromSmallestUnit(
                    Math.round(parseInt(amount.toString())),
                    currency.toUpperCase()
                ) * 100;
            const refund = await this.razorpay_.payments.refund(id, {
                amount: toPay,
                notes: {
                    medusa_payment_session_id: paymentSession.id
                }
            });
            return refund;
        }));
        const syncResult = await this.syncPaymentSession(
            paymentSession.id,
            razorpayOrder.id as string
        );

        return {
            data: {
                razorpayOrder: syncResult.razorpayOrder,
                razorpayRefunds: result
            }
        };
    }

    async getPaymentSessionAndOrderFromInput(
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
        razorpayOrder: Orders.RazorpayOrder;
    }> {
        let { data, context } = input;
        if (!data?.razorpayorder) {
            if (data && data?.id) {
                data = {
                    ...data,
                    razorpayOrder: await this.razorpay_.orders.fetch(
                        data.id as string
                    )
                };
            }
        }
        let { razorpayOrder } = data as { razorpayOrder: Orders.RazorpayOrder };

        const paymentSessionId =
            (razorpayOrder?.notes as Record<string, string>)
                ?.medusa_payment_session_id ?? context?.idempotency_key;

        let paymentSession = await this.paymentService.retrievePaymentSession(
            paymentSessionId
        );
        if (!razorpayOrder) {
            razorpayOrder = paymentSession?.data
                ?.razorpayOrder as Orders.RazorpayOrder;
        }
        if (razorpayOrder) {
            const razorpayOrder_latest = await this.razorpay_.orders.fetch(
                razorpayOrder.id as string
            );

        if (razorpayOrder_latest.status != razorpayOrder.status) {
            razorpayOrder = razorpayOrder_latest;
        }
                    }

        // this error checking isn't necessary as the payment session and razorpay order are created in the initiatePayment method

        // if (!paymentSession) {
        //     throw new MedusaError(
        //         MedusaError.Types.NOT_FOUND,
        //         `Payment session with ID ${paymentSessionId} not found`
        //     );
        // }
        // if (!razorpayOrder) {
        //     throw new MedusaError(
        //         MedusaError.Types.NOT_FOUND,
        //         "Razorpay order with ID is not found"
        //     );
        // }
        return {
            paymentSession,
            razorpayOrder: razorpayOrder
        };
    }

    private getRazorpayOrderCreateRequestBody(
       // cart: Partial<CartDTO>,
        amount: number,
        currency_code: string,
        razorpayCustomer?: PaymentAccountHolderDTO
      //  customer: Customers.RazorpayCustomer
    ): Orders.RazorpayOrderCreateRequestBody {

        
           
        const intentRequest: Orders.RazorpayOrderCreateRequestBody = {
            amount: amount,
            currency: currency_code.toUpperCase(),
            

            payment: {
                capture:
                    this.options_.auto_capture ?? true ? "automatic" : "manual",
                capture_options: {
                    refund_speed: this.options_.refund_speed ?? "normal",
                    automatic_expiry_period: Math.max(
                        this.options_.automatic_expiry_period ?? 20,
                        12
                    ),
                    manual_expiry_period: Math.max(
                        this.options_.manual_expiry_period ?? 10,
                        7200
                    )
                }
            }
        };
        return intentRequest;
    }

    async syncPaymentSession(
        paymentSessionId: string,
        razorpayOrderId: string
    ): Promise<{
        razorpayOrder: Orders.RazorpayOrder;
        paymentSession: PaymentSessionDTO;
    }> {
        const orderData = await this.updateRazorpayOrderMetadata(
            razorpayOrderId,
            {
                medusa_payment_session_id: paymentSessionId
            }
        );
        const paymentSessionData =
            await this.paymentService.retrievePaymentSession(paymentSessionId);
        return {
            razorpayOrder: orderData,
            paymentSession: paymentSessionData
        };
    }

    async initiatePayment(
        input: InitiatePaymentInput
    ): Promise<InitiatePaymentOutput> {
        const paymentSessionId = input.context?.idempotency_key;
        const razorpayCustomer = input.context?.account_holder
        const { amount, currency_code } = input;

        
        let toPay = getAmountFromSmallestUnit(
            Math.round(parseInt(amount.toString())),
            currency_code.toUpperCase()
        );

        toPay =
            currency_code.toUpperCase() == "INR" ? toPay * 100 * 100 : toPay;

        
        try {
            const razorpayOrderCreateRequest =
                this.getRazorpayOrderCreateRequestBody(
                    toPay,
                    currency_code,
                    razorpayCustomer
                );

            const razorpayOrder = await this.razorpay_.orders.create(
                razorpayOrderCreateRequest
            );

            return {
                id: paymentSessionId!,
                data: { razorpayOrder: razorpayOrder }
            };
        } catch (error) {
            this.logger.error(
                `Error creating Razorpay order: ${error.message}`,
                error
            );
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                `Failed to create Razorpay order: ${error.message}`
            );
        }
    }
    async updateRazorpayOrderMetadata(
        orderId: string,
        metadata: IMap<string | number>
    ): Promise<Orders.RazorpayOrder> {
        let orderData = await this.razorpay_.orders.fetch(orderId);
        if (!orderData) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Invoice with ID ${orderId} not found`
            );
        }
        let notes = orderData.notes;
        if (!notes) {
            notes = {
                ...metadata
            };
        } else {
            notes = {
                ...notes,
                ...metadata
            };
        }

        orderData = await this.razorpay_.orders.edit(orderId, {
            notes: {
                ...metadata
            }
        });
        return orderData;
    }
    async updateRazorpayMetadataInCustomer(
        customer: CustomerDTO,
        parameterName: string,
        parameterValue: string
    ): Promise<CustomerDTO> {
        const metadata = customer.metadata;
        let razorpay = metadata?.razorpay as Record<string, string>;
        if (razorpay) {
            razorpay[parameterName] = parameterValue;
        } else {
            razorpay = {};
            razorpay[parameterName] = parameterValue;
        }
        //
        const x = await updateRazorpayCustomerMetadataWorkflow(
            this.container_
        ).run({
            input: {
                medusa_customer_id: customer.id,
                razorpay
            }
        });
        const result = x.result.customer;

        return result;
    }
    async findOrCreateRarorpayCustomer(
        cart: Partial<CartDTO>,
        paymentSession: PaymentSessionDTO,
        customer_id?: string
    ): Promise<Customers.RazorpayCustomer> {
        let rp_customer_id: string;
        if (customer_id) {
            try {
                const customer = await this.customerService.retrieveCustomer(
                    customer_id
                );
                rp_customer_id = (
                    customer.metadata?.razorpay as Record<string, string>
                )?.rp_customer_id;
                if (rp_customer_id) {
                    return await this.razorpay_.customers.fetch(rp_customer_id);
                } else {
                    const razorpayCustomer = await this.pollAndRetrieveCustomer(
                        customer
                    );
                    if (razorpayCustomer) {
                        await this.updateRazorpayMetadataInCustomer(
                            customer,
                            "rp_customer_id",
                            razorpayCustomer.id
                        );
                        return razorpayCustomer;
                    } else {
                        return await this.createRazorpayCustomer(
                            cart,
                            paymentSession,
                            customer_id
                        );
                    }
                }
            } catch (e) {
                this.logger.error(
                    `Error retrieving customer ${customer_id}: ${e}`
                );
                throw new MedusaError(
                    MedusaErrorTypes.NOT_FOUND,
                    `Customer with id ${customer_id} not found`
                );
            }
        } else {
            const razorpayCustomer = await this.pollAndRetrieveCustomer({
                email: cart?.email,
                phone: cart?.billing_address?.phone
            });
            if (razorpayCustomer) {
                return razorpayCustomer;
            }
        }
        const rpCustomer = await this.createRazorpayCustomer(
            cart,
            paymentSession
        );
        return rpCustomer;
    }
    async createRazorpayCustomer(
        cart: Partial<CartDTO>,
        paymentSession: PaymentSessionDTO,
        customer_id?: string
    ): Promise<Customers.RazorpayCustomer> {
        const rpCustomerCreateRequest =
            this.getRazorpayCustomerCreateRequestBody(cart, customer_id);

        const razorpayCustomer = await this.razorpay_.customers.create(
            rpCustomerCreateRequest
        );
        if (customer_id) {
            const customer = await this.customerService.retrieveCustomer(
                customer_id
            );
            await this.updateRazorpayMetadataInCustomer(
                customer,
                "rp_customer_id",
                razorpayCustomer.id
            );
        }
        return razorpayCustomer;
    }
    private async pollAndRetrieveCustomer(
        customer: Partial<CustomerDTO>
    ): Promise<Customers.RazorpayCustomer> {
        let customerList: Customers.RazorpayCustomer[] = [];
        let razorpayCustomer: Customers.RazorpayCustomer;
        const count = 10;
        let skip = 0;
        do {
            customerList = (
                await this.razorpay_.customers.all({
                    count,
                    skip
                })
            )?.items;
            razorpayCustomer =
                customerList?.find(
                    (c) =>
                        c.contact == customer?.phone ||
                        c.email == customer.email
                ) ?? customerList?.[0];
            if (razorpayCustomer) {
                break;
            }
            if (!customerList || !razorpayCustomer) {
                throw new Error(
                    "no customers and cant create customers in razorpay"
                );
            }
            skip += count;
        } while (customerList?.length == 0);

        return razorpayCustomer;
    }
    getRazorpayCustomerCreateRequestBody(
        cart: Partial<CartDTO>,
        customer_id?: string
    ): Customers.RazorpayCustomerCreateRequestBody {
        const rpCustomerCreateRequest: Customers.RazorpayCustomerCreateRequestBody =
            {
                name: `${cart?.billing_address?.first_name} ${cart?.billing_address?.last_name}`,
                email: cart?.email,
                fail_existing: 0,
                gstin:
                    (cart.billing_address?.metadata?.gstin as string) ?? null,
                contact:
                    cart?.billing_address?.phone ??
                    cart?.shipping_address?.phone,
                notes: {
                    cart_id: cart?.id as string,
                    customer_id: customer_id ?? "NA"
                }
            };
        return rpCustomerCreateRequest;
    }
    async deletePayment(
        input: DeletePaymentInput
    ): Promise<DeletePaymentOutput> {
        return await this.cancelPayment(input);
    }
    async getPaymentStatus(
        input: GetPaymentStatusInput
    ): Promise<GetPaymentStatusOutput> {
        const razorpayOrder = input.data
            ?.razorpayOrder as unknown as Orders.RazorpayOrder;
        const id = razorpayOrder.id as string;

        let paymentIntent: Orders.RazorpayOrder;
        let paymentsAttempted: {
            entity: string;
            count: number;
            items: Array<Payments.RazorpayPayment>;
        };
        try {
            paymentIntent = await this.razorpay_.orders.fetch(id);
            paymentsAttempted = await this.razorpay_.orders.fetchPayments(id);
        } catch (e) {
            const orderId = (input.data as unknown as Payments.RazorpayPayment)
                .order_id as string;
            this.logger.warn(
                "received payment data from session not order data"
            );
            paymentIntent = await this.razorpay_.orders.fetch(orderId);
            paymentsAttempted = await this.razorpay_.orders.fetchPayments(
                orderId
            );
        }
        let status: PaymentSessionStatus = PaymentSessionStatus.PENDING;
        switch (paymentIntent.status) {
            // created' | 'authorized' | 'captured' | 'refunded' | 'failed'
            case "created":
                status = PaymentSessionStatus.REQUIRES_MORE;
                break;
            case "paid":
                status = PaymentSessionStatus.AUTHORIZED;
                break;

            case "attempted":
                status = await this.getRazorpayPaymentStatus(
                    paymentIntent,
                    paymentsAttempted
                );
                break;
            default:
                status = PaymentSessionStatus.PENDING;
        }
        return { status };
    }
    async getRazorpayPaymentStatus(
        paymentIntent: Orders.RazorpayOrder,
        attempts: {
            entity: string;
            count: number;
            items: Array<Payments.RazorpayPayment>;
        }
    ): Promise<PaymentSessionStatus> {
        if (!paymentIntent) {
            return PaymentSessionStatus.ERROR;
        } else {
            const authorisedAttempts = attempts.items.filter(
                (i) => i.status == PaymentSessionStatus.AUTHORIZED
            );
            const totalAuthorised = authorisedAttempts.reduce((p, c) => {
                p += parseInt(`${c.amount}`);
                return p;
            }, 0);
            return totalAuthorised == paymentIntent.amount
                ? PaymentSessionStatus.AUTHORIZED
                : PaymentSessionStatus.REQUIRES_MORE;
        }
    }
    async refundPayment(
        input: RefundPaymentInput
    ): Promise<RefundPaymentOutput> {
        const { razorpayOrder, paymentSession } =
            await this.getPaymentSessionAndOrderFromInput(input);
        const id = razorpayOrder.id as string;
        const refundAmount = parseFloat(input.amount.toString());
        const paymentList = await this.razorpay_.orders.fetchPayments(id);

        const payment_id = paymentList.items?.find((p) => {
            return (
                parseInt(`${p.amount}`) >= refundAmount * 100 &&
                (p.status == "authorized" || p.status == "captured")
            );
        })?.id;
        if (payment_id) {
            const refundRequest = {
                amount: refundAmount * 100
            };
            try {
                const razorpayRefundSession =
                    await this.razorpay_.payments.refund(
                        payment_id,
                        refundRequest
                    );
                const razorpayPayment = await this.razorpay_.payments.fetch(
                    razorpayRefundSession.payment_id
                );
                const order = await this.razorpay_.orders.fetch(
                    razorpayPayment.order_id
                );

                const result = await this.syncPaymentSession(
                    paymentSession.id,
                    order.id as string
                );

                const refundResult: RefundPaymentOutput = {
                    data: {
                        razorpayOrder: result.razorpayOrder,
                        razorpayRefundSession
                    }
                };
                return refundResult;
            } catch (e) {
                this.logger.error(
                    `Error creating Razorpay refund: ${e.message}`,
                    e
                );
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    `Failed to create Razorpay refund: ${e.message}`
                );
            }
        } else {
            return {
                data: {
                    razorpayOrder: razorpayOrder
                }
            };
        }
    }
    async retrievePayment(
        input: RetrievePaymentInput
    ): Promise<RetrievePaymentOutput> {
        const { razorpayOrder, paymentSession } =
            await this.getPaymentSessionAndOrderFromInput(input);

        return {
            data: {
                razorpayOrder: razorpayOrder
            }
        };
    }

    async updatePayment(
        input: UpdatePaymentInput
    ): Promise<UpdatePaymentOutput> {
        const { razorpayOrder, paymentSession } =
            await this.getPaymentSessionAndOrderFromInput(input);
        const invoiceData = await this.updateRazorpayOrderMetadata(
            razorpayOrder.id as string,

            {
                ...razorpayOrder.notes,
                medusa_payment_session_id:
                    ((razorpayOrder.notes as Record<string, unknown>)
                        ?.medusa_payment_session_id as string) ??
                    input?.context?.idempotency_key
            }
        );
        return {
            data: { razorpayOrder: invoiceData }
        };
    }
    async getWebhookActionAndData(
        webhookData: ProviderWebhookPayload["payload"]
    ): Promise<WebhookActionResult> {
        const webhookSignature = webhookData.headers["x-razorpay-signature"];

        const webhookSecret =
            this.options_?.webhook_secret ||
            process.env.RAZORPAY_WEBHOOK_SECRET ||
            process.env.RAZORPAY_TEST_WEBHOOK_SECRET;

        const logger = this.logger;
        const data = webhookData.data;

        logger.info(
            `Received Razorpay webhook body as object : ${JSON.stringify(
                webhookData.data
            )}`
        );
        try {
            const validationResponse = Razorpay.validateWebhookSignature(
                webhookData.rawData.toString(),
                webhookSignature as string,
                webhookSecret!
            );
            // return if validation fails
            if (!validationResponse) {
                return { action: PaymentActions.FAILED };
            }
        } catch (error) {
            logger.error(`Razorpay webhook validation failed : ${error}`);

            return { action: PaymentActions.FAILED };
        }
        const paymentData = (webhookData.data as unknown as WebhookEventData)
            .payload?.payment?.entity;
        const event = data.event;

        const order = await this.razorpay_.orders.fetch(paymentData.order_id);
        /** sometimes this even fires before the order is updated in the remote system */
        const outstanding = getAmountFromSmallestUnit(
            order.amount_paid == 0 ? paymentData.amount : order.amount_paid,
            paymentData.currency.toUpperCase()
        );

        switch (event) {
            // payment authorization is handled in checkout flow. webhook not needed

            case "payment.captured":
                return {
                    action: PaymentActions.SUCCESSFUL,
                    data: {
                        session_id: (paymentData.notes as any)
                            .session_id as string,
                        amount: outstanding
                    }
                };

            case "payment.authorized":
                return {
                    action: PaymentActions.AUTHORIZED,
                    data: {
                        session_id: (paymentData.notes as any)
                            .session_id as string,
                        amount: outstanding
                    }
                };

            case "payment.failed":
                // TODO: notify customer of failed payment

                return {
                    action: PaymentActions.FAILED,
                    data: {
                        session_id: (paymentData.notes as any)
                            .session_id as string,
                        amount: outstanding
                    }
                };
                break;

            default:
                return { action: PaymentActions.NOT_SUPPORTED };
        }
    }

   async createAccountHolder(input: CreateAccountHolderInput): Promise<CreateAccountHolderOutput> {
        const { first_name, last_name, email, phone, billing_address } = input.context.customer as PaymentCustomerDTO
         const accountHolder = await this.razorpay_.customers.create({
            name: `${first_name} ${last_name}`,
            email: email,
            contact: phone??undefined,
            gstin: billing_address?.metadata?.gstin as string,
            notes: {
                medusa_account_holder_id: "NA"
            }
            
        });
        

        return {
            data: accountHolder as unknown as Record<string, unknown>,
            id:  accountHolder.id
            
        }
    }
    async updateAccountHolder(input: UpdateAccountHolderInput): Promise<UpdateAccountHolderOutput> {
        const { id, name, email, phone:contact } = input.data as { id: string, name: string, email: string, phone: string, notes: Record<string, unknown> };
        const accountHolder = await this.razorpay_.customers.edit(id, {
            name: name,
            email: email,
            contact: contact,
        });
        return {
            data: accountHolder as unknown as Record<string, unknown>
        }
    }
    async deleteAccountHolder(input: DeleteAccountHolderInput): Promise<DeleteAccountHolderOutput> {
        const { id } = input.data as { id: string };
        const accountHolder = await this.razorpay_.customers.fetch(id);
        await this.razorpay_.customers.edit(id,{
            name:"DELETED"
        })
        return {
            data: accountHolder as unknown as Record<string, unknown>
        }
    }

       

        
}

export default RazorpayBase;
