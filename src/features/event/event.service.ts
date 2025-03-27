import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import {
  IPagination,
  ITransactionData,
  numStrObj,
} from "@/shared/interface/interface";
import HTTPQueryParser from "@/shared/utils/http-query-parser";
import { ResponseExtraData } from "@/shared/utils/http-response-extra-data";
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { PAYMENT_PROCESSORS, responseHash } from "@/constants";
import { PipelineStage, Types, _FilterQuery } from "mongoose";
import { UserService } from "../user/user.service";
import {
  AddEventDTO,
  CreateTicketDTO,
  HttpQueryDTO,
  PurchaseTicketDTO,
} from "./event.dto";
import { Event } from "@/datasources/mongodb/schemas/event.schema";
import { Ticket } from "@/datasources/mongodb/schemas/ticket.schema";
import { PaymentService } from "../payment/payment.service";
import { AxiosError } from "axios";
import { v4 as uuid } from "uuid";
import { verifyObjectId } from "@/shared/utils/verify-object-id";
import { S3Service } from "../s3/s3.service";
import { RedisService } from "@/datasources/redis/redis.service";

@Injectable()
export class EventService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly userService: UserService,
    private readonly paymentService: PaymentService,
    private readonly s3Service: S3Service,
    private readonly redisService: RedisService,
  ) {}
  async addEvent(
    files: Array<Express.Multer.File>,
    data: AddEventDTO,
    user: User,
  ) {
    try {
      const { ownerId, coordinates } = data;
      if (user.userType === "admin" && !ownerId) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "Select an organisation to create for",
        });
      }
      await this.userService.rejectUserTyype(ownerId, "admin");
      const filePromises = files.map((file) =>
        this.s3Service.putObject(`${uuid()}-${file.originalname}`, file.buffer),
      );
      const fileUrls = await Promise.all(filePromises);
      data.createdBy = user._id;
      data.ownerId = new Types.ObjectId(ownerId);
      data.images = fileUrls;
      if (coordinates) {
        data.location = {
          coordinates,
        };
      }
      return await this.mongoService.events.create(
        data as unknown as Partial<Event>,
      );
    } catch (err) {
      return Promise.reject(err);
    }
  }

  httpQueryFormulator(
    httpQuery: HttpQueryDTO,
    user?: User,
  ): Record<string, numStrObj> {
    let query: Record<string, numStrObj> = {};
    if (httpQuery.q) {
      const queryTerm = httpQuery.q;
      query = {
        $or: [
          {
            category: new RegExp(`^${queryTerm}$`, "i"),
          },
          {
            title: new RegExp(`^${queryTerm}$`, "i"),
          },
        ],
      };
    }
    if (httpQuery.country) {
      query = {
        ...query,
        country: new RegExp(`^${httpQuery.country}$`, "i"),
      };
    }
    if (httpQuery.cost) {
      query = {
        ...query,
        cost: Number(httpQuery.cost),
      };
    }
    if (httpQuery.lat && httpQuery.long && httpQuery.distance) {
      query = {
        ...query,
        distance: httpQuery.distance * 1000,
        userLocation: [httpQuery.lat, httpQuery.long],
      };
    }

    if (httpQuery.status) {
      query = {
        ...query,
        status: httpQuery.status,
      };
      if (query.status === "past") {
        query.startDate = {
          $lte: new Date(),
        };
      }
      if (query.status === "upcoming") {
        query.startDate = {
          $gte: new Date(),
        };
      }
    }
    if (httpQuery.owner) {
      query = {
        ...query,
        ownerId: new Types.ObjectId(httpQuery.owner),
      };
    }
    return query;
  }

  async listEvents(req: Request, httpQuery: HttpQueryDTO, user?: User) {
    try {
      const { skip, docLimit, dbQueryParam } = HTTPQueryParser(req.query);

      const query = this.httpQueryFormulator(httpQuery, user);
      if (dbQueryParam.createdAt) {
        query.startDate = dbQueryParam.createdAt;
      } else if (!user) {
        query.startDate = {
          $gte: new Date(),
        };
      }
      const queryResult = await this.aggregateEvent(query, skip, docLimit);
      const queryCount = await this.mongoService.events.count(query);
      const extraData: IPagination = ResponseExtraData(req, queryCount);

      return {
        status: "success",
        data: queryResult,
        extraData: extraData,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async aggregateEvent(query: any, skip: number = 0, limit: number = 1000) {
    try {
      let geoQueryStage: PipelineStage[] = [];
      if (query.distance) {
        geoQueryStage = [
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: query.userLocation ? query.userLocation : [],
              },
              maxDistance: query.distance,
              distanceField: "distance",
              spherical: true,
            },
          },
        ];
        delete query.userLocation;
        delete query.distance;
      }

      const result = await this.mongoService.events.aggregateRecords([
        ...geoQueryStage,
        {
          $match: query,
        },
        {
          $lookup: {
            from: "users",
            let: {
              userId: "$ownerId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$userId"],
                  },
                },
              },
              {
                $project: {
                  firstName: 1,
                  lastName: 1,
                  email: 1,
                  phoneNumber: 1,
                  companyName: 1,
                  country: 1,
                },
              },
            ],
            as: "organizationData",
          },
        },
        {
          $unwind: "$organizationData",
        },
        {
          $lookup: {
            from: "tickets",
            let: {
              eventId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$eventId", "$$eventId"],
                  },
                },
              },
            ],
            as: "tickets",
          },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async findEvent(req: Request, httpQuery: HttpQueryDTO, user?: User) {
    try {
      const { skip, docLimit, dbQueryParam } = HTTPQueryParser(req.query);

      const query = this.httpQueryFormulator(httpQuery, user);
      if (dbQueryParam.createdAt) {
        query.startDate = dbQueryParam.createdAt;
      }
      const queryResult = await this.aggregateEvent(query, skip, docLimit);
      const queryCount = await this.mongoService.events.count(query);
      const extraData: IPagination = ResponseExtraData(req, queryCount);

      return {
        status: "success",
        data: queryResult,
        extraData: extraData,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async getOneEvent(query: Record<string, any>): Promise<Event> {
    try {
      const result = await this.aggregateEvent(query);
      if (result.length === 0) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "Event not found",
        });
      }
      return result[0];
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async createTicket(data: CreateTicketDTO, user: User, eventId: string) {
    try {
      const { title } = data;
      const lowerTitle = title.toLocaleLowerCase();
      const event = await this.getOneEvent({
        _id: new Types.ObjectId(eventId),
      });
      //If the event has expired, reject date creation
      const currentTime = new Date().getTime();
      const eventEndTime = new Date(event.endDate).getTime();
      if (
        !["upcoming", "pending"].includes(event.status) ||
        currentTime > eventEndTime
      ) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "Event has ended",
        });
      }
      if (
        user.userType !== "admin" &&
        String(event.ownerId) !== String(user._id)
      ) {
        return Promise.reject({
          ...responseHash.forbiddenAction,
        });
      }
      const isReadyTicket = await this.getTicket({
        eventId: new Types.ObjectId(eventId),
        title: lowerTitle,
      });

      if (isReadyTicket) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "A ticket with the same name for the same event exists",
        });
      }
      const eventTicketsKey = `events:${eventId}:tickets`;
      const eventTickets = await this.redisService.get(eventTicketsKey);

      data.eventId = event._id;
      data.ownerId = event.ownerId;
      const ticket = await this.mongoService.tickets.create(data);
      if (eventTickets) {
        await this.redisService.remove(eventTicketsKey);
        if (event.status !== "upcoming") {
          await this.mongoService.events.updateOne(
            { _id: eventId },
            { status: "upcoming" },
          );
        }
      }

      return ticket;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getTicket(query: _FilterQuery<Ticket>): Promise<Ticket> {
    try {
      return this.mongoService.tickets.getOneWithAllFields(query);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async aggregateTickets(query: any, skip: number = 0, limit: number = 1000) {
    try {
      const result = await this.mongoService.tickets.aggregateRecords([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "attendees",
            let: {
              ticketId: "$ticketId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$ticketId", "$$ticketId"],
                  },
                },
              },
            ],
            as: "attendees",
          },
        },
        {
          $project: {
            attendees: 1,
            ticketId: "$_id",
            eventId: 1,
            ownerId: 1,
            title: 1,
            isAvailable: 1,
            hasDiscount: 1,
            discountValue: {
              $cond: [
                {
                  $gt: ["$discountValue", null],
                },
                "$discountValue",
                "",
              ],
            },
            discountType: {
              $cond: [
                {
                  $gt: ["$discountType", null],
                },
                "$discountType",
                "",
              ],
            },
            quantity: 1,
            availableTickets: {
              $cond: [
                {
                  $gt: ["$available", null],
                },
                "$available",
                "$quantity",
              ],
            },
            soldTickets: {
              $cond: [
                {
                  $gt: ["$discountType", null],
                },
                "$discountType",
                0,
              ],
            },
            orderLimit: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async listTickets(req: Request, eventId: string, user?: User) {
    try {
      const { skip, docLimit } = HTTPQueryParser(req.query);
      const query = {
        eventId: new Types.ObjectId(eventId),
      };
      await this.getOneEvent({
        _id: new Types.ObjectId(eventId),
      });

      const eventTicketsKey = `events:${eventId}:tickets`;
      const cachedEvent = await this.redisService.get(eventTicketsKey);
      if (cachedEvent) {
        return JSON.parse(cachedEvent);
      }

      const queryResult = await this.aggregateTickets(query, skip, docLimit);
      await this.redisService.setEx(
        eventTicketsKey,
        JSON.stringify(queryResult),
        60 * 60 * 24,
      );
      return queryResult;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async buyTicket(eventId: string, body: PurchaseTicketDTO) {
    try {
      const { tickets, charges } = body;
      const query: Record<string, any> = {
        _id: new Types.ObjectId(eventId),
      };
      const event = await this.getOneEvent(query);
      const currentTime = Date.now();
      if (currentTime > new Date(event.startDate).getTime()) {
        return Promise.reject({
          ...responseHash.notFound,
          message: `Event currently not in sale`,
        });
      }
      const totalCharges: number = charges
        ? charges.reduce((a, b) => a + b.amount, 0)
        : 0;

      let totalAmount = 0;
      for (const ticket of tickets) {
        const t = await this.getTicket({
          _id: new Types.ObjectId(ticket.ticketId),
        });
        //Confirm that the ticket exists
        if (!t) {
          return Promise.reject({
            ...responseHash.notFound,
            message: `Tickets you selected were not found`,
          });
        }
        if (t.quantityAvailable === 0) {
          return Promise.reject({
            ...responseHash.notFound,
            message: "Sold out",
          });
        }
        if (!t.isAvailable) {
          return Promise.reject({
            ...responseHash.badPayload,
            message: `${t.title} is already sold out`,
          });
        }
        //Confirm that the ticket is still available
        if (ticket.quantity > t.orderLimit) {
          const quantityAvailable = t.quantityAvailable || 0;
          return Promise.reject({
            ...responseHash.badPayload,
            message: `You can only purchase ${t.orderLimit} tickets of ${t.title}. ${quantityAvailable} tickets still available  `,
          });
        }

        ticket.amount = ticket.quantity * t.price;
        ticket.title = t.title;
        ticket.eventId = t.eventId;
        ticket.ownerId = t.ownerId;
        totalAmount += ticket.amount;
      }

      totalAmount += totalCharges;
      const processor = body.paymentProcessor || PAYMENT_PROCESSORS.flutterWave;
      const paymentData: ITransactionData = {
        paymentReference: uuid(),
        currency: "NGN",
        processor,
        narration: `Payment for Event ${event.title} `,
        user: body.email,
        amount: totalAmount,
        paymentMethod: "web",
        status: "pending",
        transactionDate: new Date(),
        transactionType: "debit",
        userIdentifier: body.email,
        productId: new Types.ObjectId(eventId),
        productTitle: "events",
        originalAmount: totalAmount,
        beneficiaryId: event.ownerId,
        ...body,
      };
      //Make Payment
      const getPaymentLink = await this.paymentService.makePayment(paymentData);
      //The end goal of this process is to return a payment link
      return {
        hasPaymentLink: true,
        paymentLink: getPaymentLink,
      };
    } catch (err) {
      if (err instanceof AxiosError) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "Unable to make payment now",
        });
      }
      return Promise.reject(err);
    }
  }

  async getSalesReport(eventId: string, req: Request, user?: User) {
    try {
      const { skip, docLimit, dbQueryParam } = HTTPQueryParser(req.query);
      const query: Record<string, any> = {
        eventId: new Types.ObjectId(eventId),
      };
      if (dbQueryParam.createdAt) {
        query.createdAt = dbQueryParam.createdAt;
      }
      if (dbQueryParam.createdAt) {
        query.createdAt = dbQueryParam.createdAt;
      }
      if (req.query.ticketId) {
        query.ticketId = new Types.ObjectId(eventId);
      }
      const statsQuery: Record<string, any> = {};
      if (req.query.ticket && req.query.ticket === "all") {
        statsQuery.eventId = new Types.ObjectId(eventId);
      }
      if (req.query.ticket && req.query.ticket !== "all") {
        const ticketId = req.query.ticket as string;
        verifyObjectId(ticketId);
        statsQuery._id = new Types.ObjectId(ticketId);
        query.ticketId = new Types.ObjectId(ticketId);
      }
      if (Object.values(statsQuery).length === 0) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "Please,provide queries for the stats",
        });
      }

      const queryResult = await this.aggregateEventSales(query, skip, docLimit);
      const statsQueryResult = await this.getTicketSalesSummary(statsQuery);
      const queryCount = await this.mongoService.attendees.count(query);
      const extraData: IPagination = ResponseExtraData(req, queryCount);

      return {
        status: "success",
        data: {
          stats: this.prepareEventStats(statsQueryResult),
          sales: queryResult,
        },
        extraData: extraData,
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getEventAttendees(eventId: string, req: Request, user?: User) {
    try {
      const { skip, docLimit, dbQueryParam } = HTTPQueryParser(req.query);
      const transformedEventId = new Types.ObjectId(eventId);
      const query: Record<string, any> = {
        eventId: transformedEventId,
      };
      if (dbQueryParam.createdAt) {
        query.createdAt = dbQueryParam.createdAt;
      }
      if (dbQueryParam.createdAt) {
        query.createdAt = dbQueryParam.createdAt;
      }
      if (req.query.ticketId) {
        query.ticketId = new Types.ObjectId(eventId);
      }
      const statsQuery: Record<string, any> = {};
      if (req.query.ticket && req.query.ticket === "all") {
        statsQuery.eventId = transformedEventId;
      }
      if (req.query.ticket && req.query.ticket !== "all") {
        const ticketId = req.query.ticket as string;
        verifyObjectId(ticketId);
        statsQuery._id = new Types.ObjectId(ticketId);
        query.ticketId = new Types.ObjectId(ticketId);
      }
      if (Object.values(statsQuery).length === 0) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "Please,provide queries for the stats",
        });
      }

      const [queryResult, queryCount, totalCheckin] = await Promise.all([
        this.aggregateEventSales(query, skip, docLimit),
        this.mongoService.attendees.count(query),
        this.mongoService.attendees.count({
          eventId: transformedEventId,
          isChecked: true,
        }),
      ]);

      const extraData: IPagination = ResponseExtraData(req, queryCount);
      return {
        status: "success",
        data: {
          guests: queryResult,
          stats: {
            totalTickets: queryCount,
            totalCheckin: totalCheckin,
          },
        },
        extraData: extraData,
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private prepareEventStats(statsArray: Record<string, any>[]) {
    if (statsArray.length === 0) {
      return {
        totalSales: 0,
        ticketSold: 0,
        category: 0,
        totalReceived: 0,
      };
    }
    return statsArray[0];
  }
  async aggregateEventSales(
    query: any,
    skip: number = 0,
    limit: number = 1000,
  ) {
    try {
      const result = await this.mongoService.attendees.aggregateRecords([
        {
          $match: query,
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getTicketSalesSummary(query: any) {
    try {
      const groupId = query.eventId || query._id;
      const result = await this.mongoService.tickets.aggregateRecords([
        {
          $match: query,
        },
        {
          $group: {
            _id: groupId,
            totalSales: {
              $sum: "$totalAmountSold",
            },
            ticketSold: {
              $sum: "$quantitySold",
            },
            category: {
              $count: {},
            },
            totalReceived: {
              $sum: "$totalAmountReceived",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalReceived: "$totalReceived",
            category: "$category",
            ticketSold: "$ticketSold",
            totalSales: "$totalSales",
          },
        },
      ]);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
