import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { PermissionService } from "./permission.service";
import { SuccessResponse } from "@/shared/response/success-response";
import { Request, Response } from "express";
import {
  CreatePermissionDTO,
  CreateRoleDTO,
  PermissionsQueryDTO,
} from "./permission.dto";
import { CreatePermissionPipe, CreateRolePipe } from "./permission.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { UserDecorator } from "../user/user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";

@UseGuards(AdminGuard)
@Controller()
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly successResponse: SuccessResponse,
  ) {}

  @Post("/permissions")
  async createPermission(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new CreatePermissionPipe()) body: CreatePermissionDTO,
  ) {
    const data = await this.permissionService.createPermission(body);
    await this.successResponse.ok(res, req, { data });
  }

  @Get("/permissions")
  async listPermissions(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: PermissionsQueryDTO,
    @UserDecorator() user: User,
  ) {
    const { data, extraData } = await this.permissionService.listPermissions(
      req,
      query,
      user,
    );
    await this.successResponse.ok(res, req, { data, pagination: extraData });
  }

  @Post("/roles")
  async createRole(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new CreateRolePipe()) body: CreateRoleDTO,
    @UserDecorator() user: User,
  ) {
    const data = await this.permissionService.createRole(body, user);
    await this.successResponse.ok(res, req, { data });
  }

  @Get("/roles")
  async listRoles(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: PermissionsQueryDTO,
    @UserDecorator() user: User,
  ) {
    const { data, extraData } = await this.permissionService.listRoles(
      req,
      query,
      user,
    );
    await this.successResponse.ok(res, req, { data, pagination: extraData });
  }
}
