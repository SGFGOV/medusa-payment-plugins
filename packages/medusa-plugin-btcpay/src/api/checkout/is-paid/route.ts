import { MedusaRequest, MedusaResponse, Query } from "@medusajs/framework";
import {
    ICartModuleService,
    IOrderModuleService,
    IPaymentModuleService,
    RemoteQueryFunction,
    StoreCart
} from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    Modules,
    PaymentCollectionStatus
} from "@medusajs/framework/utils";
import _ from "lodash";

async function fetchOrderId(cartId: string, query: RemoteQueryFunction) {
    const order = await query.graph({
        entity: "order",
        fields: ["id", "metadata"],
        filters: {
            cart_id: {
                eq: cartId
            }
        }
    });
    const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["id", "metadata", "order"]
    });
    const cart = carts.find((cart) => cart.id === cartId);
    if (!cart) {
        throw new Error("Cart not found");
    }
    const orderId = order.data[0].id ?? cart.order?.order_id;
    if (!orderId) {
        throw new Error("Order ID not found in cart metadata");
    }
    return orderId;
}

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
    const cartService = req.scope.resolve(Modules.CART) as ICartModuleService;
    const queryService = req.scope.resolve(
        ContainerRegistrationKeys.REMOTE_QUERY
    );
    const orderService = req.scope.resolve(
        Modules.ORDER
    ) as IOrderModuleService;
    const paymentService = req.scope.resolve(
        Modules.PAYMENT
    ) as IPaymentModuleService;
    const { cart } = req.query;

    if (!cart || !_.isString(cart)) {
        return response.status(400).json({ error: "Cart ID is required" });
    }

    const cartId = Array.isArray(cart) ? cart[0] : cart;

    try {
        const cartData = await cartService.retrieveCart(cartId as string);

        if (!cartData) {
            return response.status(404).json({ error: "Cart not found" });
        }

        const paymentStatus = await fetchPaymentStatus(
            cartId as string,
            queryService
        );
        if (!paymentStatus) {
            return response
                .status(400)
                .json({ error: "Payment status not found in cart" });
        }
        if (paymentStatus !== PaymentCollectionStatus.AUTHORIZED) {
            return response
                .status(400)
                .json({ error: "Payment status is not authorized" });
        }

        if (
            paymentStatus == PaymentCollectionStatus.AUTHORIZED ||
            paymentStatus == PaymentCollectionStatus.COMPLETED
        ) {
            const orderId = await fetchOrderId(cartId as string, queryService);
            if (!orderId) {
                return response
                    .status(400)
                    .json({ error: "Order ID not found in cart metadata" });
            }
            const redirectUrl = `/orders/completed/${orderId}`;

            return response.status(200).json({ redirectUrl });
        }
    } catch (error) {
        console.error("Error retrieving cart:", error);
        return response.status(500).json({ error: "Internal server error" });
    }
};

export const OPTIONS = async (req: MedusaRequest, response: MedusaResponse) => {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-publishable-api-key"
    );
    response.sendStatus(200);
};
