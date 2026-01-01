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
        "^@models": "<rootDir>/src/models",
        "^@services": "<rootDir>/src/services",
        "^@repositories": "<rootDir>/src/repositories",
        "^@types": "<rootDir>/src/types",
        "^@utils": "<rootDir>/src/utils"
    },
    modulePathIgnorePatterns: ["<rootDir>/.medusa/", "<rootDir>/dist/"]
};
