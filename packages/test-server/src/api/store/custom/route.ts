import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(_req: MedusaRequest, _res: MedusaResponse) {
    _res.sendStatus(200);
}
