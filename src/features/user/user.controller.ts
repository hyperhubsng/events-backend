import { Body, Controller, Get, Param, Put, Req, Res } from "@nestjs/common";
import { UserService } from "./user.service";
import { SuccessResponse } from "@/shared/response/success-response";
import { Response, Request } from "express";
import { UserDecorator } from "./user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";

@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly successResponse: SuccessResponse,
  ) {}
  @Get()
  async getUsers(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
  ) {
    const { data, extraData } = await this.userService.getUsers(req, user);
    this.successResponse.ok(res, req, { data, pagination: extraData });
  }
  @Put(":id")
  async updateProfile(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @UserDecorator() user: User,
  ) {
    const result = await this.userService.updateUser(body, user);
    this.successResponse.ok(res, req, { data: result });
  }

  @Get(":id")
  async getUserHandler(
    @Req() req: Request,
    @Res() res: Response,
    @Param("id") id: string,
  ) {
    const result = await this.userService.getUser({ _id: id });
    this.successResponse.ok(res, req, { data: result });
  }
}
