import {
    ContainerRegistrationKeys,
    defineConfig,
    loadEnv,
    Modules
} from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const allowedHosts = process.env.ALLOWED_HOSTS?.split(",") ?? ["localhost"];
module.exports = defineConfig({
    admin: {
        vite: () => {
            return {
                server: {
                    allowedHosts: allowedHosts
                }
            };
        }
    },

    projectConfig: {
        databaseUrl: process.env.DATABASE_URL,
        http: {
            storeCors: process.env.STORE_CORS!,
            adminCors: process.env.ADMIN_CORS!,
            authCors: process.env.AUTH_CORS!,
            jwtSecret: process.env.JWT_SECRET || "supersecret",
            cookieSecret: process.env.COOKIE_SECRET || "supersecret"
        }
    },
    plugins: ["medusa-plugin-razorpay-v2", "medusa-plugin-btcpay"],
    modules: [
        // {
        //     resolve: "@rokmohar/medusa-plugin-meilisearch",
        //     options: {
        //         config: {
        //             host: process.env.MEILISEARCH_HOST,
        //             apiKey: process.env.MEILISEARCH_API_KEY
        //         },
        //         settings: {
        //             "products": {
        //                 indexSettings: {
        //                     searchableAttributes: [
        //                         "title",
        //                         "description",
        //                         "variant_sku"
        //                     ],
        //                     displayedAttributes: [
        //                         "title",
        //                         "description",
        //                         "variant_sku",
        //                         "thumbnail",
        //                         "handle"
        //                     ]
        //                 },
        //                 primaryKey: "id"
        //             },
        //             "product-categories": {
        //                 indexSettings: {
        //                     searchableAttributes: [
        //                         "name",
        //                         "description",
        //                         "handle"
        //                     ],
        //                     displayedAttributes: [
        //                         "name",
        //                         "description",
        //                         "handle"
        //                     ]
        //                 },
        //                 primaryKey: "id"
        //             }
        //         }
        //     }
        // },
        {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
                redisUrl: process.env.REDIS_URL
            }
        },

        {
            resolve: "@medusajs/medusa/cache-redis",
            options: {
                ttl: 30,
                redisUrl: process.env.REDIS_URL
            }
        },
        {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: {
                redis: {
                    url: process.env.REDIS_URL
                }
            }
        },
        {
            resolve: "@medusajs/medusa/payment",
            dependencies: [Modules.PAYMENT, ContainerRegistrationKeys.LOGGER],
            options: {
                providers: [
                    {
                        resolve:
                            "medusa-plugin-razorpay-v2/providers/payment-razorpay/src",
                        id: "razorpay",
                        options: {
                            key_id:
                                process?.env?.RAZORPAY_TEST_KEY_ID ??
                                process?.env?.RAZORPAY_ID,
                            key_secret:
                                process?.env?.RAZORPAY_TEST_KEY_SECRET ??
                                process?.env?.RAZORPAY_SECRET,
                            razorpay_account:
                                process?.env?.RAZORPAY_TEST_ACCOUNT ??
                                process?.env?.RAZORPAY_ACCOUNT,
                            automatic_expiry_period: 30 /* any value between 12minuts and 30 days expressed in minutes*/,
                            manual_expiry_period: 20,
                            refund_speed: "normal",
                            webhook_secret:
                                process?.env?.RAZORPAY_TEST_WEBHOOK_SECRET ??
                                process?.env?.RAZORPAY_WEBHOOK_SECRET
                        }
                    },
                    {
                        resolve:
                            "medusa-plugin-btcpay/providers/payment-btcpay/src",
                        id: "btcpay",
                        options: {
                            refundVariant:
                                process.env.REFUND_POLICY ?? "Custom", // InvoiceIdRefundBody.RefundVariantEnum,
                            storefront_url: process.env?.STOREFRONT_URL ?? "http://localhost:8000",
                            default_store_id:
                                process?.env?.BTCPAY_TEST_STORE_ID,
                            apiKey: `token ${process?.env?.BTCPAY_TEST_API_KEY}`,
                            basePath: process?.env?.BTCPAY_TEST_URL,
                            webhook_secret:
                                process?.env?.BTCPAY_TEST_WEBHOOK_SECRET,
                            refund_charges_percentage:
                                process.env.BTC_TEST_CHARGE ?? "2.0",
                            currency:
                                process?.env?.BTCPAY_TEST_CURRENCY ?? "usd",
                            autoCapture:
                                process?.env?.BTCPAY_TEST_AUTO_CAPTURE ?? false,
                            autoRefund:
                                process?.env?.BTCPAY_TEST_AUTO_REFUND ?? false
                        }
                    }
                ]
            }
        }
    ]
});
