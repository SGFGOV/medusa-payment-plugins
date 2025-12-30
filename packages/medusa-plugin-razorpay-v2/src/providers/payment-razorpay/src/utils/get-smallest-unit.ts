import type { BigNumberInput } from "@medusajs/framework/types";
import { BigNumber, MathBN } from "@medusajs/framework/utils";

function getCurrencyMultiplier(currency): number {
    const currencyMultipliers = {
        0: [
            "BIF",
            "CLP",
            "DJF",
            "GNF",
            "JPY",
            "KMF",
            "KRW",
            "MGA",
            "PYG",
            "RWF",
            "UGX",
            "VND",
            "VUV",
            "XAF",
            "XOF",
            "XPF"
        ],
        3: ["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]
    };

    const upperCurrency = currency.toUpperCase();
    let power = 2;
    for (const [key, value] of Object.entries(currencyMultipliers)) {
        if (value.includes(upperCurrency)) {
            power = parseInt(key, 10);
            break;
        }
    }
    return 10 ** power;
}

/**
 * Converts an amount to the format required by Stripe based on currency.
 * https://docs.stripe.com/currencies
 * @param {BigNumberInput} amount - The amount to be converted.
 * @param {string} currency - The currency code (e.g., 'USD', 'JOD').
 * @returns {number} - The converted amount in the smallest currency unit.
 */
export function getSmallestUnit(
    amount: BigNumberInput,
    currency: string
): number {
    const multiplier = getCurrencyMultiplier(currency);

    const amount_ =
        Math.round(new BigNumber(MathBN.mult(amount, multiplier)).numeric) /
        multiplier;

    const smallestAmount = new BigNumber(MathBN.mult(amount_, multiplier));

    let numeric = smallestAmount.numeric;
    
    // For 3-decimal currencies (multiplier === 1000), round to nearest 10
    // For numbers < 100000: round up if last digit is 0-4
    // For numbers >= 100000: round to nearest 10 only if last 2 digits are 00-04
    if (multiplier === 1e3 && numeric >= 10) {
        if (numeric < 100000) {
            const lastDigit = parseInt(numeric.toString().slice(-1), 10);
            if (lastDigit >= 0 && lastDigit <= 4) {
                numeric = Math.ceil(numeric / 10) * 10;
            }
        } else {
            // For very large numbers, round to nearest 10 only if last 2 digits are 00-04
            const lastTwoDigits = numeric % 100;
            if (lastTwoDigits >= 0 && lastTwoDigits <= 4) {
                numeric = Math.round(numeric / 10) * 10;
            }
        }
    }

    if (numeric === null || numeric === undefined || Number.isNaN(numeric)) {
        throw new Error("Numeric is not defined");
    }
    return parseInt(numeric.toString().split(".").shift() ?? "0", 10);
}

/**
 * Converts an amount from the smallest currency unit to the standard unit based on currency.
 * @param {BigNumberInput} amount - The amount in the smallest currency unit.
 * @param {string} currency - The currency code (e.g., 'USD', 'JOD').
 * @returns {number} - The converted amount in the standard currency unit.
 */
export function getAmountFromSmallestUnit(
    amount: BigNumberInput,
    currency: string
): number {
    const multiplier = getCurrencyMultiplier(currency);
    const standardAmount = new BigNumber(MathBN.div(amount, multiplier));
    return standardAmount.numeric;
}
