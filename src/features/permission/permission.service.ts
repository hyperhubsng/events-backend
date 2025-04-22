import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  CreatePermissionDTO,
  CreateRoleDTO,
  PermissionsQueryDTO,
} from "./permission.dto";
import { Model, Types, _FilterQuery } from "mongoose";
import { Permission } from "@/datasources/mongodb/schemas/permission.schema";
import { responseHash } from "@/constants";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import HTTPQueryParser from "@/shared/utils/http-query-parser";
import { Request } from "express";
import { ResponseExtraData } from "@/shared/utils/http-response-extra-data";
import {
  AuthenticatedRequest,
  IPagination,
  numStrObj,
} from "@/shared/interface/interface";
import { Reflector } from "@nestjs/core";
import { Role } from "@/datasources/mongodb/schemas/role.schema";

@Injectable()
export class PermissionService {
  constructor(
    private readonly mongoService: MongoDataServices,
    private readonly reflector: Reflector,
  ) {}

  async createPermission(data: CreatePermissionDTO) {
    try {
      const isExist = await this.getPermission(data);
      if (isExist) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: `${data.title} already exist for ${data.resource}`,
        });
      }
      return await this.mongoService.permissions.create(data);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getPermission(query: _FilterQuery<Permission>): Promise<Role> {
    try {
      return await this.mongoService.permissions.getOneWithAllFields(query);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getRole(
    query: _FilterQuery<Role>,
    throwError: boolean = false,
  ): Promise<Role> {
    try {
      const role = await this.aggregateRoles(query);
      if (role.length === 0 && throwError) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "Role not found",
        });
      }
      return role ? role[0] : null;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async rejectMissingPermission(query: _FilterQuery<Permission>) {
    try {
      const permission = await this.getPermission(query);
      if (!permission) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "Permissions not found",
        });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  httpQueryFormulator(
    httpQuery: PermissionsQueryDTO,
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

  async listPermissions(
    req: Request,
    httpQuery: PermissionsQueryDTO,
    user?: User,
  ) {
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
      const queryResult = await this.aggregatePermissions(
        query,
        skip,
        docLimit,
      );
      const queryCount = await this.mongoService.permissions.count(query);
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

  async aggregatePermissions(
    query: any,
    skip: number = 0,
    limit: number = 1000,
  ) {
    try {
      const result = await this.mongoService.permissions.aggregateRecords([
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

  async aggregateRoles(query: any, skip: number = 0, limit: number = 1000) {
    try {
      const result = await this.mongoService.roles.aggregateRecords([
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

  async createRole(data: CreateRoleDTO, user: User) {
    try {
      const organizationId = data.organisationId || user.currentOrganisation;
      if (!organizationId && !(user.userType.toLowerCase() === "superadmin")) {
        return Promise.reject({
          ...responseHash.forbiddenAction,
          message: "You need to belong to an organisation to do this",
        });
      }
      const isOrganisation = await this.mongoService.users.getOneWithAllFields({
        _id: organizationId,
      });
      if (!isOrganisation) {
        return Promise.reject({
          ...responseHash.notFound,
          message: `Organisation not found`,
        });
      }

      const allPermissions = await this.aggregatePermissions({}, 0, 1000);
      const systemPermssionSet = new Set(
        allPermissions.map((all: Permission) => all.title),
      );
      const invalidPermissions = new Set(data.permissions);
      for (const elem of invalidPermissions) {
        if (!systemPermssionSet.has(elem)) {
          return Promise.reject({
            ...responseHash.badPayload,
            message: `${elem} is not a valid permission`,
          });
        }
      }
      const query: _FilterQuery<Role> = {
        title: data.title,
        organisationId: organizationId,
      };
      if (user.userType.toLowerCase() === "superadmin") {
        query.title = data.title;
      }
      const isRole = await this.mongoService.roles.getOneWithAllFields(query);
      if (isRole) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "You have already created this role",
        });
      }
      if (
        user.userType.toLowerCase() === "superadmin" &&
        !data.organisationId
      ) {
        data.tag = "global";
      }
      data.organisationId = isOrganisation._id;
      return await this.mongoService.roles.create(data);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async listRoles(req: Request, httpQuery: PermissionsQueryDTO, user?: User) {
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
      const queryResult = await this.aggregateRoles(query, skip, docLimit);

      const queryCount = await this.mongoService.roles.count(query);
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

  async verifyPermission(context: ExecutionContext): Promise<boolean> {
    const permissionList = this.reflector.get<string>(
      "permissions",
      context.getHandler(),
    );

    if (!permissionList) {
      // throw new UnauthorizedException(
      //   `Unauthorized: You do not have sufficient permission to perform this action`
      // );
      return true;
    }
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: User = req.user as User;

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const isSuperAdmin = user.userType === "admin";
    if (isSuperAdmin) {
      return true;
    }

    const userPermissions = await this.mongoService.roles.getOneWithFields({
      userId: user._id,
    });

    if (
      !userPermissions ||
      !userPermissions.permissions.some((perm: string) =>
        permissionList.includes(perm),
      )
    ) {
      throw new UnauthorizedException(
        `Unauthorized: User does not have the required permission`,
      );
    }
    return true;
  }
}
