import {
    defineMiddlewares,
    type MedusaNextFunction,
    type MedusaRequest,
    type MedusaResponse
} from "@medusajs/framework/http";

export default defineMiddlewares({
    routes: [
        {
            matcher: "/btc-pay/is-paid*",
            methods: ["GET"],
            middlewares: [
                async (
                    req: MedusaRequest,
                    res: MedusaResponse,
                    next: MedusaNextFunction
                ) => {
                    const logger = req.scope.resolve("logger");
                    res.header(
                        "Access-Control-Allow-Origin",
                        process.env.STOREFRONT_URL ?? "http://localhost:8000"
                    );
                    logger.info("Received a request!");
                    next();
                }
            ]
        },
        {
            matcher: "/btc-pay/is-paid*",
            methods: ["OPTIONS"],
            middlewares: [
                (
                    _req: MedusaRequest,
                    res: MedusaResponse,
                    _next: MedusaNextFunction
                ) => {
                    console.log("Received a request!");
                    res.header(
                        "Access-Control-Allow-Origin",
                        process.env.STOREFRONT_URL ?? "http://localhost:8000"
                    );
                    res.header(
                        "Access-Control-Allow-Methods",
                        "GET, POST, OPTIONS"
                    );
                    res.header(
                        "Access-Control-Allow-Headers",
                        "Content-Type, Authorization, x-publishable-api-key"
                    );
                    res.sendStatus(200);
                    return;
                }
            ]
        }
    ]
});
