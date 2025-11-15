import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest
} from "@jest/globals";
import { PaymentSessionStatus } from "@medusajs/framework/utils";
import type {
    AuthorizePaymentInput,
    CapturePaymentInput,
    CartDTO,
    CustomerDTO,
    GetPaymentStatusOutput,
    InitiatePaymentInput,
    InitiatePaymentOutput,
    RefundPaymentInput,
    RetrievePaymentInput,
    RetrievePaymentOutput,
    UpdatePaymentInput
} from "@medusajs/types";
import dotenv from "dotenv";
import { ErrorCodes, type RazorpayOptions } from "../../types";
import {
    authorizePaymentSuccessData,
    cancelPaymentFailData,
    cancelPaymentPartiallyFailData,
    cancelPaymentSuccessData,
    capturePaymentContextSuccessData,
    deletePaymentFailData,
    deletePaymentPartiallyFailData,
    deletePaymentSuccessData,
    initiatePaymentContextWithExistingCustomer,
    initiatePaymentContextWithExistingCustomerRazorpayId,
    PaymentIntentDataByStatus,
    refundPaymentSuccessData,
    retrievePaymentSuccessData,
    updatePaymentContextWithDifferentAmount
} from "../__fixtures__/data";
import { RazorpayTest } from "../__fixtures__/razorpay-test";
import {
    isMocksEnabled,
    RAZORPAY_ID,
    RazorpayMock
} from "../__mocks__/razorpay";

let config: RazorpayOptions = {
    key_id: "test",
    key_secret: "test",
    razorpay_account: "test",
    automatic_expiry_period: 30,
    manual_expiry_period: 20,
    refund_speed: "normal",
    webhook_secret: "test",
    auto_capture: false
};
if (!isMocksEnabled()) {
    dotenv.config();
}
const container = {
    logger: {
        error: console.error,
        info: console.info,
        warn: console.warn,
        debug: console.log
    },
    cartService: {
        retrieve(): CartDTO {
            return {
                id: "test-cart",
                billing_address: { phone: "12345" }
            } as CartDTO;
        }
    },
    customerService: {
        retrieve: (id: string): Partial<CustomerDTO> => {
            return {
                id
            };
        },
        update: (id: string, data: Partial<CustomerDTO>): CustomerDTO => {
            const customer: CustomerDTO = {
                id,
                ...data
            } as CustomerDTO;
            return customer;
        }
    }
};

