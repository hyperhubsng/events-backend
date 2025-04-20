import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { dateParser } from "@/shared/utils/date-parser";
import HTTPQueryParser from "@/shared/utils/http-query-parser";
import { Injectable } from "@nestjs/common";
import { UserQueryDTO } from "../user/user.dto";

@Injectable()
export class AnalyticsService {
  constructor(private readonly mongoService: MongoDataServices) {}

  async getStatisticsForDashboard(query: UserQueryDTO, user: User) {
    try {
      if (
        ["admin", "superadmin", "adminUser"].includes(
          user.userType.toLowerCase()
        )
      ) {
        return this.getStatsForAdmin(query, user);
      }
      return this.getStatsForUser(query, user);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getStatsForAdmin(query: UserQueryDTO, user: User) {
    try {
      //Get the Platform Stats
      const platformStats = await this.mongoService.users.getOneWithAllFields({
        userType: "superadmin",
      });

      const defaultPlatformStats = {
        totalEvents: 0,
        totalOrganisations: 0,
        totalRevenue: 0,
        totalCommissions: 0,
      };
      const appStats = platformStats.totalCommissions
        ? platformStats
        : defaultPlatformStats;

      const totalEvents = appStats.totalEvents;
      const totalOrganisations = appStats.totalOrganisations;
      const totalRevenue = appStats.totalRevenue;
      const totalCommissions = appStats.totalCommissions;

      const [events, payments, organisations] = await Promise.all([
        this.getEventsStats(query, user),
        this.getPaymentStats(query, user),
        this.getUsersStats(query, user),
      ]);
      return {
        platform: {
          totalEvents,
          totalUsers: totalOrganisations,
          totalRevenue,
          totalCommissions,
        },
        events,
        payments,
        users: organisations,
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getStatsForUser(query: UserQueryDTO, user: User) {
    try {
      //Get the Platform Stats
      const platformStats = await this.mongoService.users.getOneWithAllFields({
        _id: user._id,
      });

      const defaultPlatformStats = {
        totalEvents: 0,
        totalUsers: 0,
        totalRevenue: 0,
        totalCommissions: 0,
      };
      const appStats = platformStats.totalCommissions
        ? platformStats
        : defaultPlatformStats;

      const totalEvents = appStats.totalEvents;
      const totalUsers = appStats.totalUsers;
      const totalRevenue = appStats.totalRevenue;
      const totalCommissions = appStats.totalCommissions;

      const [events, payments, users] = await Promise.all([
        this.getEventsStats(query, user),
        this.getPaymentStats(query, user),
        this.getUsersStats(query, user),
      ]);
      return {
        platform: {
          totalEvents,
          totalUsers,
          totalRevenue,
          totalCommissions,
        },
        events,
        payments,
        users,
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }
  private async aggregateRecords(
    aggregationQuery: any,
    skip: number,
    limit: number,
    collectionName: keyof MongoDataServices
  ) {
    return await this.mongoService[collectionName].aggregateRecords([
      {
        $match: aggregationQuery,
      },
      {
        $sort: {
          startDate: 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);
  }

  async getEventsStats(query: UserQueryDTO, user: User) {
    try {
      const { dbQueryParam } = HTTPQueryParser(query);
      const presentation = query.presentation;
      //Store Recent Computation in memory or cache for retrieval after some time
      const aggregationQuery: Record<string, any> = {};
      if (query.from) {
        aggregationQuery.startDate = dbQueryParam.createdAt;
      }
      if (
        !["admin", "superadmin", "adminUser"].includes(
          user.userType.toLowerCase()
        )
      ) {
        aggregationQuery.ownerId = user._id;
      }

      const limit = 1000;
      let skip = 0;
      let hasMoreData = true;
      const statsData: Record<string, any>[] = [];
      let statsHash: Record<string, any> = {};
      let monthNames: string[] = [];
      if (presentation === "monthly") {
        statsHash = {
          january: 0,
          february: 0,
          march: 0,
          april: 0,
          may: 0,
          june: 0,
          july: 0,
          august: 0,
          september: 0,
          october: 0,
          november: 0,
          december: 0,
        };

        monthNames = Object.keys(statsHash);
      }

      while (hasMoreData) {
        const events = await this.aggregateRecords(
          aggregationQuery,
          skip,
          limit,
          "events"
        );
        for (const event of events) {
          const eventDate = new Date(event.startDate);
          const parsedDate = dateParser(eventDate);
          if (presentation === "weekly") {
            if (statsHash.hasOwnProperty(`${eventDate}`)) {
              statsHash[`${parsedDate}`] += 1;
            } else {
              statsHash[`${parsedDate}`] = 1;
            }
          }
          if (presentation === "monthly") {
            const monthNumber = eventDate.getMonth();
            const month = monthNames[monthNumber];
            statsHash[`${month}`] += 1;
          }
        }

        skip += limit;
        //Check if there is more data to fetch to keep the loop running
        const hasMoreDataList = await this.aggregateRecords(
          aggregationQuery,
          skip,
          1,
          "events"
        );
        if (hasMoreDataList.length === 0) {
          hasMoreData = false;
        }
      }

      for (const [key, value] of Object.entries(statsHash)) {
        statsData.push({
          [key]: value,
        });
      }
      return statsData;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getPaymentStats(query: UserQueryDTO, user: User) {
    try {
      const { dbQueryParam } = HTTPQueryParser(query);
      const presentation = query.presentation;
      //Store Recent Computation in memory or cache for retrieval after some time
      const aggregationQuery: Record<string, any> = {};
      if (query.from) {
        aggregationQuery.startDate = dbQueryParam.createdAt;
      }
      if (
        !["admin", "superadmin", "adminUser"].includes(
          user.userType.toLowerCase()
        )
      ) {
        aggregationQuery.beneficiaryId = user._id;
      }
      const limit = 1000;
      let skip = 0;
      let hasMoreData = true;
      const statsData: Record<string, any>[] = [];
      let statsHash: Record<string, any> = {};
      let monthNames: string[] = [];
      if (presentation === "monthly") {
        statsHash = {
          january: 0,
          february: 0,
          march: 0,
          april: 0,
          may: 0,
          june: 0,
          july: 0,
          august: 0,
          september: 0,
          october: 0,
          november: 0,
          december: 0,
        };

        monthNames = Object.keys(statsHash);
      }

      while (hasMoreData) {
        const events = await this.aggregateRecords(
          aggregationQuery,
          skip,
          limit,
          "payments"
        );
        for (const event of events) {
          const eventDate = new Date(event.paymentDate);
          const parsedDate = dateParser(eventDate);
          if (presentation === "weekly") {
            if (statsHash.hasOwnProperty(`${eventDate}`)) {
              statsHash[`${parsedDate}`] += event.amount;
            } else {
              statsHash[`${parsedDate}`] = event.amount;
            }
          }
          if (presentation === "monthly") {
            const monthNumber = eventDate.getMonth();
            const month = monthNames[monthNumber];
            statsHash[`${month}`] += event.amount;
          }
        }

        skip += limit;
        //Check if there is more data to fetch to keep the loop running
        const hasMoreDataList = await this.aggregateRecords(
          aggregationQuery,
          skip,
          1,
          "payments"
        );
        if (hasMoreDataList.length === 0) {
          hasMoreData = false;
        }
      }

      for (const [key, value] of Object.entries(statsHash)) {
        statsData.push({
          [key]: value,
        });
      }
      return statsData;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getUsersStats(query: UserQueryDTO, user: User) {
    try {
      const { dbQueryParam } = HTTPQueryParser(query);
      //Store Recent Computation in memory or cache for retrieval after some time
      const aggregationQuery: Record<string, any> = {
        userType: "vendor",
      };
      if (query.from) {
        aggregationQuery.startDate = dbQueryParam.createdAt;
      }
      if (
        !["admin", "superadmin", "adminUser"].includes(
          user.userType.toLowerCase()
        )
      ) {
        aggregationQuery.currentOrganisation = user._id;
        aggregationQuery.userType = "vendorUser";
      }
      const limit = 1000;
      let skip = 0;
      let hasMoreData = true;

      const statsHash: Record<string, any> = {
        active: 0,
        inactive: 0,
      };

      while (hasMoreData) {
        const events = await this.aggregateRecords(
          aggregationQuery,
          skip,
          limit,
          "users"
        );
        for (const event of events) {
          const status = event.accountStatus === "active" ? true : false;
          if (status) {
            statsHash["active"] += 1;
          } else {
            statsHash["inactive"] += 1;
          }
        }

        skip += limit;
        //Check if there is more data to fetch to keep the loop running
        const hasMoreDataList = await this.aggregateRecords(
          aggregationQuery,
          skip,
          1,
          "users"
        );
        if (hasMoreDataList.length === 0) {
          hasMoreData = false;
        }
      }
      return statsHash;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
