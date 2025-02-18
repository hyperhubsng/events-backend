import {
  IPaymentHeaders,
  ITransactionData,
} from '@/shared/interface/interface';
import { IPaymentLinkResponse, PaymentProcessor } from './processor.interface';
import { appConfig } from '@/config';
import axios, { AxiosHeaders } from 'axios';
import crypto from 'crypto';

export class Paystack implements PaymentProcessor {
  setHeaders(): IPaymentHeaders {
    const headers = {
      Authorization: `Bearer ${appConfig.paystack.secretKey}`,
      'Content-Type': 'application/json',
    };
    return headers;
  }
  async makePayment(data: ITransactionData): Promise<IPaymentLinkResponse> {
    try {
      const paystackPaymentUrl = appConfig.paystack.transactionURL;
      const { paymentReference, amount, currency } = data;

      const paymentData = {
        email: data.userIdentifier,
        currency,
        amount: Number(amount) * 100,
        reference: paymentReference,
        callback_url: appConfig.paystack.callbackURL,
      };
      const request = await axios({
        method: 'post',
        url: paystackPaymentUrl,
        headers: this.setHeaders() as unknown as AxiosHeaders,
        data: paymentData,
      });
      return request.data;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async verifyPayment(transactionId: string | number) {
    try {
      const verificationUrl = `${appConfig.paystack.verificationURL}/${transactionId}`;
      const verify = await axios.get(verificationUrl, {
        headers: this.setHeaders() as unknown as AxiosHeaders,
      });
      return verify.data;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async confirmPaymentWithCallback(transactionId: string | number) {
    try {
      const { data: paystackResponse } =
        await this.verifyPayment(transactionId);
      const status = paystackResponse.status;
      if (!Object.is(status, 'success')) {
        return Promise.reject('Incomplete payment, please contact support');
      }
      return paystackResponse;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async confirmWebhook(reqBody: any, reqHeader: any) {
    try {
      const paystackSecret = appConfig.paystack.secretKey;
      const hash = crypto
        .createHmac('sha512', paystackSecret)
        .update(JSON.stringify(reqBody))
        .digest('hex');

      if (!Object.is(hash, reqHeader['x-paystack-signature'])) {
        return Promise.reject('Unknown Signature');
      }
      if (!Object.is(reqBody.event, 'charge.success')) {
        return;
      }
      const { event } = reqBody;
      const status = event.data.status as string;
      const txRef = event.data.reference as string;
      if (!Object.is(status, 'success')) {
        return Promise.reject('Incomplete payment, please contact support');
      }
      const confirmPayment = await this.verifyPayment(txRef);
      if (confirmPayment.status === 400) {
        return Promise.reject(confirmPayment.message);
      }
      return reqBody;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
