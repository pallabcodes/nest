export class PaymentSummaryDto {
  id: number;
  orderId: number;
  status: string;
  amount: number;
  currency: string;
  createdAt: Date;
}

export class ListPaymentsDto {
  items: PaymentSummaryDto[];
  total: number;
  page: number;
  limit: number;
}

export class ListPaymentsQueryDto {
  page?: number;
  limit?: number;
}

