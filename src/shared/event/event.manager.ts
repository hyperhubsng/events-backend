import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MongoDataServices } from '@/datasources/mongodb/mongodb.service';
import { IPaystackConfirmationEvent } from '../interface/interface';

@Injectable()
export class EventManager {
  constructor(private readonly mongoService: MongoDataServices) {}

  @OnEvent('paystack-payment-confirmation')
  async honourPaystackPayment(data: IPaystackConfirmationEvent) {
    try {
      const { paymentReference, paymentLogData, paymentData } = data;
      Promise.all([
        //Update the payment Log
        this.updatePaymentLog(paymentReference, paymentLogData),
        //Add new payment information
        this.insertPayment(paymentData),
        //Dispatch notification
        this.sendNotification(),
      ]);
    } catch (err) {
      //Store for Retry
      //Notify to be aware of the error nature so as to address
      return;
    }
  }

  private updatePaymentLog(paymentReference: string, body: any) {
    return this.mongoService.paymentLogs.updateOne({ paymentReference }, body);
  }

  private insertPayment(body: any) {
    return this.mongoService.payments.create(body);
  }
  private sendNotification() {
    return 'Implementation coming soon';
  }
}
