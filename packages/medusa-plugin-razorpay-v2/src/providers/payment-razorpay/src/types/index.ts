import { Orders } from "razorpay/dist/types/orders";

export interface Options {
    key_id: string;
    key_secret: string;
    razorpay_account: string;
    automatic_expiry_period: number;
    manual_expiry_period: number;
    refund_speed: "normal" | "optimum";
    webhook_secret: string;
    auto_capture: boolean;
}

export interface RazorpayOptions extends Options {
    automatic_expiry_period: number;
    manual_expiry_period: number;
    refund_speed: "normal" | "optimum";

    /**
     * set `automatic_payment_methods` to `{ enabled: true }`
     */
    automatic_payment_methods?: boolean;
    /**
     * Set a default description on the intent if the context does not provide one
     */
    payment_description?: string;
}

export interface PaymentIntentOptions
    extends Orders.RazorpayOrderCreateRequestBody {
    capture_method?: "automatic" | "manual";
    setup_future_usage?: "on_session" | "off_session";
    payment_method_types?: string[];
}

export const ErrorCodes = {
    PAYMENT_INTENT_UNEXPECTED_STATE: "payment_intent_unexpected_state",
    UNSUPPORTED_OPERATION: "payment_intent_operation_unsupported"
};

export const ErrorIntentStatus = {
    SUCCEEDED: "succeeded",
    CANCELED: "canceled"
};

export const PaymentProviderKeys = {
    RAZORPAY: "razorpay"
};

export interface RazorpayProviderConfig {
    providers: Provider[];
    database: Database;
}

export interface Provider {
    resolve: string;
    id: string;
    options: Options;
}

export interface Database {
    clientUrl: string;
    schema: string;
    driverOptions: DriverOptions;
    debug: boolean;
    connection: string;
}

export interface DriverOptions {
    connection: Connection;
}

export interface Connection {
    ssl: boolean;
}

export interface WebhookEventData {
    entity: string;
    account_id: string;
    event: string;
    contains: string[];
    payload: Payload;
    created_at: number;
}

export interface Payload {
    payment: Payment;
}

export interface Payment {
    entity: Entity;
}

export interface Entity {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    order_id: string;
    invoice_id: any;
    international: boolean;
    method: string;
    amount_refunded: number;
    refund_status: any;
    captured: boolean;
    description: string;
    card_id: any;
    bank: any;
    wallet: any;
    vpa: string;
    email: string;
    contact: string;
    notes: Notes;
    fee: any;
    tax: any;
    error_code: any;
    error_description: any;
    error_source: any;
    error_step: any;
    error_reason: any;
    acquirer_data: AcquirerData;
    created_at: number;
    upi: Upi;
}

export interface Notes {
    session_id: string;
    resource_id: string;
}

export interface AcquirerData {
    rrn: string;
    upi_transaction_id: string;
}

export interface Upi {
    vpa: string;
}
