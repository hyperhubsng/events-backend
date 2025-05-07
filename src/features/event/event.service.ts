import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import {
  IPagination,
  ITicket,
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
  RemoveEventImagesDTO,
} from "./event.dto";
import { Event } from "@/datasources/mongodb/schemas/event.schema";
import { Ticket } from "@/datasources/mongodb/schemas/ticket.schema";
import { PaymentService } from "../payment/payment.service";
import { AxiosError } from "axios";
import { v4 as uuid } from "uuid";
import { verifyObjectId } from "@/shared/utils/verify-object-id";
import { S3Service } from "../s3/s3.service";
import { RedisService } from "@/datasources/redis/redis.service";
import { Discount } from "@/datasources/mongodb/schemas/discount.schema";
import { dateParser } from "@/shared/utils/date-parser";
import { DiscountService } from "../discount/discount.service";

@Injectable()
export class EventService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly userService: UserService,
    private readonly paymentService: PaymentService,
    private readonly s3Service: S3Service,
    private readonly redisService: RedisService,
    private readonly discountService: DiscountService,
  ) {}
  private slugifyEventTitle(title: string) {
    return title
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  private async isSlugExists(slug: string) {
    return await this.mongoService.events.getOneWithAllFields({ slug });
  }

  async generateUniqueSlug(title: string) {
    const baseSlug = this.slugifyEventTitle(title);
    let slug = baseSlug;
    let count = 1;

    while (await this.isSlugExists(slug)) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    return slug;
  }
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

      const slug = await this.generateUniqueSlug(data.title);

      await this.userService.rejectUserTyype(ownerId, "admin");
      const filePromises = files.map((file) =>
        this.s3Service.putObject(`${uuid()}-${file.originalname}`, file.buffer),
      );
      const fileUrls = await Promise.all(filePromises);
      data.createdBy = user._id;
      data.ownerId = new Types.ObjectId(ownerId);
      data.images = fileUrls;
      data.slug = slug;

      if (coordinates) {
        data.location = {
          coordinates,
        };
      }
      if (data.tickets) {
        data.status = "upcoming";
      }
      const event = await this.mongoService.events.create(
        data as unknown as Partial<Event>,
      );
      if (data.tickets) {
        const ticketList: ITicket[] = [];
        for (const ticket of data.tickets) {
          ticketList.push({
            ...ticket,
            eventId: event._id,
            ownerId: event.ownerId,
          });
        }
        await this.mongoService.tickets.createMany(ticketList);
      }
      return await this.getOneEvent({ _id: event._id });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async editEvent(
    files: Array<Express.Multer.File>,
    id: string,
    data: AddEventDTO,
    user: User,
  ) {
    try {
      const { ownerId, coordinates } = data;
      const eventId = new Types.ObjectId(id);
      const eventQuery: Record<string, any> = {
        _id: eventId,
      };
      if (!["admin", "superadmin", "adminUser"].includes(user.userType)) {
        eventQuery.ownerId = user._id;
      }
      const event = await this.getOneEvent(eventQuery);
      if (user.userType === "admin" && !ownerId) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "Select an organisation to create for",
        });
      }

      if (files && files.length > 0) {
        const filePromises = files.map((file) =>
          this.s3Service.putObject(
            `${uuid()}-${file.originalname}`,
            file.buffer,
          ),
        );
        const fileUrls = await Promise.all(filePromises);
        data.images = event.images.concat(...fileUrls);
      }

      if (coordinates) {
        data.location = {
          coordinates,
        };
      }

      if (data.tickets) {
        const newticketList: ITicket[] = [];
        for (const ticket of data.tickets) {
          if (ticket.ticketId) {
            await this.updateTicket(
              ticket.ticketId,
              ticket as unknown as CreateTicketDTO,
              user,
            );
            continue;
          }
          newticketList.push({
            ...ticket,
            eventId: event._id,
            ownerId: event.ownerId,
          });
        }
        await this.mongoService.tickets.createMany(newticketList);
      }
      await this.mongoService.events.updateOneOrCreateWithOldData(
        eventQuery,
        data,
      );
      return await this.getOneEvent({ _id: event._id });
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
        // status: httpQuery.status,
      };
      if (httpQuery.status === "past") {
        query.startDate = {
          $lte: new Date(),
        };
      }
      if (httpQuery.status === "active") {
        const currentDate = new Date();
        const yearMonthDate = dateParser(currentDate);
        const startOfToday = new Date(yearMonthDate);

        query.startDate = {
          $gte: startOfToday,
          $lte: currentDate,
        };
      }
      if (httpQuery.status === "upcoming") {
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
          $lookup: {
            from: "discounts",
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
            as: "discounts",
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
              ticketId: "$_id",
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
          $lookup: {
            from: "discounts",
            let: {
              ticketId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$ticketId", "$$ticketId"],
                  },
                },
              },
              {
                $project: {
                  discounType: 1,
                  status: 1,
                  value: 1,
                  hasUsageLimit: 1,
                  usageLimit: 1,
                  hasMaxCap: 1,
                  maxCap: 1,
                },
              },
            ],
            as: "discount",
          },
        },
        {
          $unwind: {
            path: "$discount",
            preserveNullAndEmptyArrays: true,
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
            discount: {
              $ifNull: ["$discount", null],
            },
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
      // const cachedEvent = await this.redisService.get(eventTicketsKey);
      // if (cachedEvent) {
      //   return JSON.parse(cachedEvent);
      // }
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

  async isEventStillActive(event: Event) {
    try {
      const currentTime = Date.now();
      if (currentTime > new Date(event.startDate).getTime()) {
        return Promise.reject({
          ...responseHash.notFound,
          message: `Event currently not in sale`,
        });
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }
  async blockActionOnDeletedEvent(event: Event) {
    try {
      if (event.softDelete) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "This event is not available",
        });
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async getEventDiscount(event: Event, discountCode: string) {
    try {
      const discount = await this.mongoService.discounts.getOneWithAllFields({
        code: discountCode,
        eventId: event._id,
        status: true,
      });

      if (discountCode && !discount) {
        return Promise.reject({
          ...responseHash.notFound,
          message: `Discount code ${discountCode} is invalid`,
        });
      }
      return discount;
    } catch (e) {
      return Promise.reject(e);
    }
  }
  async enforceTicketSellingConditions(isTicket: Ticket, ticket: ITicket) {
    try {
      if (!isTicket) {
        return Promise.reject({
          ...responseHash.notFound,
          message: `Tickets you selected were not found`,
        });
      }
      const { quantityAvailable, orderLimit, isAvailable, title } = isTicket;
      if (quantityAvailable === 0) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "Sold out",
        });
      }
      if (!isAvailable) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: `${title} is already sold out`,
        });
      }
      //Confirm that the ticket is still available
      if (ticket.quantity > orderLimit) {
        const availableUnits = quantityAvailable || 0;
        return Promise.reject({
          ...responseHash.badPayload,
          message: `You can only purchase ${orderLimit} tickets of ${title}. ${availableUnits} tickets still available  `,
        });
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async applyDiscount(
    ticket: ITicket,
    discount: Discount,
    ticketQuantity: number,
    ticketPrice: number,
  ) {
    try {
      let discountAmount = 0;
      let quantity = ticketQuantity;
      if (discount && String(ticket.ticketId) === String(discount.ticketId)) {
        const currentTime = Date.now();
        const startTime = new Date(discount.startDate).getTime();
        const endTime = new Date(discount.endDate).getTime();

        if (discount.hasUsageLimit && ticketQuantity > discount.usageLimit) {
          quantity = discount.usageLimit;
        }
        if (
          discount.startDate &&
          discount.endDate &&
          (currentTime < startTime || currentTime > endTime)
        ) {
          return Promise.reject({
            ...responseHash.badPayload,
            message: `Discount is not currently active`,
          });
        }
        switch (discount.discountType) {
          case "percent":
            discountAmount = (discount.value * ticketPrice * quantity) / 100;
            break;
          default:
            discountAmount = discount.value * quantity;
        }

        if (discount.hasMaxCap && discountAmount > discount.maxCap) {
          discountAmount = discount.maxCap;
        }
      }
      return discountAmount;
    } catch (e) {
      return Promise.reject(e);
    }
  }
  async computeTicketAmount(
    eventId: Types.ObjectId,
    tickets: ITicket[],
    discount: Discount,
  ): Promise<{
    totalAmount: number;
    computedTickets: ITicket[];
    totalDiscount: number;
  }> {
    try {
      let totalAmount = 0;
      let totalDiscount = 0;
      for (const ticket of tickets) {
        const isTicket = await this.getTicket({
          _id: new Types.ObjectId(ticket.ticketId),
          eventId,
        });

        await this.enforceTicketSellingConditions(isTicket, ticket);
        ticket.amount = ticket.quantity * isTicket.price;
        ticket.title = isTicket.title;
        ticket.eventId = isTicket.eventId;
        ticket.ownerId = isTicket.ownerId;
        const discountAmount = await this.applyDiscount(
          ticket,
          discount,
          ticket.quantity,
          isTicket.price,
        );

        totalDiscount += discountAmount;
        totalAmount = totalAmount + ticket.amount - discountAmount;
      }
      return {
        totalAmount,
        computedTickets: tickets,
        totalDiscount,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }
  prepareTicketPurchaseData(
    body: PurchaseTicketDTO,
    computedTickets: ITicket[],
    event: Event,
    totalAmount: number,
  ) {
    try {
      const eventTitle = event.title;
      const eventId = event._id;
      const processor = body.paymentProcessor || PAYMENT_PROCESSORS.flutterWave;
      body.tickets = computedTickets;
      const paymentData: ITransactionData = {
        paymentReference: uuid(),
        currency: "NGN",
        processor,
        narration: `Payment for Event ${eventTitle} `,
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
      return paymentData;
    } catch (e) {
      throw new Error(e);
    }
  }
  async buyTicket(eventId: string, body: PurchaseTicketDTO) {
    try {
      const { tickets, charges, discountCode } = body;
      const query: Record<string, any> = {
        _id: new Types.ObjectId(eventId),
      };
      const event = await this.getOneEvent(query);

      await Promise.all([
        this.isEventStillActive(event),
        this.blockActionOnDeletedEvent(event),
      ]);

      const totalCharges: number = charges
        ? charges.reduce((a, b) => a + b.amount, 0)
        : 0;
      const discount = await this.getEventDiscount(event, discountCode);
      let { totalAmount, computedTickets, totalDiscount } =
        await this.computeTicketAmount(event._id, tickets, discount);
      totalAmount += totalCharges;
      body.discountAmount = totalDiscount;
      body.discountCode = discountCode;
      body.hasDiscount = discountCode ? true : false;
      const paymentData = this.prepareTicketPurchaseData(
        body,
        computedTickets,
        event,
        totalAmount,
      );
      const getPaymentLink = await this.paymentService.generatePaymentLink(
        paymentData,
      );
      return {
        hasPaymentLink: true,
        paymentLink: getPaymentLink,
        amount: totalAmount + totalDiscount,
        charges: totalCharges,
        discountAmount: totalDiscount,
        amountToPay: totalAmount,
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

  async removeEvent(id: string, user: User) {
    try {
      const eventId = new Types.ObjectId(id);
      const eventQuery: Record<string, any> = {
        _id: eventId,
      };

      if (!["admin", "superadmin", "adminUser"].includes(user.userType)) {
        eventQuery.ownerId = user._id;
      }
      const event = await this.getOneEvent(eventQuery);
      if (event.softDelete) {
        return Promise.reject({
          ...responseHash.forbiddenAction,
          message: "Event already deleted",
        });
      }
      //Check if someone has paid for this event
      const doesEventHaveAttendee =
        await this.mongoService.attendees.getOneWithAllFields({
          eventId: eventId,
        });
      if (doesEventHaveAttendee) {
        //Do Soft Delete
        await this.mongoService.events.updateOne(eventQuery, {
          $set: {
            softDelete: true,
          },
        });
        return {};
      }
      //When an Event is Deleted, remove the assets for that event
      await Promise.all([
        this.mongoService.tickets.deleteMany({ eventId }),
        this.mongoService.events.deleteOne(eventQuery),
      ]);
      return {};
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async removeTicket(id: string, user: User) {
    try {
      const ticketId = new Types.ObjectId(id);
      const ticketQuery: Record<string, any> = {
        _id: ticketId,
      };

      if (!["admin", "superadmin", "adminUser"].includes(user.userType)) {
        ticketQuery.ownerId = user._id;
      }
      const ticket = await this.getTicket(ticketQuery);
      if (ticket.softDelete) {
        return Promise.reject({
          ...responseHash.forbiddenAction,
          message: "Ticket already deleted",
        });
      }
      //Check if someone has paid for this event
      const doesTicketHaveAttendee =
        await this.mongoService.attendees.getOneWithAllFields({
          ticketId: ticket._id,
        });
      if (doesTicketHaveAttendee) {
        //Do Soft Delete
        await this.mongoService.tickets.updateOne(ticketQuery, {
          $set: {
            softDelete: true,
          },
        });
        return {};
      }

      await this.mongoService.tickets.deleteOne(ticketQuery);
      return {};
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async updateTicket(id: string, data: CreateTicketDTO, user: User) {
    try {
      const ticketId = new Types.ObjectId(id);
      const ticketQuery: Record<string, any> = {
        _id: ticketId,
      };

      if (!["admin", "superadmin", "adminUser"].includes(user.userType)) {
        ticketQuery.ownerId = user._id;
      }
      const ticket = await this.getTicket(ticketQuery);
      if (ticket.softDelete) {
        return Promise.reject({
          ...responseHash.forbiddenAction,
          message: "Ticket already deleted",
        });
      }
      if (data.quantity && data.quantity < ticket.quantity) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "New quantity cannot be lesser than orinal quantity",
        });
      }
      if (data.quantity) {
        const difference = data.quantity - ticket.quantity;
        data.quantityAvailable = ticket.quantityAvailable + difference;
      }
      return await this.mongoService.tickets.updateOneOrCreate(
        ticketQuery,
        data,
      );
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async removeEventImages(
    id: string,
    data: RemoveEventImagesDTO,
    user: User,
  ): Promise<string[]> {
    try {
      const { query, event } = await this.getEventForOwner(id, user);
      const { imagesToKeep, imagesToRemove } = this.prepareImagesForProcessing(
        event,
        data.images,
      );
      await Promise.all([
        this.mongoService.events.updateOneOrCreate(query, {
          $set: {
            images: imagesToKeep,
          },
        }),
        this.removeImagesFromAWS(imagesToRemove),
      ]);
      return imagesToKeep;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async getEventForOwner(
    id: string,
    user: User,
  ): Promise<{ event: Event; query: Record<string, any> }> {
    try {
      const eventId = new Types.ObjectId(id);
      const query: Record<string, any> = {
        _id: eventId,
      };

      if (!["admin", "superadmin", "adminUser"].includes(user.userType)) {
        query.ownerId = user._id;
      }
      const event = await this.getOneEvent(query);
      return {
        event,
        query,
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async removeImagesFromAWS(imagesToRemove: string[]) {
    try {
      const filePromises = imagesToRemove.map((image: string) =>
        this.s3Service.deleteObject(`${image}`),
      );
      await Promise.all(filePromises);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  prepareImagesForProcessing(
    event: Event,
    images: string[],
  ): { imagesToKeep: string[]; imagesToRemove: string[] } {
    try {
      const eventImages = event.images || [];
      const validImages = new Set(eventImages);
      const givenImageSet = new Set(images);
      const imagesToRemain = [];
      const imagesToRemove = [];
      for (const image of validImages.values()) {
        if (givenImageSet.has(image)) {
          imagesToRemove.push(image);
          continue;
        }
        imagesToRemain.push(image);
      }
      return {
        imagesToKeep: imagesToRemain,
        imagesToRemove,
      };
    } catch (err) {
      throw new Error(err);
    }
  }

  async getEventDiscounts(eventId: string) {
    try {
      return await this.discountService.getDiscountWithAnyParam({
        eventId: new Types.ObjectId(eventId),
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
