import { MongoDataServices } from '@/datasources/mongodb/mongodb.service';
import { Injectable } from '@nestjs/common';
import {
  IPagination,
  ITransactionData,
  JwtUnion,
} from '@/shared/interface/interface';
import { User } from '@/datasources/mongodb/schemas/user.schema';
import { responseHash } from '@/constants';
import HTTPQueryParser from '@/shared/utils/http-query-parser';
import { Request } from 'express';
import { ResponseExtraData } from '@/shared/utils/http-response-extra-data';
import { Types } from 'mongoose';
import { AddMatchDTO } from './match.dto';
import { Ticket } from '@/datasources/mongodb/schemas/ticket.schema';
import { PaymentService } from '../payment/payment.service';
import { AxiosError } from 'axios';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MatchService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly paymentService: PaymentService,
  ) {}
  async createNewMatch(body: AddMatchDTO, user: JwtUnion) {
    try {
      //Check to ensure to match exists for that same day
      body.communityId = new Types.ObjectId(user.communtityManaged);
      //Add the match
      return await this.mongoService.tickets.create(body);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async listMatches(req: Request) {
    try {
      const { skip, docLimit } = HTTPQueryParser(req.query);
      const query: Record<string, any> = {
        communityId: new Types.ObjectId(String(req.query.communityId).trim()),
      };

      const matches = await this.aggregateMatches(query, skip, docLimit);
      const matchesCount = await this.mongoService.tickets.count(query);
      const extraData: IPagination = ResponseExtraData(
        req,
        matches.length,
        matchesCount,
      );

      return {
        status: 'success',
        data: matches,
        extraData: extraData,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async aggregateMatches(
    query: any,
    skip: number = 0,
    limit: number = 1000,
  ): Promise<Ticket[]> {
    try {
      const result = await this.mongoService.tickets.aggregateRecords([
        {
          $match: query,
        },
        {
          $lookup: {
            from: 'communities',
            let: {
              communityId: '$communityId',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$communityId'],
                  },
                },
              },
              {
                $project: {
                  name: 1,
                  category: {
                    $cond: [
                      {
                        $gt: ['$category', null],
                      },
                      '$category',
                      'football',
                    ],
                  },
                },
              },
            ],
            as: 'communityData',
          },
        },
        {
          $unwind: '$communityData',
        },
        {
          $addFields: {
            bookedSlots: 10,
            ratings: '4.2',
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

  async getOneMatch(query: Record<string, any>): Promise<Ticket> {
    try {
      console.log(query);
      const match = await this.aggregateMatches(query);
      if (match.length === 0) {
        return Promise.reject({
          ...responseHash.notFound,
          message: 'Match not found',
        });
      }
      return match[0];
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async payForMatch(matchId: string, body: any) {
    try {
      const query: Record<string, any> = {
        _id: new Types.ObjectId(matchId),
      };
      const match = await this.aggregateMatches(query);
      if (match.length === 0) {
        return Promise.reject({
          ...responseHash.notFound,
          message: 'Match not found',
        });
      }
      const matchData = match[0];

      const paymentData: ITransactionData = {
        paymentReference: uuid(),
        currency: 'NGN',
        processor: 'paystack',
        narration: `Payment for Match ${matchId} `,
        user: body.email,
        amount: matchData.amount * 100,
        paymentMethod: 'web',
        status: 'pending',
        transactionDate: new Date(),
        transactionType: 'debit',
        userPaymentIdentifier: body.email,
        productId: matchData._id,
        productTitle: 'match',
        originalAmount: -matchData.amount,
        beneficiaryId: matchData.ownerId,
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
      console.log(err);
      if (err instanceof AxiosError) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: 'Unable to make payment now',
        });
      }
      return Promise.reject(err);
    }
  }
}
