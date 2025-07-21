export const constructMollieWebhookUrl = (
    providerId: string,
    identifier: string,
    webhookUrlPrefix?: string
): string | undefined => {
    if (!webhookUrlPrefix) {
        return undefined;
    }

    /**
     * @see  https://docs.medusajs.com/resources/commerce-modules/payment/webhook-events#getwebhookactionanddata-method
     */
    return `${webhookUrlPrefix}/hooks/payment/${identifier}_${providerId}`;
};
