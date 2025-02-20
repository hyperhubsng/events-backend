import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MongoDataServices } from '@/datasources/mongodb/mongodb.service';
import { IAttendee, IPaymentData, IPaystackConfirmationEvent } from '../interface/interface';
import { Attendee } from '@/datasources/mongodb/schemas/attendee.schema';
import { Types } from 'mongoose';
import { Payment } from '@/datasources/mongodb/schemas/payment.schema';

@Injectable()
export class EventManager {
  constructor(private readonly mongoService: MongoDataServices) {}

  @OnEvent('paystack-payment-confirmation')
  async honourPaystackPayment(data: IPaystackConfirmationEvent) {
    try {
      const { paymentReference, paymentLogData, paymentData  , attendeeData} = data;
      Promise.all([
        //Update the payment Log
        this.updatePaymentLog(paymentReference, paymentLogData),
        //Add new payment information
        this.insertPayment(paymentData),
        this.insertAttendee(attendeeData) , 
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

  private insertPayment(body: IPaymentData) {
    const {charges , tickets} = body 
    const payments : Partial<Payment>[] = []
    if(charges.length > 0){
      payments.push({
        ...body , 
        amount : charges.reduce((a , b) => a + b.amount , 0) , 
        beneficiary : "platform" ,
        narration : body.narration + ": Fee charged"
        //Have an account for beneficiary which is a platform owner 
      })
    }
    payments.push({
      ...body,
      amount : tickets.reduce((a , b) => a + b.amount , 0),
      beneficiary : "user",
      beneficiaryId : tickets[0].ownerId
    })
    return this.mongoService.payments.createMany(payments);
  }
  private sendNotification() {
    return 'Implementation coming soon';
  }

  private async insertAttendee(data : IAttendee) {
    try{
      const {tickets , firstName , lastName , email , phoneNumber} = data 
      let attendeeData : Partial<Attendee>[] = []
      for(const ticket of tickets){
        attendeeData.push({
          firstName, 
          lastName,
          email,
          quantity : ticket.quantity , 
          amountPaid : ticket.amount , 
          actualAmount : ticket.amount , 
          ticketId : new Types.ObjectId(ticket.ticketId),
          eventId : ticket.eventId , 
          ownerId : ticket.ownerId,
          phoneNumber,
          title : ticket.title
        })
      }
      return await this.mongoService.attendees.createMany(attendeeData)
    }catch(error){
      return 
    }
  }
}
