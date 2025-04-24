import { Configuration } from "../core";

export interface BtcOptions extends Configuration {
    default_store_id: string;
    currency_pair: "USD_BTC"|"EUR_BTC"|"AUD_BTC"|"CAD_BTC"|"CHF_BTC"|"GBP_BTC"|"JPY_BTC";
    automatic_expiry_period: number;
    manual_expiry_period: number;
    refund_charges_percentage: string;
    refund_speed: "normal" | "optimum";
    auto_capture: boolean;
    webhook_secret: string;
}
