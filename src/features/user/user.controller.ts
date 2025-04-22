import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { SuccessResponse } from "@/shared/response/success-response";
import { Response, Request } from "express";
import { UserDecorator } from "./user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { UserQueryDTO } from "./user.dto";
import { UserQueryPipe } from "./user.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { ObjectIdValidationPipe } from "@/shared/pipes/object-id-pipe";

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
    @Query(new UserQueryPipe()) httpQuery: UserQueryDTO,
  ) {
    const { data, extraData } = await this.userService.getUsers(
      req,
      httpQuery,
      user,
    );
    this.successResponse.ok(res, req, { data, pagination: extraData });
  }
  @Put(":id")
  async updateProfile(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @UserDecorator() user: User,
    @Param("id", new ObjectIdValidationPipe()) id: string,
  ) {
    const result = await this.userService.updateUser(body, id, user);
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

  @UseGuards(AdminGuard)
  @Delete(":id")
  async deleteUserHandler(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Param("id", new ObjectIdValidationPipe()) id: string,
  ) {
    const result = await this.userService.deleteUser(id, user);
    this.successResponse.ok(res, req, { data: result });
  }
}
