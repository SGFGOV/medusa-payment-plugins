import { PaymentMethod } from "@mollie/api-client";

export interface MollieOptions {
  /**
   * The ID assigned to the payment provider in `medusa-config.ts`.
   * This ID will be used to construct the webhook URL for receiving events from the Mollie API.
   */
  providerId: string;

  /**
   * The Mollie API key, which starts with either `'test_'` or `'live_'`.
   */
  apiKey: string;

  /**
   * A default description to be used for the payment intent if no description is provided in the context.
   */
  paymentDescription?: string;

  /**
   * The base URL for the webhook. This will be used to construct the complete webhook URL for Mollie events.
   * For example:
   *   webhookUrl: `https://example.com`
   *   providerId: `mollie`
   * The final callback URL will be: `https://example.com/hooks/payment/mollie_mollie`
   *
   * The `webhookUrl` should always point to the domain where the Medusa backend is deployed.
   */
  webhookUrl?: string;
}
/** support for  
 * alma applepay bacs bancomatpay bancontact banktransfer belfius blik creditcard directdebit eps giftcard ideal kbc mybank paypal paysafecard pointofsale przelewy24 satispay trustly twint
 * 
 * 
 * 
*/
export const PaymentProviderKeys = {
  MOLLIE: "mollie",
  BAN_CONTACT: "mollie_bancontact",
  ALMA: "mollie_alma",
  APPLEPAY: "mollie_applepay",
  BACS: "mollie_bacs",
  BANCOMAT_PAY: "mollie_bancomatpay",
  BANCONTACT: "mollie_bancontact",
  BANKTRANSFER: "mollie_banktransfer",
  BELFIUS: "mollie_belfius",
  BLIK: "mollie_blik",
  CREDITCARD: "mollie_creditcard",
  DIRECTDEBIT: "mollie_directdebit",
  EPS: "mollie_eps",
  GIFT_CARD: "mollie_giftcard",
  IDEAL: "mollie_ideal",
  KBC: "mollie_kbc",
  MY_BANK: "mollie_mybank",
  PAYPAL: "mollie_paypal",
  PAYSAFECARD: "mollie_paysafecard",
  POINTOFSALE: "mollie_pointofsale",
  PRZELEWY24: "mollie_przelewy24",
  SATISPAY: "mollie_satispay",
  TRUSTLY: "mollie_trustly",
  TWINT: "mollie_twint",
  
};

export type PaymentContextExtra = {
  redirectUrl?: string;
  paymentDescription?: string;
  method?: PaymentMethod;
};
