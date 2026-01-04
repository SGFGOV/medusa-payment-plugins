import { placeOrder } from "@lib/data/cart";
import type { HttpTypes } from "@medusajs/types";
import { Button } from "@medusajs/ui";
import Spinner from "@modules/common/icons/spinner";
import React, { useCallback, useEffect, useState } from "react";
import { type RazorpayOrderOptions, useRazorpay } from "react-razorpay";
import type { CurrencyCode } from "react-razorpay/dist/constants/currency";
export const RazorpayPaymentButton = ({
    session,
    notReady,
    cart
}: {
    session: HttpTypes.StorePaymentSession;
    notReady: boolean;
    cart: HttpTypes.StoreCart;
}) => {
  const [disabled, setDisabled] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const {Razorpay
   } = useRazorpay();

  const [orderData,setOrderData] = useState({razorpayOrder:{id:""}})


  console.log(`session_data: `+JSON.stringify(session))
  const onPaymentCompleted = async () => {
    await placeOrder().catch(() => {
      setErrorMessage("An error occurred, please try again.")
      setSubmitting(false)
    })
  }
  useEffect(()=>{
    setOrderData(session.data as {razorpayOrder:{id:string}})
  },[session.data])



    const handlePayment = useCallback(async () => {
        const onPaymentCancelled = async () => {
            setErrorMessage("PaymentCancelled");
            setSubmitting(false);
        };

  const handlePayment = useCallback(async() => {
    const onPaymentCancelled = async () => {
        setErrorMessage("PaymentCancelled")
        setSubmitting(false)
      }

    const options: RazorpayOrderOptions = {
      key:process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID??process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID??"your_key_id",
      callback_url: `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/razorpay/hooks`,
      amount: session.amount*100*100,
      order_id: orderData.razorpayOrder.id,
      currency: cart.currency_code.toUpperCase() as CurrencyCode,
      name: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "your company name ",
      description: `Order number ${orderData.razorpayOrder.id}`,
      remember_customer:true,


      image: "https://example.com/your_logo",
      modal: {
        backdropclose: true,
        escape: true,
        handleback: true,
        confirm_close: true,
        ondismiss: async () => {
          setSubmitting(false)
          setErrorMessage(`payment cancelled`)
          await onPaymentCancelled()
        },
        animation: true,
      },

      handler: async () => {
        onPaymentCompleted()
      },
      "prefill": {
        "name": cart.billing_address?.first_name + " " + cart?.billing_address?.last_name,
        "email": cart?.email,
        "contact": (cart?.shipping_address?.phone) ?? undefined
      },


    };
    console.log(JSON.stringify(options.amount))
    //await waitForPaymentCompletion();


    const razorpay = new Razorpay(options);
    if(orderData.razorpayOrder.id)
    razorpay.open();
    razorpay.on("payment.failed", function (response: any) {
      setErrorMessage(JSON.stringify(response.error))

    })
   razorpay.on("payment.authorized" as any, function (response: any) {
    const authorizedCart = placeOrder().then(authorizedCart=>{
    JSON.stringify(`authorized:`+ authorizedCart)
    })
    })
    // razorpay.on("payment.captured", function (response: any) {

    // }
    // )
  }, [Razorpay, cart.billing_address?.first_name,
    cart.billing_address?.last_name, cart.currency_code,
     cart?.email, cart?.shipping_address?.phone, orderData.razorpayOrder.id,
     session.amount, session.provider_id]);
  console.log("orderData"+JSON.stringify(orderData))
  return (
    <>
      <Button
        data-testid="complete-checkout-button"
        disabled={submitting || notReady || !orderData?.razorpayOrder?.id||orderData?.razorpayOrder?.id == ''}
        onClick={()=>{
          console.log(`processing order id: ${orderData.razorpayOrder.id}`)
          handlePayment()}
        }
      >
        {submitting ? <Spinner /> : "Checkout"}
      </Button>
      {errorMessage && (
        <div className="text-red-500 text-small-regular mt-2">
          {errorMessage}
        </div>
      )}
    </>
  )
}
