import { MongoDataServices } from '@/datasources/mongodb/mongodb.service';
import { User } from '@/datasources/mongodb/schemas/user.schema';
import { IPagination, ITransactionData, numStrObj } from '@/shared/interface/interface';
import HTTPQueryParser from '@/shared/utils/http-query-parser';
import { ResponseExtraData } from '@/shared/utils/http-response-extra-data';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { responseHash } from '@/constants';
import { PipelineStage, Types, _FilterQuery } from 'mongoose';
import { UserService } from '../user/user.service';
import { AddEventDTO, CreateTicketDTO, HttpQueryDTO, PurchaseTicketDTO } from './event.dto';
import { Event } from '@/datasources/mongodb/schemas/event.schema';
import { Ticket } from '@/datasources/mongodb/schemas/ticket.schema';
import { PaymentService } from '../payment/payment.service';
import { AxiosError } from 'axios';
import { v4 as uuid } from 'uuid';
import { verifyObjectId } from '@/shared/utils/verify-object-id';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class EventService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly userService: UserService,
    private readonly paymentService : PaymentService , 
    private readonly s3Service : S3Service
  ) {}
  async addEvent(files: Array<Express.Multer.File>, data : AddEventDTO , user : User) {
    try {
        const {ownerId , coordinates} = data 
        if(user.userType === "admin" && !ownerId){
            return Promise.reject({
                ...responseHash.badPayload , 
                message : "Select an organisation to create for"
            })
        }
        await this.userService.rejectUserTyype(ownerId , "admin")
        const filePromises = files.map(file => this.s3Service.putObject(`${uuid()}-${file.originalname}` , file.buffer))
        const fileUrls = await Promise.all(filePromises)
        data.createdBy = user._id 
        data.ownerId = new Types.ObjectId(ownerId)
        data.images = fileUrls
        if(coordinates){
            data.location = {
                coordinates 
            }
        }
        return await this.mongoService.events.create(data as unknown as Partial<Event>)
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async uploadDisco(
    req: Request,
    files: Array<Express.Multer.File>
  ) {
    let errorFileTracker 
    let hasError = false 
    try {
      //const newFileName = `${uuidv4()}-${originalname}`;
      const filePromises = files.map(file => this.s3Service.putObject(file.originalname , file.buffer))
      const fileUrls = await Promise.all(filePromises)
      errorFileTracker = fileUrls 
      return fileUrls
    } catch (err) {
      hasError = true 
      return Promise.reject(err);
    }finally{
      //If there is an error , delete the files 
      if(hasError){
        //delete the files 
      }
    }
  }

    httpQueryFormulator(httpQuery : HttpQueryDTO , user?:User) : Record<string , numStrObj> {
    let query: Record<string, numStrObj> = {};
    if (httpQuery.q) {
      const queryTerm = httpQuery.q
      query = {
        $or : [
          {
            category :  new RegExp(`^${queryTerm}$`, "i"), 
          },
          {
            name :  new RegExp(`^${queryTerm}$`, "i"), 
          }
        ]
      };
    } 
    if (httpQuery.country) {
        query = {
          ...query , 
          country :  new RegExp(`^${httpQuery.country}$`, "i"), 
        };
    } 
    if (httpQuery.cost) {
        query = {
          ...query , 
          cost :  Number(httpQuery.cost) 
        };
    } 
    if(httpQuery.lat && httpQuery.long && httpQuery.distance){
      query = {
        ...query, 
        distance : httpQuery.distance  * 1000,
        userLocation : [httpQuery.lat , httpQuery.long]
      }
    }
    return query
  }

  async listEvents(req: Request , httpQuery : HttpQueryDTO ,  user?:User) {
    try {
      const { skip, docLimit , dbQueryParam } = HTTPQueryParser(req.query);

      const query = this.httpQueryFormulator(httpQuery , user) 
      if(dbQueryParam.createdAt){
        query.startDate = dbQueryParam.createdAt
      }
      const queryResult = await this.aggregateEvent(query, skip, docLimit);
      const queryCount = await this.mongoService.events.count(query);
      const extraData: IPagination = ResponseExtraData(
        req,
        queryResult.length,
        queryCount,
      );

      return {
        status: 'success',
        data: queryResult,
        extraData: extraData,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async aggregateEvent(
    query: any,
    skip: number = 0,
    limit: number = 1000,
  ) {
    try {
      let geoQueryStage : PipelineStage[] = [] 
      if(query.distance){
        geoQueryStage = [{
          $geoNear: {
            near: { 
              type: "Point", 
              coordinates:  query.userLocation ? query.userLocation : [] 
            },
            maxDistance: query.distance,
            distanceField: "distance",
            spherical: true
          }
        }]
        delete query.userLocation 
        delete query.distance 
      }

      const result = await this.mongoService.events.aggregateRecords([
        ...geoQueryStage,
        {
          $match: query,
        },
        {
          $lookup: {
            from: 'users',
            let: {
              userId: '$ownerId',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$userId'],
                  },
                },
              },
              {
                $project: {
                  firstName: 1,
                  lastName: 1,
                  email: 1,
                  phoneNumber: 1,
                  companyName  :1 , 
                  country  :1
                },
              },
            ],
            as: 'organizationData',
          },
        },
        {
          $unwind: '$organizationData',
        },
        {
          $lookup: {
            from: 'tickets',
            let: {
              eventId: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$eventId', '$$eventId'],
                  },
                },
              }
            ],
            as: 'tickets',
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

  async findEvent(req: Request , httpQuery : HttpQueryDTO ,  user?:User) {
    try {
      const { skip, docLimit , dbQueryParam } = HTTPQueryParser(req.query);

      const query = this.httpQueryFormulator(httpQuery , user) 
      if(dbQueryParam.createdAt){
        query.startDate = dbQueryParam.createdAt
      }
      const queryResult = await this.aggregateEvent(query, skip, docLimit);
      const queryCount = await this.mongoService.events.count(query);
      const extraData: IPagination = ResponseExtraData(
        req,
        queryResult.length,
        queryCount,
      );

      return {
        status: 'success',
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
          message: 'Event not found',
        });
      }
      return result[0];
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async createTicket(data : CreateTicketDTO , user : User , eventId:string) {
    try {
        const {title} = data 
        const lowerTitle = title.toLocaleLowerCase()
        const event = await this.getOneEvent({_id : new Types.ObjectId(eventId)}) 

        if(user.userType !== "admin" && String(event.ownerId) !== String(user._id)){
            return Promise.reject({
                ...responseHash.forbiddenAction 
            })
        }
        const isReadyTicket = await this.getTicket({
          eventId : new Types.ObjectId(eventId),
          title : lowerTitle
        })
      
        if(isReadyTicket){
          return Promise.reject({
            ...responseHash.badPayload,
            message : "A ticket with the same name for the same event exists"
          })
        }
        data.eventId = event._id 
        data.ownerId = event.ownerId 
        return await this.mongoService.tickets.create(data)
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getTicket(query : _FilterQuery<Ticket>) : Promise<Ticket> {
    try {
        return this.mongoService.tickets.getOneWithAllFields(query)
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async aggregateTickets( 
    query: any,
    skip: number = 0,
    limit: number = 1000,
  ) {
    try {
      const result = await this.mongoService.tickets.aggregateRecords([
        {
          $match: query,
        },
        {
          $lookup: {
            from: 'attendees',
            let: {
              ticketId: '$ticketId',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$ticketId', '$$ticketId'],
                  },
                },
              }
            ],
            as: 'attendees',
          },
        },
        {
          $project : {
            attendees : 1 , 
            ticketId: "$_id",
            eventId: 1,
            ownerId: 1,
            title: 1,
            isAvailable: 1,
            hasDiscount: 1,
            discountValue : {
              $cond : [
                {
                  $gt: ['$discountValue', null],
                },
                '$discountValue',
                '',
              ]
            },
            discountType : {
              $cond : [
                {
                  $gt: ['$discountType', null],
                },
                '$discountType',
                '',
              ]
            },
            quantity: 1,
            availableTickets : {
              $cond : [
                {
                  $gt: ['$available', null],
                },
                '$available',
                '$quantity',
              ]
            },
            soldTickets : {
              $cond : [
                {
                  $gt: ['$discountType', null],
                },
                '$discountType',
                0,
              ]
            },
            orderLimit: 1,
            createdAt: 1,
            updatedAt: 1,
          }
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

  async listTickets(req: Request , eventId : string ,  user?:User) {
    try {
      const { skip, docLimit , dbQueryParam } = HTTPQueryParser(req.query);

      const query = {
        eventId : new Types.ObjectId(eventId)
      }
      const queryResult = await this.aggregateTickets(query, skip, docLimit);
      const queryCount = await this.mongoService.events.count(query);
      const extraData: IPagination = ResponseExtraData(
        req,
        queryResult.length,
        queryCount,
      );

      return {
        status: 'success',
        data: queryResult,
        extraData: extraData,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async buyTicket(eventId: string, body: PurchaseTicketDTO) {
    try {
      const {tickets , charges} = body 
      const query: Record<string, any> = {
        _id: new Types.ObjectId(eventId),
      };
      const event = await this.getOneEvent(query)

      const totalCharges : number  = charges ? charges.reduce((a , b) => a + b.amount , 0) : 0
     
      let totalAmount = 0
      for(const ticket of tickets){
        let t = await this.getTicket({_id : new Types.ObjectId(ticket.ticketId)}) 
        //Confirm that the ticket exists 
        if(!t){
          return Promise.reject({
            ...responseHash.notFound , 
            message  :`Tickets you selected were not found`
          })
        }
        if(t.quantityAvailable === 0){
          return Promise.reject({
            ...responseHash.notFound,
            message : "Sold out"
          })
        }
        if(!t.isAvailable){
          return Promise.reject({
            ...responseHash.badPayload , 
            message  :`${t.title} is already sold out`
          })
        }
        //Confirm that the ticket is still available 
        if(ticket.quantity > t.orderLimit){
          return Promise.reject({
            ...responseHash.badPayload , 
            message  :`You can only purchase ${t.orderLimit} tickets of ${t.title}. ${t.quantityAvailable} tickets still available  `
          })
        }
        
        ticket.amount = ticket.quantity * t.price
        ticket.title = t.title 
        ticket.eventId = t.eventId 
        ticket.ownerId = t.ownerId
        totalAmount += ticket.amount
      }
     
      totalAmount += totalCharges

      const paymentData: ITransactionData = {
        paymentReference: uuid(),
        currency: 'NGN',
        processor: 'paystack',
        narration: `Payment for Match ${event.title} `,
        user: body.email,
        amount: totalAmount * 100,
        paymentMethod: 'web',
        status: 'pending',
        transactionDate: new Date(),
        transactionType: 'debit',
        userIdentifier: body.email,
        productId: new Types.ObjectId(eventId),
        productTitle: 'events',
        originalAmount: totalAmount,
        beneficiaryId: event.ownerId,
        ...body,
      };
      //Make Payment
      const paymentBody = await this.paymentService.makePayment(paymentData);
      //The end goal of this process is to return a payment link
      return {
        hasPaymentLink: true,
        paymentInfo: paymentBody.data,

      };
    } catch (err) {
      if (err instanceof AxiosError) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: 'Unable to make payment now',
        });
      }
      return Promise.reject(err);
    }
  }

  async getSalesReport(eventId: string, req: Request ,  user?:User) {
    try {
    
      const { skip, docLimit , dbQueryParam } = HTTPQueryParser(req.query);
      const query : Record<string,any> = {
        eventId : new Types.ObjectId(eventId)
      }
      if(dbQueryParam.createdAt){
        query.createdAt = dbQueryParam.createdAt
      }
      if(dbQueryParam.createdAt){
        query.createdAt = dbQueryParam.createdAt
      }
      if(req.query.ticketId){
        query.ticketId = new Types.ObjectId(eventId)
      }
      const statsQuery  : Record<string,any> = {}
      if(req.query.ticket && req.query.ticket === "all"){
        statsQuery.eventId = new Types.ObjectId(eventId)
      }
      if(req.query.ticket && req.query.ticket !== "all"){
        const ticketId = req.query.ticket as string
        verifyObjectId(ticketId)
        statsQuery._id = new Types.ObjectId(ticketId)
        query.ticketId = new Types.ObjectId(ticketId)
      }
      if(Object.values(statsQuery).length === 0){
        return Promise.reject({
          ...responseHash.badPayload , 
          message  :"Please,provide queries for the stats"
        })
      }
  
      const queryResult = await this.aggregateEventSales(query, skip, docLimit);
      const statsQueryResult = await this.getTicketSalesSummary(statsQuery)
      const queryCount = await this.mongoService.attendees.count(query);
      const extraData: IPagination = ResponseExtraData(
        req,
        queryResult.length,
        queryCount,
      );

      return {
        status: 'success',
        data: {
          stats : this.prepareEventStats(statsQueryResult),
          sales : queryResult,
        },
        extraData: extraData,
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }
  private prepareEventStats(statsArray : Record<string,any>[]){
    if(statsArray.length === 0){
      return {
        totalSales: 0,
        ticketSold: 0,
        category: 0,
        totalReceived: 0
      }
    }
    return statsArray[0]
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

  async getTicketSalesSummary( query : any) {
    try {
      let groupId = query.eventId || query._id 
      const result = await this.mongoService.tickets.aggregateRecords([
        {
          $match: query,
        },
        {
          $group : {
            _id : groupId,
            totalSales : {
              $sum : "$totalAmountSold"
            },
            ticketSold : {
              $sum : "$quantitySold"
            },
            category : {
              $count : {}
            },
            totalReceived : {
              $sum : "$totalAmountReceived"
            }
          }
        },
        {
          $project : {
            _id : 0,
            totalReceived : "$totalReceived",
            category : "$category",
            ticketSold : "$ticketSold",
            totalSales : "$totalSales"
          }
        }
      ]);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
