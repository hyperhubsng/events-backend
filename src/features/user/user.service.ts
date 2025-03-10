import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import { Injectable } from "@nestjs/common";
import { AddUserDTO } from "@/features/user/user.dto";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { getTempUserKey, responseHash } from "@/constants";
import { Types, _FilterQuery } from "mongoose";
import { Request } from "express";
import HTTPQueryParser from "@/shared/utils/http-query-parser";
import { IPagination } from "@/shared/interface/interface";
import { ResponseExtraData } from "@/shared/utils/http-response-extra-data";
import { RedisService } from "@/datasources/redis/redis.service";

@Injectable()
export class UserService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly redisService: RedisService,
  ) {}

  async getUser(param: _FilterQuery<User>): Promise<User> {
    try {
      return await this.mongoService.users.getOneWithAllFields(param);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async rejectUserTyype(
    userId: string | Types.ObjectId,
    category: string,
  ): Promise<void> {
    try {
      const user = await this.getUser({ _id: userId });
      if (!user) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "user not found",
        });
      }
      if (user.userType === category) {
        return Promise.reject(responseHash.forbiddenAction);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }
  async checkForExistingUser(queryParam: Record<string, any>[]): Promise<void> {
    const user: any = await this.mongoService.users.getOne(
      { $or: queryParam },
      ["email"],
    );
    if (user) {
      return Promise.reject(responseHash.duplicateExists);
    }
    return;
  }
  async addUser(body: AddUserDTO): Promise<User> {
    return await this.mongoService.users.create(body);
  }

  async updateUser(body: Partial<User>, user: User) {
    return await this.mongoService.users.updateOneOrCreateWithOldData(
      { _id: user._id },
      body,
    );
  }
  async getUserById(_id: Types.ObjectId) {
    const user = await this.mongoService.users.getOneWithAllFields({ _id });
    if (user) {
      delete user.password;
      return user;
    }
    return null;
  }

  async getUsers(req: Request, user: User) {
    try {
      const { skip, docLimit, filters, populate } = HTTPQueryParser(req.query);
      let query: Record<string, any> = {
        _id: {
          $nin: [user._id],
        },
      };
      if (req.query.userType) {
        query = {
          ...query,
          currentUserType: req.query.userType,
        };
      }
      if (req.query.q) {
        query = {
          ...query,
          brandName: new RegExp(`^${req.query.q}$`, "i"),
        };
      }

      const users = await this.mongoService.users.getAll(
        query,
        filters,
        populate,
        docLimit,
        skip,
        "createdAt",
      );

      const userCount = await this.mongoService.users.count(query);
      const extraData: IPagination = ResponseExtraData(
        req,
        users.length,
        userCount,
      );

      return {
        status: "success",
        data: users,
        extraData: extraData,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async isTemporaryUser(email: string): Promise<void> {
    try {
      const tempUserCacheKey = getTempUserKey(email);
      const isTemporaryUser = await this.redisService.get(tempUserCacheKey);
      if (isTemporaryUser) {
        return Promise.reject(responseHash.duplicateExists);
      }
      return;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async checkUserUniqueness(
    fieldsToCheck: Record<string, any>[],
    hasEmail: true,
  ): Promise<void> {
    try {
      //Check to Ensure Email is Unique
      if (hasEmail) {
        const emailField = fieldsToCheck[0];
        await this.isTemporaryUser(emailField.email);
      }
      await this.checkForExistingUser(fieldsToCheck);
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
