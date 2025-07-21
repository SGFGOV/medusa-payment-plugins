# medusajs-payment-mollie

> **Note**: This package is currently in development. We encourage you to test the package in your environment and report any issues or improvements.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
  - [Backend Configuration](#backend-configuration)
  - [Frontend Configuration](#frontend-configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

To install the `medusajs-payment-mollie` package, you can use either npm or yarn:

```bash
npm install medusajs-payment-mollie
```

```bash
yarn add medusajs-payment-mollie
```

## Configuration

### Backend Configuration

### Add Mollie as a Payment Provider

In your Medusa server, update the medusa-config.js file to include Mollie as a payment provider:

```javascript
modules: [
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
           
          resolve:
              "@sgftech/medusajs-plugin-mollie/providers/payment-mollie/src",
          id: "mollie",
          options: {
            /**
             * The ID assigned to the payment provider in `medusa-config.ts`.
             * This ID will be used to construct the webhook URL for receiving events from the Mollie API.
             */
            providerId: "mollie",
            // Your Mollie API key (use either live or test key)
            apiKey: process.env.MOLLIE_API_KEY,
            // Default description for payments when not provided
            paymentDescription: "mollie payment default description",
            /**
             * The base URL for the webhook. This will be used to construct the complete webhook URL for Mollie events.
             * For example:
             *   webhookUrl: `https://example.com`
             *   providerId: `mollie`
             * The final callback URL will be: `https://example.com/hooks/payment/mollie_mollie`
             *
             * The `webhookUrl` should always point to the domain where the Medusa backend is deployed.
             */
            webhookUrl: "https://your-domain.com", 
          },
        },
      ],
    },
  },
];
```

Currently we support 
  * bancontact,
  * creditcard 
  * ideal
  * apple pay
  * bank transfer

Please ensure you enable only these in the dashboard

### Create a Custom API Endpoint

Add a custom API endpoint to list available Mollie payment methods:

`src/api/store/mollie/payment-methods/route.ts`

```typescript
import MollieClient from "@mollie/api-client";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mollieClient = MollieClient({
    apiKey: process.env.MOLLIE_API_KEY || "",
  });

  const methods = await mollieClient.methods.list();

  res.status(200).json(methods);
}
```

## **Frontend Configuration**

### Handle the Place Order Logic

To complete the order after a successful Mollie transaction, create an API route for order completion and redirection:

`/src/app/api/place-order/[cartId]/route.ts`

```typescript
import { sdk } from "@lib/config";
import { revalidateTag } from "next/cache";
import medusaError from "@lib/util/medusa-error";
import { getAuthHeaders, removeCartId } from "@lib/data/cookies";

type Params = { params: Promise<{ cartId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const cartId = (await params).cartId;

    const cartRes = await sdk.store.cart
      .complete(cartId, {}, getAuthHeaders())
      .then((cartRes) => {
        revalidateTag("cart");
        return cartRes;
      })
      .catch(medusaError);

    if (cartRes?.type === "order") {
      const countryCode =
        cartRes.order.shipping_address?.country_code?.toLowerCase();
      removeCartId();

      return Response.redirect(
        new URL(
          `/${countryCode}/order/confirmed/${cartRes?.order.id}`,
          process.env.NEXT_PUBLIC_BASE_URL
        )
      );
    }
    return Response.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL));
  } catch (error: any) {
    return Response.json({ error: error?.message });
  }
}
```

### Update `initiatePaymentSession` method

In your frontend component, update the initiatePaymentSession method to include Mollie. This ensures the payment session is correctly created.

`/src/modules/checkout/components/payment.tsx`

```typescript
await initiatePaymentSession(cart, {
  provider_id: providerId,
  context: {
    extra: {
      // selected payment method or null
      method,
      // url to which the customer should be redirected after transaction is complete
      redirectUrl,
      /// description for the payment
      paymentDescription: "new payment",
    },
  },
});
```

<details>
<summary>
Complete Example for `handleSubmit` Method in `payment.tsx`
</summary>

```typescript
// import isMollie
import { isMollie as isMollieFunc } from "@lib/constants";

