const SENSITIVE_KEYS = new Set([
    "email",
    "phone",
    "mobile",
    "first_name",
    "last_name",
    "name",
    "full_name",
    "address",
    "address_1",
    "address_2",
    "street",
    "city",
    "postal_code",
    "zip",
    "zipcode",
    "country_code",
    "province",
    "state",
    "contact",
    "customer_name",
    "card",
    "card_number",
    "cvv",
    "cvc",
    "pan",
    "vpa",
    "account_number",
    "iban",
    "ssn",
    "tax_id",
    "password",
    "secret",
    "token",
    "api_key",
    "key_secret",
    "webhook_secret",
    "authorization",
    "cookie",
    "signature"
]);

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;

const MASK = "***";

function isSensitiveKey(key: string): boolean {
    const normalized = key
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .toLowerCase();

    if (SENSITIVE_KEYS.has(normalized)) {
        return true;
    }

    return (
        normalized.includes("email") ||
        normalized.includes("phone") ||
        normalized.includes("password") ||
        normalized.includes("secret") ||
        normalized.includes("token")
    );
}

function maskStringValue(value: string): string {
    return value.replace(EMAIL_PATTERN, MASK).replace(PHONE_PATTERN, MASK);
}

export function maskPII(data: unknown): unknown {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === "string") {
        return maskStringValue(data);
    }

    if (typeof data !== "object") {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => maskPII(item));
    }

    if (data instanceof Error) {
        return {
            name: data.name,
            message: maskStringValue(data.message),
            stack: data.stack ? maskStringValue(data.stack) : undefined
        };
    }

    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
        data as Record<string, unknown>
    )) {
        if (isSensitiveKey(key)) {
            masked[key] = MASK;
            continue;
        }

        masked[key] = maskPII(value);
    }

    return masked;
}

export function stringifyWithMaskedPII(data: unknown): string {
    return JSON.stringify(maskPII(data));
}
