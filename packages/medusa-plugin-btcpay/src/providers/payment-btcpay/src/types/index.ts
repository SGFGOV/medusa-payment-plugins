import { Configuration } from "../core";

export interface BtcOptions extends Configuration {
    automatic_expiry_period: number;
    manual_expiry_period: number;
    refund_charges_percentage: string;
    refund_speed: "normal" | "optimum";
    auto_capture: boolean;
    webhook_secret: string;
}
