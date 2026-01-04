# Support the Payment-BitcoinPayServer Provider – Power the Future of Medusa Commerce!

Dear Developers and E-commerce Pioneers,

Get ready to embrace the world of decentralized finance for your online stores with MedusaJS! We are excited to introduce the **Payment-BitcoinPayServer** provider – a community-driven project that brings the powerful [Bitcoin PayServer](https://btcpayserver.org) gateway to our MedusaJS commerce stack.

**What's in it for You:**

🛡️ Secure & Sovereign Payments: Enable direct Bitcoin Network payments without relying on third-party payment processors.

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

> The BTCPay Greenfield API requires the Authorization header to include a `token` prefix.

You need to add the provider into your `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  modules: [
    ...
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          ...
          {
            resolve: "@yourorg/payment-btcpayserver",
            id: "btcpayserver",
            options: {
              url: process.env.BTCPAY_URL,
              // include "token " prefix before actual apikey.
              apiKey: `token ${process.env.BTCPAY_API_KEY}`,
              storeId: process.env.BTCPAY_STORE_ID,
              webhookSecret: process.env.BTCPAY_WEBHOOK_SECRET,
            },
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

### Step 2. Create the Bitcoin Payment Button Component in packages/storefront/src/modules/checkout/components/payment-button/index.tsx

#### Step 2.1 introduce a state variable to track clicks. 
```
  const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const [btcClicked, setBtcClicked] = useState(false)
  ....
}
```

#### Step 2.2 Then in the case 

```tsx
  case isBtcpay(paymentSession?.provider_id):
        return (  
          <Button disabled={btcClicked} onClick={() => {setBtcClicked(true);
            window.open(`${(paymentSession?.data as any).btc_invoice.checkoutLink}`)}}>
            Pay with BtcPay
          </Button>
        )
```

### Step 3. Extend Payment Constants

In `src/lib/constants.tsx`:

```tsx
export const isBtcpay = (providerId?: string) => {
  return providerId?.startsWith("pp_btcpay")
}

export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  ...
  pp_btcpay_btcpay: {
    title: "BtcPay",
    icon: <CurrencyDollarSolid />,
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


### step 5 . Create a confirmation page to poll the server -- 
You can use any mechanism, but i'chosen long polling, coz its just simple. 
You could use websockets or any other call back mechanism. 

processing/page.tsx

```tsx
  "use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSearchParams } from "next/navigation";
import { sdk } from "@lib/config";
import axios from "axios";

const ProcessingPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const cart= searchParams.get("cart");
    

    useEffect(() => {
        let isCancelled = false;

        const fetchData = async () => {
            try {
                const url = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/checkout/is-paid?cart=${cart}`
                console.log("Fetching data from URL:", url);
                let response = await axios.get(url,{
                    headers: {
                        'content-type': 'application/json',
                        'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
                    }
                }) as any;
                    
                const result = await sdk.store.cart.complete(cart!) as  {
                    order: {
                        id: string;
                    };
                }
                const redirectUrl = `/order/${result.order.id}/confirmed`
                
                //const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/checkout/is-paid?cart=${cart}`);
               /// const data = response.data;
                if (!isCancelled && redirectUrl) {
                    router.push(redirectUrl);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.log("Error fetching data:", JSON.stringify(error));
                }
            } finally {
                if (!isCancelled) {
                    setTimeout(fetchData, 5000); // Poll every 5 seconds
                }
            }
        };

        fetchData();

        return () => {
            isCancelled = true;
        };
    }, []);

    return (
        <div>
            <h1>Processing...</h1>
            <p>Please wait while we process your request.</p>
        </div>
    );
};

export default ProcessingPage;
```

### Step 6. Configure Environment Variables in Frontend

Set the following environment variables for your storefront:

```bash
NEXT_PUBLIC_SHOP_NAME=<your shop name>
NEXT_PUBLIC_MEDUSA_BACKEND_URL=<your medusa store>
```

## Setting Up BTCPay Server Webhook

In BTCPayServer, add a webhook with this URL:

```text
<your-host-url>/hooks/payment/btcpay_btcpay
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

If you find this project useful, consider sponsoring it [on GitHub](https://github.com/sponsors/SGFGOV) to help maintain and expand it.  
Your support makes a world of difference in creating decentralized, open, and innovative commerce for all.

Let's keep building the future together!

With gratitude,  
**SGFGOV**  
Lead Developer, Payment-BitcoinPayServer Provider
