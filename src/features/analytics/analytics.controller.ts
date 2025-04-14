import { SuccessResponse } from "@/shared/response/success-response";
import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { Request, Response } from "express";
import { UserDecorator } from "../user/user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { UserQueryDTO } from "../user/user.dto";
import { UserQueryPipe } from "../user/user.pipe";

@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly successResponse: SuccessResponse,
    private readonly analyticsService: AnalyticsService,
  ) {}
  @Get()
  async getStats(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Query(new UserQueryPipe()) query: UserQueryDTO,
  ) {
    const data = await this.analyticsService.getStatisticsForDashboard(
      query,
      user,
    );
    await this.successResponse.ok(res, req, { data });
  }

  @Get("/payments")
  async getPaymentAnalytics(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Query(new UserQueryPipe()) query: UserQueryDTO,
  ) {
    const data = await this.analyticsService.getPaymentStats(query, user);
    await this.successResponse.ok(res, req, { data });
  }

  @Get("/Events")
  async getEventsAnalytics(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Query(new UserQueryPipe()) query: UserQueryDTO,
  ) {
    const data = await this.analyticsService.getEventsStats(query, user);
    await this.successResponse.ok(res, req, { data });
  }

  @Get("/users")
  async getUsersAnalytics(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Query(new UserQueryPipe()) query: UserQueryDTO,
  ) {
    const data = await this.analyticsService.getUsersStats(query, user);
    await this.successResponse.ok(res, req, { data });
  }
}
