import MollieClient from "@mollie/api-client";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mollieClient = MollieClient({
    apiKey: process.env.MOLLIE_API_KEY || "",
  });

  const methods = await mollieClient.methods.list();

  res.status(200).json(methods);
}
