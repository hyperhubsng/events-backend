import {
  IPaymentHeaders,
  ITransactionData,
} from "@/shared/interface/interface";
import { IPaymentLinkResponse, PaymentProcessor } from "./processor.interface";
import { appConfig } from "@/config";
import axios, { AxiosHeaders } from "axios";

export class Flutterwave implements PaymentProcessor {
  setHeaders(): IPaymentHeaders {
    const headers = {
      Authorization: `Bearer ${appConfig.flutterWave.secretKey}`,
      "Content-Type": "application/json",
    };
    return headers;
  }
  async makePayment(data: ITransactionData): Promise<IPaymentLinkResponse> {
    try {
      const paymentUrl = appConfig.flutterWave.paymentURL;
      const { paymentReference, amount, currency, callbackUrl } = data;

      const paymentData = {
        currency,
        amount: Number(amount),
        tx_ref: paymentReference,
        customer: {
          email: data.userIdentifier,
        },
        redirect_url: callbackUrl || appConfig.flutterWave.callbackURL,
        meta: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.userIdentifier,
        },
        configurations: {
          session_duration: 2,
          max_retry_attempts: 2,
        },
      };
      const request = await axios({
        method: "post",
        url: paymentUrl,
        headers: this.setHeaders() as unknown as AxiosHeaders,
        data: paymentData,
      });
      return request.data.data.link;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async verifyPayment(transactionId: string | number) {
    try {
      const verificationUrl = `${appConfig.flutterWave.transactionsURL}/${transactionId}/verify`;
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
      const confirmationResponse = await this.verifyPayment(transactionId);
      const status = confirmationResponse.status;
      if (!Object.is(status, "success")) {
        return Promise.reject("Incomplete payment, please contact support");
      }
      return confirmationResponse;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async confirmWebhook(reqBody: any, reqHeader: any) {
    try {
      //Implementation pending
      return reqBody;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
