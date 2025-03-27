import { Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { Request, Response } from "express";
import { SuccessResponse } from "@/shared/response/success-response";
import { PUBLIC } from "../auth/public.decorator";
import { UserDecorator } from "../user/user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";

@Controller("payments")
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly successResponse: SuccessResponse,
  ) {}

  @PUBLIC()
  @Post("/paystack-webhook")
  async paystackWebhookHandler(@Req() req: Request) {
    this.paymentService.runPaystackWebhook(req);
    return {
      status: true,
      message: "acknowledge",
    };
  }

  @PUBLIC()
  @Get("/verify-payment")
  async runPaymentCallback(@Req() req: Request, @Res() res: Response) {
    const data = await this.paymentService.runPaymentCallback(req);
    return this.successResponse.ok(res, req, { data });
  }

  @Get("/requery")
  async requeryPayment(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: { ref: string },
    @UserDecorator() user: User,
  ) {
    const data = await this.paymentService.requeryPayment(query.ref, user);
    return this.successResponse.ok(res, req, { data });
  }
}