// handleSubmit
const handleSubmit = async () => {
  setError("");
  if (!cart || !selectedPaymentMethod) {
    return;
  }

  setIsLoading(true);
  try {
    const shouldInputCard =
      isStripeFunc(selectedPaymentMethod) && !activeSession;

    if (!activeSession) {
      let method: string | undefined = undefined;
      let providerId = selectedPaymentMethod;
      let redirectUrl: string | null = null;

      if (isMollieFunc(selectedPaymentMethod)) {
        const parts = selectedPaymentMethod.split("_");
        method = parts[2];
        providerId = parts.push("mollie").join("_");
        redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/place-order/${cart.id}`;
      }

      await initiatePaymentSession(cart, {
        provider_id: providerId,
        context: {
          extra: {
            method,
            redirectUrl,
            paymentDescription: "new payment",
          },
        },
      });
    }

    if (!shouldInputCard) {
      return router.push(pathname + "?" + createQueryString("step", "review"), {
        scroll: false,
      });
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

</details>

### Mollie Payment Method Component

This component will render the Mollie payment options.

```typescript
import { RadioGroup } from "@headlessui/react";
import { clx, Text } from "@medusajs/ui";
import Radio from "@modules/common/components/radio";
import { useEffect, useState } from "react";

const fetchMolliePaymentOptions = async () =>
  fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/mollie/payment-methods`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
    }
  ).then((res) => res.json());

type PaymentOption = {
  description: string;
  id: string;
  image: {
    svg: string;
  };
};

const providerId = "pp_mollie_mollie";
export const MolliePaymentOptions = (props: {
  selectedOptionId: string;
  setSelectedOptionId: (value: string) => void;
}) => {
  const { selectedOptionId, setSelectedOptionId } = props;
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);

  useEffect(() => {
    fetchMolliePaymentOptions()
      .then((methods) => {
        setPaymentOptions(methods);
      })
      .catch(console.log);
  }, []);

  return (
    <div>
      <RadioGroup
        value={selectedOptionId}
        onChange={(value: string) => setSelectedOptionId(value)}
      >
        {paymentOptions.map(({ description, id, image }) => (
          <RadioGroup.Option
            /// the prefix `pp_mollie_mollie_` should be same as the provider_id
            value={`pp_mollie_${id}_mollie`}
            key={id}
            className={clx(
              "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
              {
                "border-ui-border-interactive": selectedOptionId?.endsWith(id),
              }
            )}
          >
            <div className="flex items-center justify-between ">
              <div className="flex items-center gap-x-4">
                <Radio checked={selectedOptionId?.endsWith(id)} />
                <Text className="text-base-regular">{description}</Text>
              </div>
              <span className="justify-self-end text-ui-fg-base">
                <picture>
                  <img src={image.svg} alt={description} />
                </picture>
              </span>
            </div>
          </RadioGroup.Option>
        ))}
      </RadioGroup>
    </div>
  );
};
```
### Mollie Payment Button Component 
add to payment-button/index.tsx

```typescript
const MolliePaymentButton = ({
  cart,
  notReady,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
}) => {
  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  ) as {
    data?: {
      _links?: {
        checkout: {
          href: string
        }
      }
    }
  }

  const handlePayment = () => {
    if (!session || !session.data?._links) return
    window.location.replace(session.data._links.checkout.href)
  }

  return (
    <Button
      disabled={notReady || !session || !session.data?._links}
      onClick={handlePayment}
    >
      Place Order
    </Button>
  )
}
```

### Mollie support payments list
Into payments/index.ts insert
```typescript

 <MolliePaymentOptions
                selectedOptionId={selectedPaymentMethod}
                setSelectedOptionId={setSelectedPaymentMethod}
              />

```
The complete snippet is below
```typescript
<>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(value: string) => setSelectedPaymentMethod(value)}
              >
                {availablePaymentMethods.map((paymentMethod) => {
                  if (isMollie(paymentMethod.id)) return null
                  return (
                    <PaymentContainer
                      paymentInfoMap={paymentInfoMap}
                      paymentProviderId={paymentMethod.id}
                      key={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                    />
                  )
                })}
              </RadioGroup>

              <MolliePaymentOptions
                selectedOptionId={selectedPaymentMethod}
                setSelectedOptionId={setSelectedPaymentMethod}
              />
              {isStripe && stripeReady && (
                <div className="mt-5 transition-all duration-150 ease-in-out">
                  <Text className="txt-medium-plus text-ui-fg-base mb-1">
                    Enter your card details:
                  </Text>

                  <CardElement
                    options={useOptions as StripeCardElementOptions}
                    onChange={(e) => {
                      setCardBrand(
                        e.brand &&
                          e.brand.charAt(0).toUpperCase() + e.brand.slice(1)
                      )
                      setError(e.error?.message || null)
                      setCardComplete(e.complete)
                    }}
                  />
                </div>
              )}
            </>

```


# README for Example Folder

This folder demonstrates how to integrate and use the `medusajs-payment-mollie` library in a Medusa.js application. Below, you'll find a guide to setting up and using this payment provider within both the Medusa backend and frontend store.

---

## **Backend Configuration**

### **Add Mollie as a Payment Provider**

Update the `medusa-config.js` file in your Medusa server to include the Mollie payment provider:

```javascript
modules: [
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "medusajs-payment-mollie",
          id: "mollie",
          options: {
            id: "mollie",
            apiKey: process.env.MOLLIE_API_KEY,
          },
        },
      ],
    },
  },
];
```

### **Create a Custom API Endpoint**

Add an API route to list available Mollie payment methods.

File: `src/api/store/mollie/payment-methods/route.ts`

```typescript
import MollieClient from "@mollie/api-client";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mollieClient = MollieClient({
    apiKey: process.env.MOLLIE_API_KEY || "",
  });

  const methods = await mollieClient.methods.list();

  res.status(200).json(methods);
}
```

### **Set the Mollie API Key**

Add your Mollie API key to the `.env` file in the Medusa backend:

```env
MOLLIE_API_KEY=your_mollie_api_key_here
```

---

## **Frontend Configuration**

### **Handle the Place Order Logic**

Create an API route to complete the order and handle redirections after a successful transaction.

File: `api/place-order/[cartId]/route.ts`

```typescript
import { sdk } from "@lib/config";
import { revalidateTag } from "next/cache";
import medusaError from "@lib/util/medusa-error";
import { getAuthHeaders, removeCartId } from "@lib/data/cookies";

type Params = { params: Promise<{ cartId: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const cartId = (await params).cartId;

    const cartRes = await sdk.store.cart
      .complete(cartId, {}, getAuthHeaders())
      .then((cartRes) => {
        revalidateTag("cart");
        return cartRes;
      })
      .catch(medusaError);

    if (cartRes?.type === "order") {
      const countryCode =
        cartRes.order.shipping_address?.country_code?.toLowerCase();
      removeCartId();

      return Response.redirect(
        new URL(
          `/${countryCode}/order/${cartRes?.order.id}/confirmed`,
          process.env.NEXT_PUBLIC_BASE_URL
        )
      );
    }
    return Response.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL));
  } catch (error: any) {
    return Response.json({ error: error?.message });
  }
}
```

---

## **Getting Started**

1. **Clone this Repository**  
   Clone the repository and navigate to the `example` folder.

2. **Install Dependencies**  
   Run `npm install` or `yarn install` to install the required dependencies.

3. **Configure the Backend**

   - Update the `medusa-config.js` file to include the Mollie provider.
   - Add your Mollie API key to the `.env` file.

4. **Run the Medusa Server**  
   Start the Medusa server with `npm run start` or `yarn start`.

5. **Configure the Frontend**

   - Ensure the place order route is properly linked to the backend.
   - Update the `NEXT_PUBLIC_BASE_URL` in your frontend `.env` file.

6. **Test the Integration**  
   Use the Mollie payment methods in your store and verify the end-to-end flow from checkout to order confirmation.

---

## **Notes**

- Ensure the `MOLLIE_API_KEY` is kept secure and not exposed publicly.
- For more information on Mollie's API, refer to their [official documentation](https://docs.mollie.com/).

Enjoy using the `medusajs-payment-mollie` library! 🚀




## Contributing

To contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feat/your-feature`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to your branch (`git push origin feat/your-feature`).
6. Create a new Pull Request.

If you encounter any issues, please open an issue on GitHub. If you have a fix, feel free to create a PR.
