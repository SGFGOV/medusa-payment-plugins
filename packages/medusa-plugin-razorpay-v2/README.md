# Payment-Razorpay

[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://medusa-payment-plugins.vercel.app/)

[Razorpay](https://razorpay.com) is an immensely popular payment gateway with a host of features. This provider enables the Razorpay payment interface on [Medusa](https://medusajs.com) commerce stack.

## Contact

For support or questions, please contact:
- Email: [sgf@sourcegoodfood.com](mailto:sgf@sourcegoodfood.com)
- Discord: [govdiw006](https://discord.com/users/govdiw006)

## Features

- 🚀 Streamline Payment Processing: Unleash the full potential of Razorpay's features for seamless and secure payments
- 🌐 Global Reach: Support for various currencies and payment methods
- 🔒 Secure Transactions: Built with security best practices
- ⚡ Easy Integration: Simple setup process for your Medusa store

## Installation

Install Payment-Razorpay using yarn:

```bash
yarn add medusa-plugin-razorpay-v2
```

## Configuration

### Backend Setup

Register for a razorpay account and generate the api keys
In your environment file (.env) you need to define

```
RAZORPAY_ID=<your api key id>
RAZORPAY_SECRET=<your api key secret>
RAZORPAY_ACCOUNT=<your razorpay account number/merchant id>
RAZORPAY_WEBHOOK_SECRET=<your web hook secret as defined in the webhook settings in the razorpay dashboard >
```
You need to add the provider into your medusa-config.ts as shown below

3. Add the provider to your `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  // ...
  plugins: ["medusa-plugin-razorpay-v2"],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      dependencies: [Modules.PAYMENT, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: [
          {
            resolve: "medusa-plugin-razorpay-v2/providers/payment-razorpay/src",
            id: "razorpay",
            options: {
              key_id: process?.env?.RAZORPAY_TEST_KEY_ID ?? process?.env?.RAZORPAY_ID,
              key_secret: process?.env?.RAZORPAY_TEST_KEY_SECRET ?? process?.env?.RAZORPAY_SECRET,
              razorpay_account: process?.env?.RAZORPAY_TEST_ACCOUNT ?? process?.env?.RAZORPAY_ACCOUNT,
              automatic_expiry_period: 30, // any value between 12 minutes and 30 days expressed in minutes
              manual_expiry_period: 20,
              refund_speed: "normal",
              webhook_secret: process?.env?.RAZORPAY_TEST_WEBHOOK_SECRET ?? process?.env?.RAZORPAY_WEBHOOK_SECRET
            }
          }
        ]
      }
    }
  ]
})
```

### Frontend Setup

1. Install the Razorpay React package:

```bash
yarn add react-razorpay
```

2. Create a Razorpay payment button component at `src/modules/checkout/components/payment-button/razorpay-payment-button.tsx`:

```typescript
import { Button } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"
import React, { useCallback, useEffect, useState } from "react"
import { useRazorpay, RazorpayOrderOptions } from "react-razorpay"
import { HttpTypes } from "@medusajs/types"
import { placeOrder } from "@lib/data/cart"
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
  const { Razorpay } = useRazorpay()
  const [orderData, setOrderData] = useState({razorpayOrder:{id:""}})

  const onPaymentCompleted = async () => {
    await placeOrder().catch(() => {
      setErrorMessage("An error occurred, please try again.")
      setSubmitting(false)
    })
  }

  useEffect(() => {
    setOrderData(session.data as {razorpayOrder:{id:string}})
  }, [session.data])

  const handlePayment = useCallback(async () => {
    const onPaymentCancelled = async () => {
      setErrorMessage("Payment Cancelled")
      setSubmitting(false)
    }

    const options: RazorpayOrderOptions = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY_ID ?? "your_key_id",
      callback_url: `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/razorpay/hooks`,
      amount: session.amount * 100 * 100,
      order_id: orderData.razorpayOrder.id,
      currency: cart.currency_code.toUpperCase() as CurrencyCode,
      name: process.env.COMPANY_NAME ?? "your company name",
      description: `Order number ${orderData.razorpayOrder.id}`,
      remember_customer: true,
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
      prefill: {
        name: cart.billing_address?.first_name + " " + cart?.billing_address?.last_name,
        email: cart?.email,
        contact: cart?.shipping_address?.phone ?? undefined
      },
    }

    const razorpay = new Razorpay(options)
    if (orderData.razorpayOrder.id) {
      razorpay.open()
    }

    razorpay.on("payment.failed", function (response: any) {
      setErrorMessage(JSON.stringify(response.error))
    })

    razorpay.on("payment.authorized" as any, function (response: any) {
      placeOrder().then(authorizedCart => {
        JSON.stringify(`authorized:` + authorizedCart)
      })
    })
  }, [Razorpay, cart.billing_address?.first_name, cart.billing_address?.last_name, cart.currency_code,
      cart?.email, cart?.shipping_address?.phone, orderData.razorpayOrder.id, session.amount])

  return (
    <>
      <Button
        disabled={submitting || notReady || !orderData?.razorpayOrder?.id || orderData?.razorpayOrder?.id == ''}
        onClick={() => handlePayment()}
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
```

3. Update your constants file (`src/lib/constants.tsx`):

```typescript
export const isRazorpay = (providerId?: string) => {
  return providerId?.startsWith("pp_razorpay")
}

export const paymentInfoMap: Record<string, { title: string; icon: React.JSX.Element }> = {
  // ... existing payment methods
  pp_razorpay_razorpay: {
    title: "Razorpay",
    icon: <CreditCard />,
  },
  // ...
}
```

4. Update your payment component (`src/modules/checkout/components/payment-button/index.tsx`):

```typescript
import { RazorpayPaymentButton } from "./razorpay-payment-button"

// In your switch statement:
case isRazorpay(paymentSession?.provider_id):
        return <RazorpayPaymentButton session={paymentSession!} notReady={notReady} cart={cart} />
```

5. Add environment variables to your frontend `.env`:

```bash
NEXT_PUBLIC_RAZORPAY_KEY_ID=<your razorpay key id>
NEXT_PUBLIC_COMPANY_NAME=<your razorpay shop name>
NEXT_PUBLIC_COMPANY_DESCRIPTION=<your razorpay shop description>
```

6. Set up Razorpay webhook:
   - In your Razorpay dashboard, create a webhook with the URL:
   ```
   <your domain name>/hooks/payment/razorpay_razorpay
   ```

## Important Notes

1. **Billing Address**: When using the default starter template, ensure you deselect the "Use same shipping and billing address" option and enter the phone number manually in the billing section.

2. **Untested Features**: The following features exist but haven't been fully tested:
   - Capture Payment
   - Refund

## Contributing

Pull requests are welcome! For major changes:
1. Open an issue first to discuss your proposed changes
2. Make sure to update tests as appropriate

## Support

If you find this plugin helpful, consider [sponsoring the Payment-Razorpay provider through GitHub](https://github.com/sponsors/SGFGOV). Your support helps maintain and improve this community resource.

## License

[MIT](https://choosealicense.com/licenses/mit/)




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
