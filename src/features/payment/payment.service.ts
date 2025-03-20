import { Injectable } from "@nestjs/common";
import { PaymentFactory } from "./payment.factory";
import {
  IAttendee,
  IPaymentConfirmationEvent,
  IPaymentData,
  ITransactionData,
} from "@/shared/interface/interface";
import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import { IPaymentLinkResponse } from "./processor.interface";
import { Request } from "express";
import { PAYMENT_PROCESSORS, responseHash } from "@/constants";
import { appConfig } from "@/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { Attendee } from "@/datasources/mongodb/schemas/attendee.schema";
import { Types } from "mongoose";
import { Payment } from "@/datasources/mongodb/schemas/payment.schema";

@Injectable()
export class PaymentService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly eventEmitter: EventEmitter2
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

  async runPaystackWebhook(req: Request, body: any) {
    let encounteredError = false;
    try {
      const body = req.body;
      const headers = req.headers;
      const paymentFactory = new PaymentFactory();
      const processor = paymentFactory.getProcessor(
        PAYMENT_PROCESSORS.paystack
      );
      //Confirm the webhook
      await processor.confirmWebhook(body, headers);
      const paymentReference = body.data.reference as string;
      return await this.giveCustomerValue(
        paymentReference,
        PAYMENT_PROCESSORS.paystack
      );
    } catch (err) {
      return Promise.reject(err);
    } finally {
      //If there is a failure, then log retrying of the webhook log
      let status = "completed";
      if (encounteredError) {
        status = "pending";
      }
      // await this.mongoService.paymentWebhookLogs.create({
      //   status,
      //   processor: 'paystack',
      //   body: body,
      //   headers: req.headers,
      // });
    }
  }

  async runPaystackCallback(paymentReference: string) {
    try {
      const paymentFactory = new PaymentFactory();
      const paystack = paymentFactory.getProcessor("paystack");
      const verificationResponse = await paystack.confirmPaymentWithCallback(
        paymentReference
      );

      //Retrieve the stored payment Log
      const [paymentLog] = await Promise.all([
        this.mongoService.paymentLogs.getOneWithAllFields({ paymentReference }),
      ]);

      //Check if it exists and the status is not pending
      if (!paymentLog) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "We could not find a payment with that reference",
        });
      }
      if (paymentLog.status === "success") {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "The payment has already been processed",
        });
      }
      const paymentMeta = paymentLog.meta;
      const eventManagerPayload: IPaymentConfirmationEvent = {
        paymentReference,
        paymentLogData: {
          hasBeenProcessed: true,
          providerResponse: verificationResponse.status,
          status: verificationResponse.status,
        },
        attendeeData: {
          firstName: paymentMeta.firstName,
          tickets: paymentMeta.tickets,
          lastName: paymentMeta.lastName,
          transactionReference: paymentReference,
          email: paymentMeta.email,
          phoneNumber: paymentMeta.phoneNumber,
        },
        paymentData: {
          userIdentifier: paymentMeta.email,
          paymentDate: new Date(verificationResponse.paid_at),
          amount: paymentMeta.originalAmount,
          ...paymentMeta,
        },
      };
      this.eventEmitter.emit(
        "paystack-payment-confirmation",
        eventManagerPayload
      );

      return "Payment completed. We will send value once confirmed";
    } catch (err) {
      //Log any failed processing for further retry
      return Promise.reject(err);
    }
  }

  async giveCustomerValue(paymentReference: string, processor: string) {
    try {
      const paymentFactory = new PaymentFactory();
      const paystack = paymentFactory.getProcessor(processor);
      const verificationResponse = await paystack.confirmPaymentWithCallback(
        paymentReference
      );

      //Retrieve the stored payment Log
      const [paymentLog] = await Promise.all([
        this.mongoService.paymentLogs.getOneWithAllFields({ paymentReference }),
      ]);

      //Check if it exists and the status is not pending
      if (!paymentLog) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "We could not find a payment with that reference",
        });
      }
      if (paymentLog.status === "success") {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "The payment has already been processed",
        });
      }
      const paymentMeta = paymentLog.meta;
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
        "paystack-payment-confirmation",
        eventManagerPayload
      );

      return "Payment completed. We will send value once confirmed";
    } catch (err) {
      //Log any failed processing for further retry
      return Promise.reject(err);
    }
  }

  async runPaymentCallback(req: Request) {
    try {
      const flwReference = req.query.tx_ref as string;
      const flwTransactionId = req.query.transaction_id as string;
      const paystackReference = req.query.reference as string;
      const paymentReference = flwReference || paystackReference;

      const [paymentLog] = await Promise.all([
        this.mongoService.paymentLogs.getOneWithAllFields({ paymentReference }),
      ]);
      if (!paymentLog) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "We could not find a payment with that reference",
        });
      }

      if (paymentLog.status === "success") {
        return await this.mongoService.paymentLogs.getOneWithAllFields({
          paymentReference,
        });
      }

      const processorName = paymentLog.meta.processor;
      const paymentFactory = new PaymentFactory();
      const processor = paymentFactory.getProcessor(processorName);
      const conditionChecker = processorName === "flutterWave";
      const verificationId = conditionChecker
        ? flwTransactionId
        : paymentReference;
      const verificationResponse = await processor.confirmPaymentWithCallback(
        verificationId
      );
      const verificationStatus = conditionChecker
        ? verificationResponse.data.status
        : verificationResponse.status;
      const paymentDate = conditionChecker
        ? verificationResponse.data.created_at
        : verificationResponse.paid_at;
      if (!verificationStatus.toLowerCase().startsWith("success")) {
        await this.mongoService.paymentLogs.updateOne(
          { _id: paymentLog._id },
          { status: verificationStatus }
        );
        return Promise.reject({
          ...responseHash.badPayload,
          message: "The payment was not successful",
        });
      }

      const paymentMeta = paymentLog.meta;
      const SUCCESS_STATUS = "success";

      const paymentPayload: IPaymentConfirmationEvent = {
        paymentReference,
        paymentLogData: {
          hasBeenProcessed: true,
          providerResponse: SUCCESS_STATUS,
          status: SUCCESS_STATUS,
        },
        attendeeData: {
          firstName: paymentMeta.firstName,
          tickets: paymentMeta.tickets,
          lastName: paymentMeta.lastName,
          transactionReference: paymentReference,
          email: paymentMeta.email,
          phoneNumber: paymentMeta.phoneNumber,
        },
        paymentData: {
          userIdentifier: paymentMeta.email,
          paymentDate: new Date(paymentDate),
          amount: paymentMeta.originalAmount,
          ...paymentMeta,
        },
      };
      await this.honourPayment(paymentPayload);

      return await this.mongoService.paymentLogs.getOneWithAllFields({
        paymentReference,
      });
    } catch (err) {
      //Log any failed processing for further retry
      return Promise.reject(err);
    }
  }

  async requeryPayment(paymentReference: string, user: User) {
    try {
      //Retrieve the stored payment Log
      const paymentLog =
        await this.mongoService.paymentLogs.getOneWithAllFields({
          paymentReference,
          "meta.user": user.email,
        });

      if (!paymentLog) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "There is no payment from you with that reference",
        });
      }
      if (paymentLog.status !== "success") {
        return await this.runPaystackCallback(paymentReference);
      }
      return paymentLog;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async honourPayment(data: IPaymentConfirmationEvent) {
    try {
      const { paymentReference, paymentLogData, paymentData, attendeeData } =
        data;
      return Promise.all([
        //Update the payment Log
        this.updatePaymentLog(paymentReference, paymentLogData),
        //Add new payment information
        this.insertPayment(paymentData),
        this.insertAttendee(attendeeData),
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
    const { charges, tickets } = body;
    const payments: Partial<Payment>[] = [];
    if (charges && charges.length > 0) {
      payments.push({
        ...body,
        amount: charges.reduce((a, b) => a + b.amount, 0),
        beneficiary: "platform",
        narration: body.narration + ": Fee charged",
        //Have an account for beneficiary which is a platform owner
      });
    }
    payments.push({
      ...body,
      amount: tickets.reduce((a, b) => a + b.amount, 0),
      beneficiary: "user",
      beneficiaryId: tickets[0].ownerId,
    });
    return this.mongoService.payments.createMany(payments);
  }
  private sendNotification() {
    return "Implementation coming soon";
  }

  private async insertAttendee(data: IAttendee) {
    let doesNotHaveError = true;
    const { tickets, firstName, lastName, email, phoneNumber } = data;
    const attendeeData: Partial<Attendee>[] = [];
    for (const ticket of tickets) {
      attendeeData.push({
        firstName,
        lastName,
        email,
        quantity: ticket.quantity,
        amountPaid: ticket.amount,
        actualAmount: ticket.amount,
        ticketId: new Types.ObjectId(ticket.ticketId),
        eventId: ticket.eventId,
        ownerId: ticket.ownerId,
        phoneNumber,
        title: ticket.title,
      });
    }
    try {
      return await this.mongoService.attendees.createMany(attendeeData);
    } catch (error) {
      doesNotHaveError = false;
      return;
    } finally {
      if (doesNotHaveError) {
        const { tickets } = data;
        for (const ticket of tickets) {
          await this.mongoService.tickets.updateOneOrCreateWithOldData(
            {
              _id: ticket.ticketId,
            },
            {
              $inc: {
                quantitySold: ticket.quantity,
                quantityAvailable: -ticket.quantity,
                totalAmountSold: ticket.amount,
              },
            }
          );
        }
      }
    }
  }
}
