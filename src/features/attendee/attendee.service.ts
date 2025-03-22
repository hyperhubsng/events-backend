import { Injectable } from "@nestjs/common";
import {
  IAttendee,
  IPaymentConfirmationEvent,
  IPaymentData,
  ITransactionData,
} from "@/shared/interface/interface";
import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import e, { Request } from "express";
import {
  PAYMENT_PROCESSORS,
  TICKET_PURCHASE_MESSAGE,
  responseHash,
} from "@/constants";
import { appConfig } from "@/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { Attendee } from "@/datasources/mongodb/schemas/attendee.schema";
import { Types } from "mongoose";
import { Payment } from "@/datasources/mongodb/schemas/payment.schema";
import { toDataURL } from "qrcode";
import { AwsService } from "../aws/aws.service";
import { randomInt } from "crypto";
import { HttpQueryDTO } from "./attendee.dto";
import { EventService } from "../event/event.service";

@Injectable()
export class AttendeeService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly eventEmitter: EventEmitter2,
    private readonly eventService: EventService
  ) {}

  async manageGuest(attendeeCode: string, query: HttpQueryDTO, user: User) {
    try {
      const attendee: Attendee =
        await this.mongoService.attendees.getOneWithAllFields({
          passCode: attendeeCode,
        });
      if (!attendee) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "No Ticket with that code found",
        });
      }
      if (query.action === "view") {
        return {
          attendee,
        };
      }
      if (attendee.ticketsChecked == attendee.quantity) {
        return {
          message: "Already checked",
          attendee,
        };
      }
      const event = await this.eventService.getOneEvent({
        _id: attendee.eventId,
      });

      const actor = `${user.firstName} ${user.lastName}`;
      const recipient = `${attendee.firstName} ${attendee.lastName}`;

      await this.mongoService.attendees.updateOne(
        {
          _id: attendee._id,
        },
        {
          $set: {
            isChecked: true,
          },
          $inc: {
            ticketsChecked: 1,
          },
        }
      );
      await this.mongoService.eventLogs.create({
        meta: {
          checkedBy: `${user.firstName} ${user.lastName}`,
          checkerId: user._id,
          checkerType: user.userType,
          checkinDate: new Date(),
          method: query.actionType,
        },
        title: "checkin",
        description: `${actor} checks in ${recipient} for ${event.title} `,
        actor: user._id,
        category: "ticket",
        eventId: event._id,
        ticketId: attendee.ticketId,
      });

      return "Ticket Checked Successfully";
    } catch (err) {
      return;
    }
  }
}
