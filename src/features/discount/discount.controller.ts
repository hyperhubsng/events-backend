import { SuccessResponse } from "@/shared/response/success-response";
import { DiscountService } from "./discount.service";
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
} from "@nestjs/common";
import { UserDecorator } from "../user/user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { Request, Response } from "express";
import { CreateDiscountPipe, UpdateDiscountPipe } from "./discount.pipe";
import { DiscountDTO } from "./discount.dto";
import { ObjectIdValidationPipe } from "@/shared/pipes/object-id-pipe";

@Controller("discounts")
export class DiscountController {
  constructor(
    private readonly discountService: DiscountService,
    private readonly successResponse: SuccessResponse,
  ) {}

  @Get()
  async getDiscounts(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Query() query: any,
  ) {
    const { data, extraData } = await this.discountService.listDiscounts(
      req,
      query,
      user,
    );
    await this.successResponse.ok(res, req, { data, pagination: extraData });
  }

  @Post()
  async createDiscount(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new CreateDiscountPipe()) body: DiscountDTO,
    @UserDecorator() user: User,
  ) {
    const data = await this.discountService.addDiscount(body, user);
    await this.successResponse.ok(res, req, { data });
  }

  @Get("/code")
  async generateCode(@Req() req: Request, @Res() res: Response) {
    const data = await this.discountService.generateDiscountCode();
    await this.successResponse.ok(res, req, { data });
  }

  @Delete("/:id")
  async deleteDiscount(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Param("id", new ObjectIdValidationPipe()) discountId: string,
  ) {
    const data = await this.discountService.deleteDiscount(discountId, user);
    await this.successResponse.ok(res, req, { data });
  }

  @Put("/:id")
  async updateDiscount(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Param("id", new ObjectIdValidationPipe()) discountId: string,
    @Body(new UpdateDiscountPipe()) body: DiscountDTO,
  ) {
    const data = await this.discountService.updateDiscount(
      discountId,
      body,
      user,
    );
    await this.successResponse.ok(res, req, { data });
  }

  @Get("/:id")
  async getDiscount(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Param("id", new ObjectIdValidationPipe()) discountId: string,
  ) {
    const data = await this.discountService.getDiscount(discountId, user);
    await this.successResponse.ok(res, req, { data });
  }
}
