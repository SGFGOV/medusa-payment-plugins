# Medusa Razorpay Plugin (v2)

Razorpay payment provider for Medusa v2, including order creation, authorization/capture flows, refunds, and webhook handling.

## Installation

```bash
yarn add medusa-plugin-razorpay-v2
```

## Secure Setup

Define these variables in your server environment:

```env
RAZORPAY_ID=rzp_live_or_test_key_id
RAZORPAY_SECRET=rzp_live_or_test_key_secret
RAZORPAY_ACCOUNT=merchant_account_id
RAZORPAY_WEBHOOK_SECRET=webhook_signing_secret
```

### Medusa configuration

Use provider options from environment variables only (never hardcode secrets):

```ts
{
  resolve: "@medusajs/medusa/payment",
  dependencies: [Modules.PAYMENT, ContainerRegistrationKeys.LOGGER],
  options: {
    providers: [
      {
        resolve: "medusa-plugin-razorpay-v2/providers/payment-razorpay/src",
        id: "razorpay",
        options: {
          key_id: process.env.RAZORPAY_ID,
          key_secret: process.env.RAZORPAY_SECRET,
          razorpay_account: process.env.RAZORPAY_ACCOUNT,
          webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET,
          auto_capture: false,
          refund_speed: "normal",
          automatic_expiry_period: 30,
          manual_expiry_period: 20
        }
      }
    ]
  }
}
```

## Webhook Guidance

Configure Razorpay webhook endpoint:

```text
https://<your-domain>/hooks/payment/razorpay_razorpay
```

Recommended webhook events:
- `payment.authorized`
- `payment.captured`
- `payment.failed`

Operational guidance:
- Keep webhook secret unique per environment (dev/staging/prod).
- Validate signatures for every incoming webhook request.
- Return 2xx only after successful processing.
- Retry-safe handling is required (idempotent processing by event/session keys).
- Keep server clock synchronized (NTP) to reduce signature/timestamp issues.

## Safe Logging Guidance

The provider sanitizes sensitive webhook payload fields before logging. You should still enforce these operational rules:

- Never log raw secrets (`RAZORPAY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
- Never log full customer PII (`email`, `contact`, `vpa`, card data, notes blobs).
- Use structured logs and include non-sensitive correlation keys (`session_id`, order id).
- Restrict debug logs in production and centralize log retention controls.
- Add alerting for repeated webhook signature failures.

## Rotation Notes (Keys and Webhook Secret)

Use this runbook for safe rotation:

1. Create new API key pair and webhook secret in Razorpay.
2. Update secrets in your secret manager/CI variables (do not commit to repo).
3. Deploy with new values to staging; verify checkout + webhook events.
4. Promote to production.
5. Keep old webhook secret active briefly during transition if your infra supports dual validation.
6. Disable/revoke old key pair and old webhook secret after validation window.
7. Audit logs for signature failures and authorization/capture anomalies post-rotation.

## Security Checklist

- [ ] Secrets are stored in environment/secret manager, never in source control.
- [ ] Separate credentials per environment.
- [ ] Webhook signature verification is enabled and enforced.
- [ ] Webhook endpoint exposed only via HTTPS.
- [ ] Production logging redacts PII and secrets.
- [ ] Alerts configured for webhook verification failures and payment mismatches.
- [ ] Key/webhook-secret rotation completed at regular intervals.
- [ ] Team access to Razorpay dashboard and secrets follows least privilege.

## Local Validation

Run provider tests locally:

```bash
npx jest "src/providers/payment-razorpay/src/core/__tests__/razorpay-base.spec.ts" --runInBand
```

## Support

- Email: [sgf@sourcegoodfood.com](mailto:sgf@sourcegoodfood.com)
- Discord: [govdiw006](https://discord.com/users/govdiw006)
