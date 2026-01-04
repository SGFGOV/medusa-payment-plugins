import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import type { RemoteQueryFunction, StoreCart } from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    PaymentCollectionStatus
} from "@medusajs/framework/utils";

async function fetchPaymentStatus(cartId: string, query: RemoteQueryFunction) {
    const { data: carts } = (await query.graph({
        entity: "cart",
        fields: ["payment_collection.*"]
    })) as { data: StoreCart[] };

    const cart = carts.find((cart) => cart.id === cartId);
    if (!cart) {
        throw new Error("Cart not found");
    }
    return cart.payment_collection?.status;
}

export const GET = async (req: MedusaRequest, response: MedusaResponse) => {
    const logger = req.scope.resolve("logger");
    try {
        const query = req.scope.resolve(
            ContainerRegistrationKeys.QUERY
        ) as RemoteQueryFunction;
        const { cart } = req.query;

        const paymentStatus = await fetchPaymentStatus(cart as string, query);

        const isOk =
            paymentStatus === PaymentCollectionStatus.AUTHORIZED ||
            paymentStatus === PaymentCollectionStatus.COMPLETED;

        if (!isOk) {
            return response
                .status(400)
                .json({ error: "Payment collection not complete yet" });
        } else {
            return response
                .status(200)
                .json({ message: "Payment collection complete" });
        }
    } catch (error) {
        logger.error("Error retrieving cart:", error);
        return response.status(500).json({ error: "Internal server error" });
    }
};

export const OPTIONS = async (
    _req: MedusaRequest,
    response: MedusaResponse
) => {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-publishable-api-key"
    );
    response.sendStatus(200);
};
