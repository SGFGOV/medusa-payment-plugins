import { PaymentSessionStatus } from "@medusajs/framework/utils";
import { PaymentStatus } from "@mollie/api-client";

export const PaymentStatusMap: Record<PaymentStatus, PaymentSessionStatus> = {
  paid: PaymentSessionStatus.CAPTURED,
  authorized: PaymentSessionStatus.AUTHORIZED,
  canceled: PaymentSessionStatus.CANCELED,
  open: PaymentSessionStatus.PENDING,
  pending: PaymentSessionStatus.PENDING,
  expired: PaymentSessionStatus.ERROR,
  failed: PaymentSessionStatus.ERROR,
};
