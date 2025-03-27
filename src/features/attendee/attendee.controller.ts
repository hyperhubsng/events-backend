import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { SuccessResponse } from "@/shared/response/success-response";
import { UserDecorator } from "../user/user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { AttendeeService } from "./attendee.service";
import { AttendeeQueryPipe } from "./attendee.pipe";
import { HttpQueryDTO } from "./attendee.dto";
@Controller("attendees")
export class AttendeeController {
  constructor(
    private readonly successResponse: SuccessResponse,
    private readonly attendeeService: AttendeeService,
  ) {}

  @Get("/:attendeeCode")
  async manageGuest(
    @Req() req: Request,
    @Res() res: Response,
    @Param("attendeeCode") attendeeCode: string,
    @Query(new AttendeeQueryPipe()) query: HttpQueryDTO,
    @UserDecorator() user: User,
  ) {
    const data = await this.attendeeService.manageGuest(
      attendeeCode,
      query,
      user,
    );
    return this.successResponse.ok(res, req, { data });
  }
}
