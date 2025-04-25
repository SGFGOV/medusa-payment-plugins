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
    automatic_expiry_period: number;
    manual_expiry_period: number;
    refund_charges_percentage: string;
    refund_speed: "normal" | "optimum";
    auto_capture: boolean;
    webhook_secret: string;
}
