import {
  IPaymentHeaders,
  ITransactionData,
} from '@/shared/interface/interface';

export interface IPaymentLinkResponse {
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaymentProcessor {
  makePayment(data: ITransactionData): Promise<IPaymentLinkResponse>;
  verifyPayment(transactionId: string | number): void;
  setHeaders(): IPaymentHeaders;
  confirmWebhook(body: any, reqHeader: any): void;
  confirmPaymentWithCallback(transactionId: string | number): Promise<any>;
}
