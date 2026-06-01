import { describe, expect, it } from "@jest/globals";
import { maskPII, stringifyWithMaskedPII } from "../mask-pii";

describe("maskPII", () => {
    it("masks sensitive object keys", () => {
        const masked = maskPII({
            event: "payment.captured",
            email: "user@example.com",
            phone: "+1-555-0100",
            amount: 1000
        });

        expect(masked).toEqual({
            event: "payment.captured",
            email: "***",
            phone: "***",
            amount: 1000
        });
    });

    it("masks nested sensitive fields", () => {
        const masked = maskPII({
            payload: {
                payment: {
                    entity: {
                        id: "pay_123",
                        contact: "+1-555-0100",
                        email: "user@example.com"
                    }
                }
            }
        });

        expect(masked).toEqual({
            payload: {
                payment: {
                    entity: {
                        id: "pay_123",
                        contact: "***",
                        email: "***"
                    }
                }
            }
        });
    });

    it("masks email and phone patterns in strings", () => {
        expect(maskPII("Contact user@example.com or +1-555-0100")).toBe(
            "Contact *** or ***"
        );
    });

    it("stringifies masked data for logging", () => {
        expect(
            stringifyWithMaskedPII({
                email: "user@example.com",
                id: "evt_123"
            })
        ).toBe('{"email":"***","id":"evt_123"}');
    });
});
