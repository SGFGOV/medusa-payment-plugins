# Payment-Razorpay

# Support the Payment-Razorpay Provider - Elevate Our Medusa Community!

Dear Developers and E-commerce Enthusiasts,

Are you ready to revolutionize the world of online stores with MedusaJS? We have an exciting opportunity that will make payment processing a breeze for our beloved Medusa platform! Introducing the Payment-Razorpay provider, a community-driven project that brings the immensely popular [RAZORPAY](https://razorpay.com) payment gateway to our MedusaJS commerce stack.

**What's in it for You:**

🚀 Streamline Payment Processing: With Payment-Razorpay, you can unleash the full potential of Razorpay's features, ensuring seamless and secure payments for your customers.

🌐 Global Reach: Engage with customers worldwide, as Razorpay supports various currencies and payment methods, catering to a diverse audience.

🎉 Elevate Your Medusa Store: By sponsoring this provider, you empower the entire Medusa community, driving innovation and success across the platform.

## Installation Made Simple

No hassle, no fuss! Install Payment-Razorpay effortlessly with npm:



[RAZORPAY](https://razorpay.com) an immensely popular payment gateway with a host of features. 
This provider enables the razorpay payment interface on [medusa](https://medusajs.com) commerce stack

## Installation

Use the package manager npm to install Payment-Razorpay.

```bash
npm install @sgftech/payment-razorpay
```

## Usage


Register for a razorpay account and generate the api keys
In your environment file (.env) you need to define 
```
RAZORPAY_ID=<your api key>
RAZORPAY_SECRET=<your api key secret>
RAZORPAY_ACCOUNT=<your razorpay account number/merchant id>
RAZORPAY_WEBHOOK_SECRET=<your web hook secret as defined in the webhook settings in the razorpay dashboard >
```
You need to add the provider into your medusa-config.ts as shown below

```
module.exports = defineConfig({
modules: [
  ...
    {      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          ...
          {
            resolve: "@sgftech/payment-razorpay",
            id: "razorpay",
            options: {
              key_id:
                  process?.env?.RAZORPAY_TEST_KEY_ID ??
                  process?.env?.RAZORPAY_ID,
              key_secret:
                  process?.env?.RAZORPAY_TEST_KEY_SECRET ??
                  process?.env?.RAZORPAY_SECRET,
              razorpay_account:
                  process?.env?.RAZORPAY_TEST_ACCOUNT ??
                  process?.env?.RAZORPAY_ACCOUNT,
              automatic_expiry_period: 30 /* any value between 12minuts and 30 days expressed in minutes*/,
              manual_expiry_period: 20,
              refund_speed: "normal",
              webhook_secret:
                  process?.env?.RAZORPAY_TEST_WEBHOOK_SECRET ??
                  process?.env?.RAZORPAY_WEBHOOK_SECRET
          }
          },
          ....
        ],
     } },
  ...]
})
```
## Client side configuration


For the NextJs start you need to  make the following changes 

1. Install package to your next starter. This just makes it easier, importing all the scripts implicitly
```
yarn add react-razorpay

```
2. Create a button for Razorpay <next-starter>/src/modules/checkout/components/payment-button/razorpay-payment-button.tsx

like below



````
import { Button } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"
import React, { useCallback, useEffect, useState } from "react"
import  {useRazorpay, RazorpayOrderOptions } from "react-razorpay"
import { HttpTypes } from "@medusajs/types"
import { cancelOrder, placeOrder, waitForPaymentCompletion } from "@lib/data/cart"
import { CurrencyCode } from "react-razorpay/dist/constants/currency"
export const RazorpayPaymentButton = ({
  session,
  notReady,
  cart
}: {
  session: HttpTypes.StorePaymentSession
  notReady: boolean
  cart: HttpTypes.StoreCart
}) => {
  const [disabled, setDisabled] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const {Razorpay
   } = useRazorpay();
  
  const [orderData,setOrderData] = useState({id:""})

  
  console.log(`session_data: `+JSON.stringify(session))
  const onPaymentCompleted = async () => {
    await placeOrder().catch(() => {
      setErrorMessage("An error occurred, please try again.")
      setSubmitting(false)
    })
  }
  useEffect(()=>{
    setOrderData(session.data as {id:string})
  },[session.data])

  


  const handlePayment = useCallback(async() => {
    const onPaymentCancelled = async () => {
      await cancelOrder(session.provider_id).catch(() => {
        setErrorMessage("PaymentCancelled")
        setSubmitting(false)
      })
    }
    const options: RazorpayOrderOptions = {
      callback_url: `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/razorpay/hooks`,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY ?? '',
      amount: session.amount*100*100,
      order_id: orderData.id,
      currency: cart.currency_code.toUpperCase() as CurrencyCode,
      name: process.env.COMPANY_NAME ?? "your company name ",
      description: `Order number ${orderData.id}`,
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
    if(orderData.id)
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
  }, [Razorpay, cart.billing_address?.first_name, cart.billing_address?.last_name, cart.currency_code, cart?.email, cart?.shipping_address?.phone, orderData.id, session.amount, session.provider_id]);
  console.log("orderData"+JSON.stringify(orderData))
  return (
    <>
      <Button
        disabled={submitting || notReady || !orderData?.id||orderData.id == ''}
        onClick={()=>{
          console.log(`processing order id: ${orderData.id}`)
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
`````

Step 3. 

nextjs-starter-medusa/src/lib/constants.tsx
add

```
export const isRazorpay = (providerId?: string) => {
  return providerId?.startsWith("pp_razorpay")
}

// and the following to the list
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {...
   pp_razorpay_razorpay: {
    title: "Razorpay",
    icon: <CreditCard />,
  },
  ...}

````
step 4.add into the payment element <next-starter>/src/modules/checkout/components/payment-button/index.tsx

first 
```
import import {RazorpayPaymentButton} from "./razorpay-payment-button"
```
then
```
case "razorpay":
         return <RazorpayPaymentButton session={paymentSession} notReady={notReady} cart={cart} />
```


Step 4. modify initiatePaymentSession in the client storefront/src/modules/checkout/components/payment/index.tsx
```

.....
 try {
      const shouldInputCard =
        isStripeFunc(selectedPaymentMethod) && !activeSession

      if (!activeSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
          context:{
            extra:cart
          }
        })
      }
 }
 ....
```

Step 5. Add environment variables in the client

  NEXT_PUBLIC_RAZORPAY_KEY:<your razorpay key>
  NEXT_PUBLIC_SHOP_NAME:<your razorpay shop name>
  NEXT_PUBLIC_SHOP_DESCRIPTION: <your razorpayshop description>
#### watch out
Step 6. Caveat 
the default starter template has an option which says use the same shipping and billing address
please ensure you deselect this and enter the phone number manually in the billing section.

Step 7.

In razorpay create a webhook with the following url 

<your host>/hooks/payment/razorpay_razorpay

## Contributing


Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Untested features

These features exists, but without implementing the client it isn't possible to tests these outright

1. Capture Payment
2. Refund


## Disclaimer
The code was tested on limited number of usage scenarios. There maybe unforseen bugs, please raise the issues as they come, or create pull requests if you'd like to submit fixes.


## Support the Payment-Razorpay Provider - Strengthen Our Medusa Community!

Dear Medusa Enthusiasts,

I hope this message finds you all in high spirits and enthusiasm for the world of e-commerce! Today, I reach out to our vibrant Medusa community with a heartfelt appeal that will strengthen our collective journey and elevate our online stores to new heights. I am thrilled to present the Payment-Razorpay provider, a community-driven project designed to streamline payment processing for our beloved Medusa platform.

As a dedicated member of this community, I, SGFGOV, have invested my time and passion into crafting this valuable provider that bridges the gap between online retailers and their customers. It is with great humility that I invite you to participate in this open-source initiative by [sponsoring the Payment-Razorpay provider through GitHub](https://github.com/sponsors/SGFGOV).

Your sponsorship, no matter the size, will make a world of difference in advancing the Medusa ecosystem. It will empower me to focus on the continuous improvement and maintenance of the Payment-Razorpay provider, ensuring it remains reliable, secure, and seamlessly integrated with Medusa.

Being a community provider, perks are not the focus of this appeal. Instead, I promise to give back to the community by providing fast and efficient support via Discord or any other means. Your sponsorship will help sustain and enhance the provider's development, allowing me to be responsive to your needs and address any concerns promptly.

Let's come together and demonstrate the power of community collaboration. By [sponsoring the Payment-Razorpay provider on GitHub](https://github.com/sponsors/SGFGOV), you directly contribute to the success of not only this project but also the broader Medusa ecosystem. Your support enables us to empower developers, merchants, and entrepreneurs, facilitating growth and success in the world of e-commerce.

To show your commitment and be part of this exciting journey, kindly consider [sponsoring the Payment-Razorpay provider on GitHub](https://github.com/sponsors/SGFGOV). Your contribution will amplify the impact of our community and foster a supportive environment for all.

Thank you for your time, and thank you for being an integral part of our Medusa community. Together, we will elevate our online stores and create extraordinary experiences for customers worldwide.

With warm regards,

SGFGOV
Lead Developer, Payment-Razorpay Provider for Medusa
