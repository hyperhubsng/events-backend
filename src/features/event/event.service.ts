import { MongoDataServices } from '@/datasources/mongodb/mongodb.service';
import { User } from '@/datasources/mongodb/schemas/user.schema';
import { IPagination, numStrObj } from '@/shared/interface/interface';
import HTTPQueryParser from '@/shared/utils/http-query-parser';
import { ResponseExtraData } from '@/shared/utils/http-response-extra-data';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { responseHash } from '@/constants';
import { PipelineStage, Types, _FilterQuery } from 'mongoose';
import { UserService } from '../user/user.service';
import { AddEventDTO, CreateTicketDTO, HttpQueryDTO } from './event.dto';
import { Event } from '@/datasources/mongodb/schemas/event.schema';
import { Ticket } from '@/datasources/mongodb/schemas/ticket.schema';

@Injectable()
export class EventService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly userService: UserService,
  ) {}
  async addEvent(data : AddEventDTO , user : User) {
    try {
        const {ownerId , coordinates} = data 
        if(user.userType === "admin" && !ownerId){
            return Promise.reject({
                ...responseHash.badPayload , 
                message : "Select an organisation to create for"
            })
        }
        await this.userService.rejectUserTyype(ownerId , "admin")
        data.createdBy = user._id 
        data.ownerId = new Types.ObjectId(ownerId)
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
      console.log(query)
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

  async getTicket(query : _FilterQuery<Ticket>) {
    try {
        return this.mongoService.tickets.getOneWithAllFields(query)
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async listTickets() {
    try {
        const extraData : any = []
        return {
          data  :[] , 
          extraData 
        }
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
