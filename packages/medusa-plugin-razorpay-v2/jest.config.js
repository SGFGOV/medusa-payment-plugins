const path = require("path");

module.exports = {
    rootDir: __dirname,
    transform: {
        "^.+\\.[jt]s$": [
            require.resolve("@swc/jest"),
            {
                jsc: {
                    parser: { syntax: "typescript", decorators: true },
                    target: "es2022"
                }
            }
        ]
    },
    testEnvironment: "node",
    moduleFileExtensions: ["js", "ts", "json"],
    moduleNameMapper: {
        "^@models": "<rootDir>/src/providers/payment-razorpay/src/models",
        "^@services": "<rootDir>/src/providers/payment-razorpay/src/services",
        "^@repositories": "<rootDir>/src/providers/payment-razorpay/src/repositories",
        "^@types": "<rootDir>/src/providers/payment-razorpay/src/types",
        "^@utils": "<rootDir>/src/providers/payment-razorpay/src/utils"
    },
    modulePathIgnorePatterns: ["<rootDir>/.medusa/", "<rootDir>/dist/"],
    testMatch: ["**/__tests__/**/*.spec.[jt]s", "**/*.spec.[jt]s"],
};

