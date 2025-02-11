import { Injectable } from '@nestjs/common';
import { PaymentFactory } from './payment.factory';
import { ITransactionData } from '@/shared/interface/interface';
import { MongoDataServices } from '@/datasources/mongodb/mongodb.service';
import { IPaymentLinkResponse } from './processor.interface';
import { Request } from 'express';
import { responseHash } from '@/constants';
import { appConfig } from '@/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PaymentService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  async makePayment(body: ITransactionData): Promise<IPaymentLinkResponse> {
    try {
      body.amount = appConfig.isLive ? body.amount : 1000;
      const paymentFactory = new PaymentFactory();
      const processor = paymentFactory.getProcessor(body.processor);
      const paymentResult = await processor.makePayment(body);
      return paymentResult;
    } catch (err) {
      return Promise.reject(err);
    } finally {
      //Log the purchase order and the associated payment information
      this.logPayment(body);
    }
  }

  async logPayment(body: ITransactionData) {
    try {
      const storeData = {
        paymentReference: body.paymentReference,
        amount: body.originalAmount,
        testAmount: 1000,
        meta: body,
      };
      await this.mongoService.paymentLogs.create(storeData);
    } catch (err) {
      return;
    }
  }

  async runPaystackWebhook(req: Request) {
    try {
      const body = req.body;
      const headers = req.headers;
      const paymentFactory = new PaymentFactory();
      const processor = paymentFactory.getProcessor('paystack');
      //Confirm the webhook
      const webhookData = processor.confirmWebhook(body, headers);
      //Get the payment from the cache
      //Retrieve the particular stuff that was paid for -> Promotion and its id
      // Start a transaction but this should be for a method

      //1.  Store the payment
      // 2. Updte the promotion
      // 3. Create the campaigns
      // 4. Remove the data from cache
      // 5. Send Notification
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async runPaystackCallback(req: Request) {
    try {
      const paymentReference = req.query.reference as string;
      const paymentFactory = new PaymentFactory();
      const paystack = paymentFactory.getProcessor('paystack');
      const verificationResponse =
        await paystack.confirmPaymentWithCallback(paymentReference);

      //Retrieve the stored payment Log
      const [paymentLog] = await Promise.all([
        this.mongoService.paymentLogs.getOneWithAllFields({ paymentReference }),
      ]);

      //Check if it exists and the status is not pending
      if (!paymentLog) {
        return Promise.reject({
          ...responseHash.notFound,
          message: 'We could not find a payment with that reference',
        });
      }
      if (paymentLog.status === 'success') {
        return Promise.reject({
          ...responseHash.badPayload,
          message: 'The payment has already been processed',
        });
      }
      const paymentMeta = paymentLog.meta;
      console.log(paymentMeta);
      const eventManagerPayload = {
        paymentReference,
        paymentLogData: {
          hasBeenProcessed: true,
          providerResponse: verificationResponse.status,
          status: verificationResponse.status,
        },
        promotionData: {
          paid: true,
        },
        paymentData: {
          ...paymentMeta,
          paymentDate: new Date(verificationResponse.paid_at),
          amount: paymentMeta.originalAmount,
          //Use the email or something that links to the user to retrieve the user id
        },
      };
      this.eventEmitter.emit(
        'paystack-payment-confirmation',
        eventManagerPayload,
      );

      return 'Payment completed. We will send value once confirmed';
    } catch (err) {
      //Log any failed processing for further retry
      return Promise.reject(err);
    }
  }
}
