import { PaymentIntentDataByStatus } from "../__fixtures__/data";
import Razorpay from "razorpay";
import { ErrorCodes, ErrorIntentStatus } from "../../types";
import { jest } from "@jest/globals";
export const WRONG_CUSTOMER_EMAIL = "wrong@test.fr";
export const EXISTING_CUSTOMER_EMAIL = "right@test.fr";
export const PARTIALLY_FAIL_INTENT_ID = "partially_unknown";
export const FAIL_INTENT_ID = "unknown";
import { Customers } from "razorpay/dist/types/customers";
import { Orders } from "razorpay/dist/types/orders";
import { Payments } from "razorpay/dist/types/payments";
import { Refunds } from "razorpay/dist/types/refunds";
import dotenv from "dotenv";

dotenv.config();

const mockEnabled = process.env.DISABLE_MOCKS == "true" ? false : true;

export function isMocksEnabled(): boolean {
    if (mockEnabled) {
        console.log("using mocks");
    }
    return mockEnabled;
}
export const RAZORPAY_ID = isMocksEnabled() ? "test" : process.env.RAZORPAY_ID;

export const RazorpayMock = {
    orders: {
        fetch: jest
            .fn()
            .mockImplementation(
                async (orderId: unknown): Promise<Orders.RazorpayOrder> => {
                    if (orderId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    return (Object.values(PaymentIntentDataByStatus).find(
                        (value) => {
                            return value.id === orderId;
                        }
                    ) ?? {}) as Orders.RazorpayOrder;
                }
            ),
        fetchPayments: jest
            .fn()
            .mockImplementation(
                async (
                    orderId: unknown
                ): Promise<{ items: Array<Payments.RazorpayPayment> }> => {
                    if (orderId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    const orderData = Object.values(
                        PaymentIntentDataByStatus
                    ).find((value) => {
                        return value.id === orderId;
                    });

                    return {
                        items: orderData
                            ? [orderData as Payments.RazorpayPayment]
                            : []
                    };
                }
            ),
        edit: jest
            .fn()
            .mockImplementation(
                async (
                    orderId: unknown,
                    updateData: unknown
                ): Promise<Orders.RazorpayOrder> => {
                    if (orderId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    const data =
                        Object.values(PaymentIntentDataByStatus).find(
                            (value) => {
                                return value.id === orderId;
                            }
                        ) ?? {};

                    return {
                        ...data,
                        ...(updateData as Record<string, unknown>)
                    } as Orders.RazorpayOrder;
                }
            ),
        create: jest
            .fn()
            .mockImplementation(
                async (data: unknown): Promise<Orders.RazorpayOrder> => {
                    const requestData =
                        data as Orders.RazorpayOrderCreateRequestBody & {
                            description?: string;
                        };
                    if (requestData.description === "fail") {
                        throw new Error("Error");
                    }

                    return requestData as Orders.RazorpayOrder;
                }
            )
    },

    payments: {
        fetch: jest
            .fn()
            .mockImplementation(
                async (
                    paymentId: unknown
                ): Promise<Payments.RazorpayPayment> => {
                    if (paymentId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    return (Object.values(PaymentIntentDataByStatus).find(
                        (value) => {
                            return value.id === paymentId;
                        }
                    ) ?? {}) as Payments.RazorpayPayment;
                }
            ),
        edit: jest
            .fn()
            .mockImplementation(
                async (
                    paymentId: unknown,
                    updateData: unknown
                ): Promise<Payments.RazorpayPayment> => {
                    if (paymentId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    const data =
                        Object.values(PaymentIntentDataByStatus).find(
                            (value) => {
                                return value.id === paymentId;
                            }
                        ) ?? {};

                    return {
                        ...data,
                        ...(updateData as Record<string, unknown>)
                    } as Payments.RazorpayPayment;
                }
            ),
        create: jest
            .fn()
            .mockImplementation(
                async (data: unknown): Promise<Payments.RazorpayPayment> => {
                    const requestData =
                        data as Payments.RazorpayPaymentCreateRequestBody & {
                            description?: string;
                        };
                    if (requestData.description === "fail") {
                        throw new Error("Error");
                    }

                    return requestData as Payments.RazorpayPayment;
                }
            ),
        cancel: jest
            .fn()
            .mockImplementation(
                async (
                    paymentId: unknown
                ): Promise<Payments.RazorpayPayment> => {
                    if (paymentId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    if (paymentId === PARTIALLY_FAIL_INTENT_ID) {
                        throw new Error(
                            JSON.stringify({
                                code: ErrorCodes.PAYMENT_INTENT_UNEXPECTED_STATE,
                                payment_intent: {
                                    id: paymentId,
                                    status: ErrorIntentStatus.CANCELED
                                },
                                type: "invalid_request_error"
                            })
                        );
                    }

                    return { id: paymentId } as Payments.RazorpayPayment;
                }
            ),
        capture: jest
            .fn()
            .mockImplementation(
                async (
                    paymentId: unknown,
                    amount: unknown,
                    currency: unknown
                ): Promise<Payments.RazorpayPayment> => {
                    if (paymentId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    if (paymentId === PARTIALLY_FAIL_INTENT_ID) {
                        throw new Error(
                            JSON.stringify({
                                code: ErrorCodes.PAYMENT_INTENT_UNEXPECTED_STATE,
                                payment_intent: {
                                    id: paymentId,
                                    status: ErrorIntentStatus.SUCCEEDED
                                },
                                type: "invalid_request_error"
                            })
                        );
                    }

                    return {
                        id: paymentId,
                        amount: amount as number,
                        currency: currency as string
                    } as Payments.RazorpayPayment;
                }
            ),
        refund: jest
            .fn()
            .mockImplementation(
                async (paymentId: unknown): Promise<Refunds.RazorpayRefund> => {
                    if (paymentId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    return {
                        id: paymentId as string,
                        payment_id: paymentId as string
                    } as Refunds.RazorpayRefund;
                }
            )
    },
    refunds: {
        fetch: jest
            .fn()
            .mockImplementation(
                async (refundId: unknown): Promise<Refunds.RazorpayRefund> => {
                    if (refundId === FAIL_INTENT_ID) {
                        throw new Error("Error");
                    }

                    return (Object.values(PaymentIntentDataByStatus).find(
                        (value) => {
                            return value.id === refundId;
                        }
                    ) ?? {}) as Refunds.RazorpayRefund;
                }
            )
    },
    customers: {
        create: jest
            .fn()
            .mockImplementation(
                async (data: unknown): Promise<Customers.RazorpayCustomer> => {
                    const requestData =
                        data as Customers.RazorpayCustomerCreateRequestBody;
                    if (requestData.email === EXISTING_CUSTOMER_EMAIL) {
                        return {
                            id: RAZORPAY_ID,
                            ...requestData
                        } as Customers.RazorpayCustomer;
                    }

                    throw new Error("Error");
                }
            ),
        fetch: jest
            .fn()
            .mockImplementation(
                async (
                    customerId: unknown
                ): Promise<Customers.RazorpayCustomer> => {
                    const customer: Customers.RazorpayCustomer = {
                        id: customerId as string,
                        entity: "customer",
                        created_at: 0,
                        name: "test customer",
                        email: EXISTING_CUSTOMER_EMAIL,
                        contact: "9876543210"
                    };
                    return Promise.resolve(customer);
                }
            ),
        edit: jest
            .fn()
            .mockImplementation(
                async (
                    id: unknown,
                    data: unknown
                ): Promise<Customers.RazorpayCustomer> => {
                    const updateData =
                        data as Customers.RazorpayCustomerUpdateRequestBody;
                    const customer: Customers.RazorpayCustomer = {
                        id: id as string,
                        entity: "customer",
                        created_at: 0,
                        name: updateData.name ?? "test customer",
                        email: updateData.email ?? EXISTING_CUSTOMER_EMAIL,
                        contact: updateData.contact ?? "9876543210"
                    };
                    return Promise.resolve(customer);
                }
            )
    }
};

const razorpay = isMocksEnabled() ? jest.fn(() => RazorpayMock) : Razorpay;

export default razorpay;
