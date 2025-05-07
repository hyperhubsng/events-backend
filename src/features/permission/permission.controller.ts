import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
  UpdateRoleDTO,
} from "./permission.dto";
import {
  CreatePermissionPipe,
  CreateRolePipe,
  UpdateRolePipe,
} from "./permission.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { UserDecorator } from "../user/user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { RoleCreatorGuard } from "../auth/role.creator.guard";
import { ObjectIdValidationPipe } from "@/shared/pipes/object-id-pipe";
import { Types } from "mongoose";

@Controller()
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly successResponse: SuccessResponse,
  ) {}
  @UseGuards(AdminGuard)
  @Post("/permissions")
  async createPermission(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new CreatePermissionPipe()) body: CreatePermissionDTO,
  ) {
    const data = await this.permissionService.createPermission(body);
    await this.successResponse.ok(res, req, { data });
  }
  @UseGuards(RoleCreatorGuard)
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
  @UseGuards(RoleCreatorGuard)
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
  @UseGuards(RoleCreatorGuard)
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

  @UseGuards(RoleCreatorGuard)
  @Delete("/roles/:id")
  async deleteRoleHandler(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Param("id", new ObjectIdValidationPipe()) id: string,
  ) {
    const result = await this.permissionService.deleteRole(id, user);
    this.successResponse.ok(res, req, { data: result });
  }

  @UseGuards(RoleCreatorGuard)
  @Put("/roles/:id")
  async updateRole(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Param("id", new ObjectIdValidationPipe()) id: string,
    @Body(new UpdateRolePipe()) body: UpdateRoleDTO,
  ) {
    const result = await this.permissionService.editRole(id, body, user);
    this.successResponse.ok(res, req, { data: result });
  }

  @UseGuards(RoleCreatorGuard)
  @Get("/roles/:id")
  async getRole(
    @Req() req: Request,
    @Res() res: Response,
    @Param("id", new ObjectIdValidationPipe()) id: string,
  ) {
    const result = await this.permissionService.getRole(
      { _id: new Types.ObjectId(id) },
      true,
    );
    this.successResponse.ok(res, req, { data: result });
  }
}