config = {
    ...config,
    key_id: process.env.RAZORPAY_ID!,
    key_secret: process.env.RAZORPAY_SECRET!,
    razorpay_account: process.env.RAZORPAY_ACCOUNT!
};
let testPaymentSession: InitiatePaymentOutput | undefined;
let razorpayTest: RazorpayTest;
describe("RazorpayTest", () => {
    describe("getPaymentStatus", () => {
        beforeAll(async () => {
            if (!isMocksEnabled()) {
                jest.requireActual("razorpay");
            }

            const scopedContainer = { ...container };
            razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        if (isMocksEnabled()) {
            it("should return the correct status", async () => {
                let status: GetPaymentStatusOutput;

                status = await razorpayTest.getPaymentStatus({
                    data: { id: PaymentIntentDataByStatus.CREATED.id }
                });
                expect(status.status).toBe(PaymentSessionStatus.PENDING);

                status = await razorpayTest.getPaymentStatus({
                    data: { id: PaymentIntentDataByStatus.CREATED.id }
                });
                expect(status.status).toBe(PaymentSessionStatus.PENDING);

                expect(status.status).toBe(PaymentSessionStatus.PENDING);

                status = await razorpayTest.getPaymentStatus({
                    data: { id: PaymentIntentDataByStatus.ATTEMPTED.id }
                });
                expect(status.status).toBe(PaymentSessionStatus.AUTHORIZED);

                status = await razorpayTest.getPaymentStatus({
                    data: { id: "unknown-id" }
                });
                expect(status).toBe(PaymentSessionStatus.PENDING);
            });
        } else {
            it("should return the correct status", async () => {
                const result = await razorpayTest.initiatePayment(
                    initiatePaymentContextWithExistingCustomer as InitiatePaymentInput
                );

                const status = await razorpayTest.getPaymentStatus(result);
                expect(status.status).toBe(PaymentSessionStatus.REQUIRES_MORE);
            });
        }
    });

    describe("initiatePayment", () => {
        let razorpayTest: RazorpayTest;

        beforeAll(async () => {
            const scopedContainer = { ...container };
            razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should succeed with an existing customer but no razorpay id", async () => {
            const result = await razorpayTest.initiatePayment(
                initiatePaymentContextWithExistingCustomer as InitiatePaymentInput
            );

            if (isMocksEnabled()) {
                expect(RazorpayMock.orders.create).toHaveBeenCalled();

                /* expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
        email: initiatePaymentContextWithExistingCustomer.email,
        name: "test, customer",
      });*/

                expect(RazorpayMock.orders.create).toHaveBeenCalled();
                /* expect(RazorpayMock.orders.create).toHaveBeenCalledWith(
          expect.objectContaining({
            description: undefined,
            amount: initiatePaymentContextWithExistingCustomer.amount,
            currency: initiatePaymentContextWithExistingCustomer.currency_code,
            notes: {
              resource_id:
                initiatePaymentContextWithExistingCustomer.resource_id,
            },
            capture_method: "manual",
          })
        );*/
            }

            expect(result).toEqual(
                expect.objectContaining({
                    session_data: expect.any(Object),
                    update_requests: {
                        customer_metadata: {
                            razorpay_id: isMocksEnabled()
                                ? RAZORPAY_ID
                                : expect.stringContaining("cus")
                        }
                    }
                })
            );
        });

        it("should succeed with an existing customer with an existing razorpay id", async () => {
            const result = await razorpayTest.initiatePayment(
                initiatePaymentContextWithExistingCustomerRazorpayId as InitiatePaymentInput
            );
            if (isMocksEnabled()) {
                expect(RazorpayMock.customers.create).not.toHaveBeenCalled();

                expect(RazorpayMock.orders.create).toHaveBeenCalled();
                /* expect(RazorpayMock.orders.create).toMatchObject({
          description: undefined,
          amount: initiatePaymentContextWithExistingCustomer.amount,
          currency: initiatePaymentContextWithExistingCustomer.currency_code,
          notes: {
            resource_id: initiatePaymentContextWithExistingCustomer.resource_id,
          },
          capture_method: "manual",
        });*/
            }
            expect(result).toMatchObject(
                !isMocksEnabled()
                    ? {
                          session_data: expect.any(Object),
                          update_requests: expect.any(Object)
                      }
                    : {
                          session_data: expect.any(Object)
                      }
            );
            if (!isMocksEnabled()) {
                expect((result as InitiatePaymentOutput).id).toBeDefined();
            }
        });

        /* it("should fail on customer creation", async () => {
      /const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithWrongEmail as any
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();
        expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
          email: initiatePaymentContextWithWrongEmail.email,
        });

        expect(RazorpayMock.orders.create).not.toHaveBeenCalled();
      }
      expect(result).toEqual({
        error:
          "An error occurred in initiatePayment when creating a Razorpay customer",
        code: "",
        detail: "Error",
      });
    });*/

        /* it("should fail on payment intents creation", async () => {
      const result = await razorpayTest.initiatePayment(
        initiatePaymentContextWithFailIntentCreation as any
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();
        expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
          email: initiatePaymentContextWithFailIntentCreation.email,
        });

        expect(RazorpayMock.orders.create).toHaveBeenCalled();
        expect(RazorpayMock.orders.create).toHaveBeenCalledWith(
          expect.objectContaining({
            description:
              initiatePaymentContextWithFailIntentCreation.context
                .payment_description,
            amount: initiatePaymentContextWithFailIntentCreation.amount,
            currency:
              initiatePaymentContextWithFailIntentCreation.currency_code,
            notes: {
              resource_id:
                initiatePaymentContextWithFailIntentCreation.resource_id,
            },
            capture_method: "manual",
          })
        );
      }

      expect(result).toEqual({
        error:
          "An error occurred in InitiatePayment during the creation of the razorpay payment intent",
        code: "",
        detail: "Error",
      });
    });*/
    });

    describe("authorizePayment", () => {
        let razorpayTest: RazorpayTest;

        beforeAll(async () => {
            const scopedContainer = { ...container };
            razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should succeed", async () => {
            if (!isMocksEnabled()) {
                testPaymentSession = await razorpayTest.initiatePayment(
                    initiatePaymentContextWithExistingCustomer as InitiatePaymentInput
                );
            }
            const result = await razorpayTest.authorizePayment(
                isMocksEnabled()
                    ? (authorizePaymentSuccessData as AuthorizePaymentInput)
                    : ({
                          data: testPaymentSession?.data
                      } as AuthorizePaymentInput)
            );

            expect(result).toMatchObject({
                data: isMocksEnabled()
                    ? authorizePaymentSuccessData
                    : {
                          id: expect.stringContaining("order_")
                      },
                status: isMocksEnabled()
                    ? PaymentSessionStatus.AUTHORIZED
                    : PaymentSessionStatus.REQUIRES_MORE
            });
        });
    });

    describe("cancelPayment", () => {
        beforeAll(async () => {
            const scopedContainer = { ...container };
            razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should succeed", async () => {
            const result = await razorpayTest.cancelPayment({
                data: cancelPaymentSuccessData
            });

            expect(result).toEqual({
                code: ErrorCodes.UNSUPPORTED_OPERATION,
                error: "Unable to cancel as razorpay doesn't support cancellation"
            });
        });

        it("should fail on intent cancellation but still return the intent", async () => {
            const result = await razorpayTest.cancelPayment({
                data: cancelPaymentPartiallyFailData
            });

            expect(result).toEqual({
                code: ErrorCodes.UNSUPPORTED_OPERATION,
                error: "Unable to cancel as razorpay doesn't support cancellation"
            });
        });

        it("should fail on intent cancellation", async () => {
            const result = await razorpayTest.cancelPayment({
                data: cancelPaymentFailData
            });

            /* expect(result).toEqual({
        error: "An error occurred in cancelPayment",
        code: "",
        detail: "Error",
      });*/
            expect(result).toEqual({
                code: ErrorCodes.UNSUPPORTED_OPERATION,
                error: "Unable to cancel as razorpay doesn't support cancellation"
            });
        });
    });

    describe("capturePayment", () => {
        beforeAll(async () => {
            const scopedContainer = { ...container };
            razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should succeed", async () => {
            const result = await razorpayTest.capturePayment(
                isMocksEnabled()
                    ? (capturePaymentContextSuccessData.paymentSessionData as CapturePaymentInput)
                    : ({
                          data: testPaymentSession?.data
                      } as CapturePaymentInput)
            );

            if (isMocksEnabled()) {
                expect(result).toEqual({
                    id: PaymentIntentDataByStatus.ATTEMPTED.id
                });
            } else {
                expect(result).toMatchObject({
                    payments: expect.any(Object)
                });
            }
        });

        /* it("should fail on intent capture but still return the intent", async () => {
      const result = await razorpayTest.capturePayment(
        capturePaymentContextPartiallyFailData.paymentSessionData
      );

      expect(result).toEqual({
        id: PARTIALLY_FAIL_INTENT_ID,
        status: ErrorIntentStatus.SUCCEEDED,
      });
    });

    it("should fail on intent capture", async () => {
      const result = await razorpayTest.capturePayment(
        capturePaymentContextFailData.paymentSessionData
      );

      expect(result).toEqual({
        error: "An error occurred in capturePayment",
        code: "",
        detail: "Error",
      });
    });*/
    });

    describe("deletePayment", () => {
        beforeAll(async () => {
            const scopedContainer = { ...container };
            razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should succeed", async () => {
            const result = await razorpayTest.cancelPayment({
                data: deletePaymentSuccessData
            });

            expect(result).toEqual({
                code: "payment_intent_operation_unsupported",
                error: "Unable to cancel as razorpay doesn't support cancellation"
            });
        });

        it("should fail on intent cancellation but still return the intent", async () => {
            const result = await razorpayTest.cancelPayment({
                data: deletePaymentPartiallyFailData
            });

            expect(result).toEqual({
                code: "payment_intent_operation_unsupported",
                error: "Unable to cancel as razorpay doesn't support cancellation"
            });
        });

        it("should fail on intent cancellation", async () => {
            const result = await razorpayTest.cancelPayment({
                data: deletePaymentFailData
            });

            expect(result).toEqual({
                code: "payment_intent_operation_unsupported",
                error: "Unable to cancel as razorpay doesn't support cancellation"
            });
        });
    });

    describe("refundPayment", () => {
        beforeAll(async () => {
            const scopedContainer = { ...container };
            razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should succeed", async () => {
            const result = await razorpayTest.refundPayment(
                isMocksEnabled()
                    ? ({
                          data: refundPaymentSuccessData,
                          amount: 500
                      } as RefundPaymentInput)
                    : ({
                          data: testPaymentSession?.data,
                          amount: 500
                      } as RefundPaymentInput)
            );
            if (isMocksEnabled()) {
                expect(result).toMatchObject({
                    sessionid: PaymentIntentDataByStatus.ATTEMPTED.id
                });
            } else {
                expect(result).toMatchObject({
                    payments: expect.any(Object)
                });
            }
        });

        /* it("should fail on refund creation", async () => {
      const result = await razorpayTest.refundPayment(
        isMocksEnabled() ? refundPaymentFailData : testPaymentSession,
        refundAmount
      );

      expect(result).toEqual({
        error: "An error occurred in refundPayment",
        code: "",
        detail: "Error",
      });
    }); */
    });

    describe("retrievePayment", () => {
        beforeAll(async () => {
            const scopedContainer = { ...container };
            razorpayTest = new RazorpayTest(scopedContainer, config);
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("should retrieve", async () => {
            const result = await razorpayTest.retrievePayment(
                isMocksEnabled()
                    ? (retrievePaymentSuccessData as RetrievePaymentInput)
                    : ({
                          data: testPaymentSession?.data
                      } as RetrievePaymentInput)
            );
            if (isMocksEnabled()) {
                expect(result).toMatchObject({
                    status: "attempted"
                });
            } else {
                const retrieveResult = result as RetrievePaymentOutput;
                expect(retrieveResult.data?.id).toBeDefined();
                expect(retrieveResult.data?.id).toMatch("order_");
            }
        });

        /* it("should fail on refund creation", async () => {
      const result = await razorpayTest.retrievePayment(
        retrievePaymentFailData
      );

      expect(result).toEqual({
        error: "An error occurred in retrievePayment",
        code: "",
        detail: "Error",
      });
    });*/
    });

    if (!isMocksEnabled()) {
        describe("updatePayment", () => {
            if (!isMocksEnabled()) {
                beforeAll(async () => {
                    const scopedContainer = { ...container };
                    razorpayTest = new RazorpayTest(scopedContainer, config);
                });

                beforeEach(() => {
                    jest.clearAllMocks();
                });
            }

            /* it("should succeed to initiate a payment with an existing customer but no razorpay id", async () => {
      const paymentContext: PaymentProcessorContext = {
        email: updatePaymentContextWithDifferentAmount.email,
        currency_code: updatePaymentContextWithDifferentAmount.currency_code,
        amount: updatePaymentContextWithDifferentAmount.amount,
        resource_id: updatePaymentContextWithDifferentAmount.resource_id,
        context: updatePaymentContextWithDifferentAmount.context,
        paymentSessionData: testPaymentSession.session_data,
      };
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithExistingCustomer as any
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();
        expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
          email: updatePaymentContextWithExistingCustomer.email,
        });

        expect(RazorpayMock.orders.create).toHaveBeenCalled();
        expect(RazorpayMock.orders.create).toHaveBeenCalledWith(
          expect.objectContaining({
            description: undefined,
            amount: updatePaymentContextWithExistingCustomer.amount,
            currency: updatePaymentContextWithExistingCustomer.currency_code,
            notes: {
              resource_id: updatePaymentContextWithExistingCustomer.resource_id,
            },
            capture_method: "manual",
          })
        );
      }

      expect(result).toMatchObject({
        session_data: { id: expect.stringMatching("order") },
        update_requests: {
          customer_metadata: {
            razorpay_id: isMocksEnabled()
              ? RAZORPAY_ID
              : expect.stringMatching("cus"),
          },
        },
      });
    }, 60e6); */

            /* it("should fail to initiate a payment with an existing customer but no razorpay id", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithWrongEmail
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.customers.create).toHaveBeenCalled();
        expect(RazorpayMock.customers.create).toHaveBeenCalledWith({
          email: updatePaymentContextWithWrongEmail.email,
        });

        expect(RazorpayMock.orders.create).not.toHaveBeenCalled();
      }
      expect(result).toEqual({
        error:
          "An error occurred in updatePayment during the initiate of the new payment for the new customer",
        code: "",
        detail:
          "An error occurred in initiatePayment when creating a Razorpay customer" +
          EOL +
          "Error",
      });
    });

    it("should succeed but no update occurs when the amount did not changed", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextWithExistingCustomerRazorpayId
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.orders.edit).not.toHaveBeenCalled();
      }
      expect(result).not.toBeDefined();
    });
    */
            if (!isMocksEnabled()) {
                it("should succeed to update the intent with the new amount", async () => {
                    const paymentContext: UpdatePaymentInput = {
                        currency_code:
                            updatePaymentContextWithDifferentAmount.currency_code,
                        amount: updatePaymentContextWithDifferentAmount.amount,

                        context: {
                            customer: {
                                email: updatePaymentContextWithDifferentAmount.email,
                                id: updatePaymentContextWithDifferentAmount.customer_id
                            }
                            // extra: {
                            //     resource_id:
                            //         updatePaymentContextWithDifferentAmount.resource_id,
                            //     context:
                            //         updatePaymentContextWithDifferentAmount.context,
                            //     paymentSessionData: isMocksEnabled()
                            //         ? updatePaymentContextWithDifferentAmount.paymentSessionData
                            //         : testPaymentSession.session_data
                            // }
                        }
                    };
                    const result = await razorpayTest.updatePayment(
                        isMocksEnabled()
                            ? (updatePaymentContextWithDifferentAmount as UpdatePaymentInput)
                            : paymentContext
                    );
                    if (isMocksEnabled()) {
                        expect(1).toBe(1);
                        console.log("test not valid in mocked mode");
                        // expect(RazorpayMock.orders.edit).toHaveBeenCalled();
                        /* expect(RazorpayMock.orders.edit).toHaveBeenCalledWith(
          updatePaymentContextWithDifferentAmount.paymentSessionData.id,
          {
            amount: updatePaymentContextWithDifferentAmount.amount,
          }
        );*/
                    }
                    expect(result).toMatchObject({
                        session_data: {
                            amount: updatePaymentContextWithDifferentAmount.amount
                        }
                    });
                }, 60e6);
            }

            /* it("should fail to update the intent with the new amount", async () => {
      const result = await razorpayTest.updatePayment(
        updatePaymentContextFailWithDifferentAmount
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.orders.edit).toHaveBeenCalled();
        expect(RazorpayMock.orders.edit).toHaveBeenCalledWith(
          updatePaymentContextFailWithDifferentAmount.paymentSessionData.id,
          {
            amount: updatePaymentContextFailWithDifferentAmount.amount,
          }
        );
      }
      expect(result).toEqual({
        error: "An error occurred in updatePayment",
        code: "",
        detail: "Error",
      });
    });*/
        });
    }

    // describe("updatePaymentData", function () {
    //     beforeAll(async () => {
    //         const scopedContainer = { ...container };
    //         razorpayTest = new RazorpayTest(scopedContainer, config);
    //     });

    //     beforeEach(() => {
    //         jest.clearAllMocks();
    //     });

    //     it("should fail to update the payment data", async () => {
    //         const data = isMocksEnabled()
    //             ? { data: updatePaymentDataWithoutAmountDataNoNotes }
    //             : { ...updatePaymentDataWithoutAmountDataNoNotes };

    //         await razorpayTest.updatePaymentData(
    //             isMocksEnabled()
    //                 ? updatePaymentDataWithoutAmountData.sessionId
    //                 : (testPaymentSession.id as any),
    //             {
    //                 ...data,
    //                 sessionId: isMocksEnabled()
    //                     ? undefined
    //                     : testPaymentSession.id
    //             }
    //         );
    //         if (isMocksEnabled()) {
    //             expect(RazorpayMock.orders.edit).toHaveBeenCalledTimes(0);
    //         }
    //     }, 60e6);

    //     it("should succeed to update the payment data", async () => {
    //         const data = isMocksEnabled()
    //             ? {
    //                   data: {
    //                       ...updatePaymentDataWithoutAmountData,
    //                       notes: { updated: true }
    //                   }
    //               }
    //             : { ...updatePaymentDataWithoutAmountData };

    //         await razorpayTest.updatePaymentData(
    //             isMocksEnabled()
    //                 ? updatePaymentDataWithoutAmountData.sessionId
    //                 : (testPaymentSession.id as any),
    //             {
    //                 ...data,
    //                 sessionId: isMocksEnabled()
    //                     ? undefined
    //                     : testPaymentSession.id
    //             }
    //         );
    //         if (isMocksEnabled()) {
    //             expect(RazorpayMock.orders.edit).toHaveBeenCalled();
    //         }
    //     }, 60e6);

    /* it("should fail to update the payment data if the amount is present", async () => {
      const result = await razorpayTest.updatePaymentData(
        updatePaymentDataWithAmountData.sessionId,
        { ...updatePaymentDataWithAmountData, sessionId: undefined }
      );
      if (isMocksEnabled()) {
        expect(RazorpayMock.orders.edit).not.toHaveBeenCalled();
      }
      expect(result).toEqual({
        error: "An error occurred in updatePaymentData",
        code: undefined,
        detail: "Cannot update amount, use updatePayment instead",
      });
    });*/
    //    });
});
