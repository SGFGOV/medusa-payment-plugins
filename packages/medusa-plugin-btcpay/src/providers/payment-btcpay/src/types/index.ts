import { Configuration } from "../core";

export interface BtcOptions extends Configuration {
    storefront_url: string;
    default_store_id: string;
    crypto_currency:
        | "BTC"
        | "LTC"
        | "ETH"
        | "DOGE"
        | "DASH"
        | "ZEC"
        | "XMR"
        | "XRP";

    refund_charges_percentage: string;
    webhook_secret: string;
}
