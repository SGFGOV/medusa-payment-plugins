
# Support the Payment-BitcoinPayServer Provider – Power the Future of Medusa Commerce!

Dear Developers and E-commerce Pioneers,

Get ready to embrace the world of decentralized finance for your online stores with MedusaJS! We are excited to introduce the **Payment-BitcoinPayServer** provider – a community-driven project that brings the powerful [Bitcoin PayServer](https://btcpayserver.org) gateway to our MedusaJS commerce stack.

**What's in it for You:**

🛡️ Secure & Sovereign Payments: Enable direct Bitcoin and Lightning Network payments without relying on third-party payment processors.

🌍 Borderless Transactions: Serve a global audience with permissionless payments that know no borders.

🚀 Empower Open Commerce: By sponsoring this provider, you contribute to the Medusa community's growth, independence, and innovation!

## Installation Made Simple

Use the package manager npm to install Payment-BitcoinPayServer.

```bash
yarn add medusa-plugin-btcpay
```

## Usage

Set up a [Bitcoin PayServer](https://docs.btcpayserver.org/) instance, either self-hosted or via a trusted host.

In your environment file (`.env`) define:

```bash
BTCPAY_URL=https://your-btcpayserver-instance.com
BTCPAY_API_KEY=<your api key>
BTCPAY_STORE_ID=<your store id>
BTCPAY_WEBHOOK_SECRET=<your webhook secret>
```

You need to add the provider into your `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  plugins: ["medusa-plugin-btcpay"],
  modules: [
    ...
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        dependencies: [
                Modules.CUSTOMER,
                Modules.ORDER,
                Modules.PAYMENT,
                Modules.CART,
                ContainerRegistrationKeys.MANAGER,
                ContainerRegistrationKeys.LOGGER,
                Modules.LINK,
                ContainerRegistrationKeys.LINK,
                ContainerRegistrationKeys.QUERY,
                ContainerRegistrationKeys.PG_CONNECTION
            ],
        providers: [
          ...
          {
            resolve:"medusa-plugin-btcpay/providers/payment-btcpay/src",
            id: "btcpay",
            options: {
                            refundVariant:process.env.REFUND_POLICY??'Custom',//InvoiceIdRefundBody.RefundVariantEnum,
                            storefront_url: process.env?.STOREFRONT_URL,
                            default_store_id:
                                process?.env?.BTCPAY_STORE_ID,
                            apiKey: `token ${process?.env?.BTCPAY_API_KEY}`,
                            basePath: process?.env?.BTCPAY_URL,
                            webhook_secret:
                                process?.env?.BTCPAY_WEBHOOK_SECRET,
                            refund_charges_percentage: process.env.BTC_TEST_CHARGE??"2.0",
                            currency:
                                process?.env?.BTCPAY_CURRENCY ?? "usd",
                            autoCapture:
                                process?.env?.BTCPAY_AUTO_CAPTURE ?? false,
                            autoRefund:
                                process?.env?.BTCPAY_AUTO_REFUND ?? false
                        }
          },
          ...
        ],
      },
    },
    ...
  ]
})
```

## Client Side Configuration

For your Medusa Next.js storefront, follow these steps:

### Step 1. Install the Bitcoin Payment Button package

(optional - depends on your design)  
```bash
yarn add react-btcpay-button
```

### Step 2. Create the Bitcoin Payment Button Component

At `<next-starter>/src/modules/checkout/components/payment-button/btcpayserver-payment-button.tsx`:

```tsx
import { Button } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { placeOrder } from "@lib/data/cart"
import React, { useState } from "react"

export const BtcpayserverPaymentButton = ({
  session,
  notReady,
  cart,
}: {
  session: HttpTypes.StorePaymentSession
  notReady: boolean
  cart: HttpTypes.StoreCart
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

  const handlePayment = async () => {
    setSubmitting(true)
    try {
      window.location.href = session.data.invoiceUrl
    } catch (error) {
      setErrorMessage("Failed to redirect to BTCPay invoice")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={submitting || notReady || !session?.data?.invoiceUrl}
        onClick={handlePayment}
      >
        {submitting ? "Processing..." : "Pay with Bitcoin"}
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

### Step 3. Extend Payment Constants

In `src/lib/constants.tsx`:

```tsx
export const isBtcpayserver = (providerId?: string) => {
  return providerId?.startsWith("pp_btcpayserver")
}

export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  ...
  pp_btcpayserver_btcpayserver: {
    title: "Bitcoin (BTCPay)",
    icon: <svg>...</svg>, // (add a bitcoin icon or import one)
  },
  ...
}
```

### Step 4. Hook Up the Payment Button

In `payment-button/index.tsx`:

```tsx
import { BtcpayserverPaymentButton } from "./btcpayserver-payment-button"

...

case "btcpayserver":
  return <BtcpayserverPaymentButton session={paymentSession} notReady={notReady} cart={cart} />
```

### Step 5. Modify `initiatePaymentSession`

In the checkout module, update `initiatePaymentSession` to pass context if needed:

```tsx
await initiatePaymentSession(cart, {
  provider_id: selectedPaymentMethod,
  context: {
    extra: cart,
  },
})
```

### Step 6. Configure Environment Variables in Frontend

Set the following environment variables for your storefront:

```bash
NEXT_PUBLIC_SHOP_NAME=<your shop name>
NEXT_PUBLIC_BTCPAY_URL=https://your-btcpayserver-instance.com
```

## Setting Up BTCPay Server Webhook

In BTCPayServer, add a webhook with this URL:

```text
<your-host-url>/hooks/payment/btcpayserver_btcpayserver
```

Make sure you set the webhook secret to match your `.env` `BTCPAY_WEBHOOK_SECRET` value.

## Contributing

Pull requests are welcome! For significant changes, please open an issue first to discuss improvements or new features.

Please ensure tests and documentation are updated appropriately.

## License

[MIT License](https://choosealicense.com/licenses/mit/)

## Untested Features

Some features exist but haven't been fully tested in client integration:

- Refund support
- Lightning Network (LNURL and other advanced flows)

## Disclaimer

This project is community-driven and tested in limited scenarios. Bugs may occur; please raise issues or submit pull requests if you encounter any.

## Support the Payment-BitcoinPayServer Provider – Fuel Open Commerce!

Dear Medusa Enthusiasts,

Thank you for your passion and energy for open e-commerce!  
The Payment-BitcoinPayServer provider is an open-source project crafted to connect MedusaJS with the powerful Bitcoin payment ecosystem.

If you find this project useful, consider sponsoring it [on GitHub](https://github.com/sponsors/yourgithubusername) to help maintain and expand it.  
Your support makes a world of difference in creating decentralized, open, and innovative commerce for all.

Let's keep building the future together!

With gratitude,  
**[YourName]**  
Lead Developer, Payment-BitcoinPayServer Provider
