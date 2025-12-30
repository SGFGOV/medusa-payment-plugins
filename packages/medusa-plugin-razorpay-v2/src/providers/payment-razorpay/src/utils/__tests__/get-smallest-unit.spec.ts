import { describe, expect, it } from "@jest/globals";
import { getSmallestUnit } from "../get-smallest-unit";

describe("getSmallestUnit", () => {
    it("should convert an amount to the format required by Stripe based on currency", () => {
        // 0 decimals
        expect(getSmallestUnit(50098, "JPY")).toBe(50098);

        // 3 decimals
        expect(getSmallestUnit(5.124, "KWD")).toBe(5130);

        // 2 decimals
        expect(getSmallestUnit(2.675, "USD")).toBe(268);

        expect(getSmallestUnit(100.54, "USD")).toBe(10054);
        expect(getSmallestUnit(5.126, "KWD")).toBe(5126);
        expect(getSmallestUnit(0.54, "USD")).toBe(54);
        expect(getSmallestUnit(0.054, "USD")).toBe(5);
        expect(getSmallestUnit(0.056, "USD")).toBe(6);
        expect(getSmallestUnit(0.005104, "USD")).toBe(1);
        expect(getSmallestUnit(0.004104, "USD")).toBe(0);
        expect(getSmallestUnit(0.004104, "INR")).toBe(0);
        expect(getSmallestUnit(100, "INR")).toBe(10000);
        expect(getSmallestUnit(6599, "INR")).toBe(659900);
    });

    it("should handle zero and very small amounts", () => {
        // Zero
        expect(getSmallestUnit(0, "USD")).toBe(0);
        expect(getSmallestUnit(0, "JPY")).toBe(0);
        expect(getSmallestUnit(0, "KWD")).toBe(0);
        expect(getSmallestUnit(0, "INR")).toBe(0);

        // Very small amounts that round to 0
        expect(getSmallestUnit(0.001, "USD")).toBe(0);
        expect(getSmallestUnit(0.002, "USD")).toBe(0);
        expect(getSmallestUnit(0.003, "USD")).toBe(0);
        expect(getSmallestUnit(0.004, "USD")).toBe(0);
        expect(getSmallestUnit(0.0049, "USD")).toBe(0);
        expect(getSmallestUnit(0.0001, "USD")).toBe(0);
        expect(getSmallestUnit(0.00001, "USD")).toBe(0);

        // Very small amounts that round to 1
        expect(getSmallestUnit(0.005, "USD")).toBe(1);
        expect(getSmallestUnit(0.0051, "USD")).toBe(1);
        expect(getSmallestUnit(0.009, "USD")).toBe(1);
        expect(getSmallestUnit(0.0099, "USD")).toBe(1);

        // Very small amounts for 3-decimal currencies
        expect(getSmallestUnit(0.0001, "KWD")).toBe(0);
        expect(getSmallestUnit(0.0004, "KWD")).toBe(0);
        expect(getSmallestUnit(0.0005, "KWD")).toBe(1);
        expect(getSmallestUnit(0.0009, "KWD")).toBe(1);
    });

    it("should handle all 0-decimal currencies correctly", () => {
        // JPY (already tested)
        expect(getSmallestUnit(100, "JPY")).toBe(100);
        expect(getSmallestUnit(100.5, "JPY")).toBe(101);
        expect(getSmallestUnit(100.4, "JPY")).toBe(100);
        expect(getSmallestUnit(0.5, "JPY")).toBe(1);
        expect(getSmallestUnit(0.4, "JPY")).toBe(0);

        // Other 0-decimal currencies
        expect(getSmallestUnit(1000, "KRW")).toBe(1000);
        expect(getSmallestUnit(1000.5, "KRW")).toBe(1001);
        expect(getSmallestUnit(500, "VND")).toBe(500);
        expect(getSmallestUnit(500.9, "VND")).toBe(501);
        expect(getSmallestUnit(100, "CLP")).toBe(100);
        expect(getSmallestUnit(100.1, "CLP")).toBe(100);
    });

    it("should handle all 3-decimal currencies with special rounding logic", () => {
        // KWD - last digit 0-4 should round up to nearest 10
        expect(getSmallestUnit(5.120, "KWD")).toBe(5120); // last digit 0, rounds to 5120
        expect(getSmallestUnit(5.121, "KWD")).toBe(5130); // last digit 1, rounds up to 5130
        expect(getSmallestUnit(5.122, "KWD")).toBe(5130); // last digit 2, rounds up to 5130
        expect(getSmallestUnit(5.123, "KWD")).toBe(5130); // last digit 3, rounds up to 5130
        expect(getSmallestUnit(5.124, "KWD")).toBe(5130); // last digit 4, rounds up to 5130
        expect(getSmallestUnit(5.125, "KWD")).toBe(5125); // last digit 5, no rounding
        expect(getSmallestUnit(5.126, "KWD")).toBe(5126); // last digit 6, no rounding
        expect(getSmallestUnit(5.127, "KWD")).toBe(5127); // last digit 7, no rounding
        expect(getSmallestUnit(5.128, "KWD")).toBe(5128); // last digit 8, no rounding
        expect(getSmallestUnit(5.129, "KWD")).toBe(5129); // last digit 9, no rounding

        // Other 3-decimal currencies
        expect(getSmallestUnit(10.123, "BHD")).toBe(10130);
        expect(getSmallestUnit(10.125, "BHD")).toBe(10125);
        expect(getSmallestUnit(10.124, "BHD")).toBe(10130);
        expect(getSmallestUnit(1.001, "JOD")).toBe(1010);
        expect(getSmallestUnit(1.005, "JOD")).toBe(1005);
        expect(getSmallestUnit(2.003, "OMR")).toBe(2010);
        expect(getSmallestUnit(2.007, "OMR")).toBe(2007);
        expect(getSmallestUnit(3.004, "TND")).toBe(3010);
        expect(getSmallestUnit(3.006, "TND")).toBe(3006);
        expect(getSmallestUnit(4.002, "IQD")).toBe(4010);
        expect(getSmallestUnit(4.008, "IQD")).toBe(4008);
    });

    it("should handle all 2-decimal currencies correctly", () => {
        // USD
        expect(getSmallestUnit(1.00, "USD")).toBe(100);
        expect(getSmallestUnit(1.01, "USD")).toBe(101);
        expect(getSmallestUnit(1.99, "USD")).toBe(199);
        expect(getSmallestUnit(99.99, "USD")).toBe(9999);
        expect(getSmallestUnit(100.00, "USD")).toBe(10000);

        // INR
        expect(getSmallestUnit(1.00, "INR")).toBe(100);
        expect(getSmallestUnit(1.50, "INR")).toBe(150);
        expect(getSmallestUnit(10.25, "INR")).toBe(1025);
        expect(getSmallestUnit(1000.75, "INR")).toBe(100075);

        // Other 2-decimal currencies (EUR, GBP, etc.)
        expect(getSmallestUnit(50.50, "EUR")).toBe(5050);
        expect(getSmallestUnit(25.25, "GBP")).toBe(2525);
        expect(getSmallestUnit(100.99, "CAD")).toBe(10099);
        expect(getSmallestUnit(200.01, "AUD")).toBe(20001);
    });

    it("should handle boundary values for rounding", () => {
        // 2-decimal currencies - boundary at 0.005
        expect(getSmallestUnit(0.004, "USD")).toBe(0);
        expect(getSmallestUnit(0.0049, "USD")).toBe(0);
        expect(getSmallestUnit(0.005, "USD")).toBe(1);
        expect(getSmallestUnit(0.0051, "USD")).toBe(1);

        // 2-decimal currencies - boundary at 0.01
        expect(getSmallestUnit(0.009, "USD")).toBe(1);
        expect(getSmallestUnit(0.01, "USD")).toBe(1);
        expect(getSmallestUnit(0.0101, "USD")).toBe(1);
        expect(getSmallestUnit(0.014, "USD")).toBe(1);
        expect(getSmallestUnit(0.015, "USD")).toBe(2);

        // 3-decimal currencies - boundary at 0.0005
        expect(getSmallestUnit(0.0004, "KWD")).toBe(0);
        expect(getSmallestUnit(0.0005, "KWD")).toBe(1);
        expect(getSmallestUnit(0.0006, "KWD")).toBe(1);

        // 3-decimal currencies - special rounding boundaries
        expect(getSmallestUnit(1, "KWD")).toBe(1000);
        expect(getSmallestUnit(1.001, "KWD")).toBe(1010);
        expect(getSmallestUnit(1.004, "KWD")).toBe(1010);
        expect(getSmallestUnit(1.005, "KWD")).toBe(1005);
    });

    it("should handle large amounts", () => {
        // Large 2-decimal amounts
        expect(getSmallestUnit(1000000, "USD")).toBe(100000000);
        expect(getSmallestUnit(999999.99, "USD")).toBe(99999999);
        expect(getSmallestUnit(1000000.50, "USD")).toBe(100000050);
        expect(getSmallestUnit(5000000, "INR")).toBe(500000000);

        // Large 0-decimal amounts
        expect(getSmallestUnit(1000000, "JPY")).toBe(1000000);
        expect(getSmallestUnit(9999999, "KRW")).toBe(9999999);

        // Large 3-decimal amounts
        expect(getSmallestUnit(10000.123, "KWD")).toBe(10000123);
        expect(getSmallestUnit(10000.125, "KWD")).toBe(10000125);
        expect(getSmallestUnit(50000.004, "BHD")).toBe(50000000);
    });

    it("should handle precision edge cases", () => {
        // Many decimal places
        expect(getSmallestUnit(1.123456789, "USD")).toBe(112);
        expect(getSmallestUnit(1.987654321, "USD")).toBe(199);
        expect(getSmallestUnit(5.123456789, "KWD")).toBe(5130);
        expect(getSmallestUnit(5.987654321, "KWD")).toBe(5988);

        // Floating point precision issues
        const floatingPointResult1 = 0.1 + 0.2; // 0.30000000000000004
        const floatingPointResult2 = 0.7 + 0.1; // 0.7999999999999999
        expect(getSmallestUnit(floatingPointResult1, "USD")).toBe(30);
        expect(getSmallestUnit(floatingPointResult2, "USD")).toBe(80);
        expect(getSmallestUnit(1.005, "USD")).toBe(101);
        expect(getSmallestUnit(1.004999, "USD")).toBe(100);

        // Exact multiples
        expect(getSmallestUnit(1.0, "USD")).toBe(100);
        expect(getSmallestUnit(10.0, "USD")).toBe(1000);
        expect(getSmallestUnit(100.0, "USD")).toBe(10000);
        expect(getSmallestUnit(1, "KWD")).toBe(1000);
        expect(getSmallestUnit(10, "KWD")).toBe(10000);
    });

    it("should handle case-insensitive currency codes", () => {
        expect(getSmallestUnit(100.50, "usd")).toBe(10050);
        expect(getSmallestUnit(100.50, "USD")).toBe(10050);
        expect(getSmallestUnit(100.50, "Usd")).toBe(10050);
        expect(getSmallestUnit(5.123, "kwd")).toBe(5130);
        expect(getSmallestUnit(5.123, "KWD")).toBe(5130);
        expect(getSmallestUnit(5.123, "Kwd")).toBe(5130);
        expect(getSmallestUnit(100, "jpy")).toBe(100);
        expect(getSmallestUnit(100, "JPY")).toBe(100);
    });

    it("should handle amounts that result in exact rounding boundaries", () => {
        // Amounts that round to exactly 0
        expect(getSmallestUnit(0.004, "USD")).toBe(0);
        expect(getSmallestUnit(0.0049, "USD")).toBe(0);
        expect(getSmallestUnit(0.00499, "USD")).toBe(0);

        // Amounts that round to exactly 1
        expect(getSmallestUnit(0.005, "USD")).toBe(1);
        expect(getSmallestUnit(0.0051, "USD")).toBe(1);
        expect(getSmallestUnit(0.009, "USD")).toBe(1);
        expect(getSmallestUnit(0.0099, "USD")).toBe(1);

        // Amounts that round to exactly 10 (for 3-decimal currencies)
        expect(getSmallestUnit(0.001, "KWD")).toBe(1);
        expect(getSmallestUnit(0.0011, "KWD")).toBe(1);
        expect(getSmallestUnit(0.0014, "KWD")).toBe(1);
        expect(getSmallestUnit(0.0015, "KWD")).toBe(2);
    });
});
