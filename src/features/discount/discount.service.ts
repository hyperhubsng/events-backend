import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { IPagination } from "@/shared/interface/interface";
import HTTPQueryParser from "@/shared/utils/http-query-parser";
import { ResponseExtraData } from "@/shared/utils/http-response-extra-data";
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { Types } from "mongoose";
import { DiscountDTO } from "./discount.dto";
import { generateCode } from "@/shared/utils/generate-code";
import { responseHash } from "@/constants";
import { UserService } from "../user/user.service";
import { Discount } from "@/datasources/mongodb/schemas/discount.schema";

@Injectable()
export class DiscountService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly userService: UserService
  ) {}

  async listDiscounts(req: Request, httpQuery: any, user?: User) {
    try {
      const { skip, docLimit } = HTTPQueryParser(req.query);

      const query: Record<string, any> = {};
      if (httpQuery.owner) {
        query.ownerId = new Types.ObjectId();
      }
      if (user?.userType === "vendor") {
        query.ownerId = user._id;
      }
      const queryResult = await this.aggregateDiscount(query, skip, docLimit);
      const queryCount = await this.mongoService.discounts.count(query);
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

  async aggregateDiscount(
    query: any,
    skip: number = 0,
    limit: number = 1000
  ): Promise<Discount[]> {
    try {
      const result = await this.mongoService.discounts.aggregateRecords([
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

  async addDiscount(data: DiscountDTO, user: User) {
    try {
      const { targets, ownerId, discountType, value, quantity } = data;
      if (user.userType === "admin" && !ownerId) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "Select an organisation to create a discount for",
        });
      }
      await this.userService.rejectUserTyype(ownerId, "admin");
      //Verify that the targets are valid, still exists, and are owned by the
      const discountParam: Partial<Discount>[] = [];
      const userId = new Types.ObjectId(ownerId);
      const ticketsToUpdate = [];
      for (const target of targets) {
        const { targetId, targetType } = target;
        const collectionName = targetType === "event" ? "events" : "tickets";
        if (collectionName === "tickets") {
          ticketsToUpdate.push(targetId);
        }
        const isTarget = await this.mongoService[
          collectionName
        ].getOneWithFields({ _id: targetId });
        if (!isTarget) {
          return Promise.reject({
            ...responseHash.notFound,
            message: `${collectionName} with id as ${targetId} not found`,
          });
        }
        //Check if the discount value is not greater than the product amount
        if (collectionName === "events" && discountType === "flat") {
          //Get all the tickets and ensure the discount amount is not more than any
          const tickets =
            await this.mongoService.tickets.getAllWithNoPagination({
              eventId: targetId,
            });
          if (tickets.length === 0) {
            return Promise.reject({
              ...responseHash.badPayload,
              message:
                "A discount cannot be applied on this event since it has no tickets",
            });
          }
          const priceList = tickets
            .map((ticket) => ticket.price)
            .sort((a: number, b: number) => a - b);
          const min = priceList[0];
          if (value > min) {
            return Promise.reject({
              ...responseHash.badPayload,
              message: "Discount value cannot be more than the ticket value",
            });
          }
        }

        if (collectionName === "tickets" && discountType === "flat") {
          if (value > isTarget.price) {
            return Promise.reject({
              ...responseHash.badPayload,
              message: "Discount value cannot be more than the ticket value",
            });
          }
        }

        discountParam.push({
          eventId: new Types.ObjectId(isTarget.eventId),
          ticketId: new Types.ObjectId(targetId),
          ...data,
          ownerId: userId,
          targets,
          ...(quantity && {
            quantity,
          }),
          ...(quantity && {
            quantityRemaining: quantity,
          }),
        });
      }
      const discounts = await this.mongoService.discounts.createMany(
        discountParam
      );
      await this.mongoService.tickets.updateMany(
        {
          _id: {
            $in: ticketsToUpdate,
          },
        },
        {
          $set: {
            hasDiscount: true,
          },
        }
      );
      return discounts;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async generateDiscountCode() {
    try {
      const code = generateCode();
      return {
        code: code.slice(0, 9),
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async updateDiscount(id: string, body: DiscountDTO, user: User) {
    try {
      const query: Record<string, any> = {
        _id: new Types.ObjectId(id),
      };

      if (user?.userType === "vendor") {
        query.ownerId = user._id;
      }
      return await this.mongoService.discounts.updateOneOrCreateWithOldData(
        query,
        body
      );
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async deleteDiscount(id: string, user: User) {
    try {
      const query: Record<string, any> = {
        _id: new Types.ObjectId(id),
      };

      if (user?.userType === "vendor") {
        query.ownerId = user._id;
      }
      const discount = await this.getDiscountWithAnyParam(query);
      const hasDiscountBeenUsed =
        await this.mongoService.attendees.getOneWithAllFields({
          discountCode: discount.code,
        });

      if (hasDiscountBeenUsed) {
        await this.mongoService.discounts.updateOneOrCreate(
          {
            _id: discount._id,
          },
          {
            $set: {
              status: false,
              softDelete: true,
            },
          }
        );
        return "Discount Soft Deleted Successfully";
      }
      await this.mongoService.discounts.deleteOne(query);
      return "Discount Deleted Successfully";
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getDiscount(id: string, user: User) {
    try {
      const query: Record<string, any> = {
        _id: new Types.ObjectId(id),
      };

      if (user?.userType === "vendor") {
        query.ownerId = user._id;
      }
      return await this.getDiscountWithAnyParam(query);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getDiscountWithAnyParam(query: any) {
    try {
      const queryResult = await this.aggregateDiscount(query);
      if (queryResult.length === 0) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "Discount not found",
        });
      }
      return queryResult[0];
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
